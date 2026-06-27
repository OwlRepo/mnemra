# Mnemra — Implementation Roadmap

> Your support team's institutional memory, on demand.
> AI-powered second brain for customer support teams. Ingests past tickets, product docs, runbooks, internal wikis — makes all of it instantly queryable for agents.

---

## What's already built

### packages/ai — Complete
- Loaders: 11 file types (txt, md, pdf, docx, csv, json, html, xlsx, pptx, eml, msg, yaml)
- Chunking: token-aware (tiktoken cl100k_base), recursive + markdown strategies, SHA-256 content hashing, section-aware slot ready
- Embeddings: OpenAI batch embed + query embed, configurable model via env
- Vectorstore: pgvector syncChunks (hash-based diff), similaritySearch with tenantId filter
- Chains: streaming RAG via async generator, grounded system prompt
- Tracing: LangSmith auto-trace via env vars

### packages/db — Partial
- `tenants` table (id, name, createdAt)
- `documents` table (id, tenantId, title, sourceUrl, contentHash, updatedAt, createdAt)
- `chunks` table (id, documentId, tenantId, content, contentHash, embedding vector(1536), metadata jsonb, sectionId, sectionTitle, createdAt)

### apps/api — Skeleton only
- NestJS + Bull queue (Redis) wired
- DocumentsModule, IngestModule, ChatModule — all routes exist, all services are stubs/TODOs

### apps/web — Shell only
- Landing page (complete, polished)
- Dashboard page (hardcoded, not wired)
- Chat page (uses Vercel AI SDK but calls OpenAI directly, bypasses RAG pipeline)
- No auth pages, no workspace pages, no document pages

### packages/ui — 15 components
Button, Input, Card, Badge, Avatar, Separator, Skeleton, ChatBubble, Toast, StatusBanner, AppHeader, PageShell, PageSection, StatCard, EmptyState

---

## What's missing — by priority

---

### Priority 1 — Nothing works without these

**DB schema (packages/db/src/schema/):**
- `users` — id, email, passwordHash, isVerified, createdAt
- `otps` — id, userId (FK), code, expiresAt, usedAt
- `refresh_tokens` — id, userId (FK), token, expiresAt, revokedAt
- `workspaces` — id, name, ownerId (FK users), createdAt (NOTE: current `tenants` table maps to this concept — align or rename)
- `workspace_members` — id, workspaceId (FK), userId (FK), role (owner|admin|member), joinedAt
- `invitations` — id, workspaceId (FK), email, token, expiresAt, acceptedAt
- `knowledge_bases` — id, workspaceId (FK), name, createdAt
- Add `status` column to `documents` — enum: pending | processing | done | failed
- Add `knowledgeBaseId` FK to `documents`

**Auth (apps/api/src/auth/):**
- `POST /auth/register` — create user, hash password (bcrypt), send OTP via Resend
- `POST /auth/verify-otp` — verify code, set isVerified=true, return JWT
- `POST /auth/login` — validate credentials, return access token + refresh token
- `POST /auth/refresh` — swap refresh token for new access token
- `POST /auth/logout` — revoke refresh token
- JWT strategy + guard — attach user + workspaceId to every request
- NestJS AuthModule with Passport

**Auth (apps/web/app/):**
- `/register` page
- `/login` page
- `/verify-otp` page
- Auth middleware — redirect unauthenticated users

---

### Priority 2 — Core product flow

**Workspaces (apps/api/src/workspaces/):**
- `POST /workspaces` — create workspace, auto-add creator as owner member
- `GET /workspaces/me` — list workspaces for current user
- `GET /workspaces/:id` — get single workspace
- `POST /workspaces/:id/invite` — create invitation, send email via Resend
- `POST /workspaces/accept-invite/:token` — validate token, add user as member
- `DELETE /workspaces/:id/members/:userId` — remove member

**Knowledge Bases (apps/api/src/knowledge-bases/):**
- `POST /knowledge-bases` — create KB inside workspace
- `GET /knowledge-bases` — list KBs for workspace
- `DELETE /knowledge-bases/:id`

**Documents + Ingestion (wire the pipeline):**
- `POST /documents/upload` — multipart file upload, save to disk/storage, create document row with status=pending, queue ingest job
- Wire `IngestProcessor`:
  1. Load document from storage → `loadDocument(filePath)`
  2. Chunk → `chunkDocument(doc)`
  3. Embed → `embedChunks(chunks)`
  4. Inject tenant metadata → add tenantId, knowledgeBaseId, documentId to each chunk
  5. Sync → `syncChunks(embeddedChunks, documentId, tenantId)`
  6. Update document status → done or failed
- `GET /documents` — list documents for KB, include status
- `DELETE /documents/:id` — delete document + its chunks

**Web pages:**
- Workspace creation flow
- Member invite + accept flow
- Knowledge base management page
- Document upload page with drag-and-drop + ingestion status

---

### Priority 3 — Make the product work end to end

**Chat (wire RAG):**
- Fix `ChatService` — call `askQuestion(question, tenantId)`, stream response via SSE
- Fix `apps/web/app/api/chat/route.ts` — call backend `/chat`, not OpenAI directly
- Source attribution — return which documents each answer came from
- `chat_sessions` + `chat_messages` tables for history persistence

**Tenant isolation:**
- JWT middleware injects `tenantId` into every request from token
- All DB queries automatically scoped by `tenantId`
- RLS policies on `chunks` and `documents` tables

---

### Priority 4 — Quality, polish, growth

- UI components: textarea, select, checkbox, modal, dropdown, tabs, table, breadcrumbs, sidebar nav
- Ingestion monitoring UI — see job status, retry failed jobs
- Conversation history UI
- Workspace settings page
- User profile/settings page
- Section-aware chunking (steel beams already in place, just needs implementation per file type)
- Ticket ingestion flow — support ticket format → KB
- Analytics — answer quality, KB coverage, usage per workspace

---

## AI Quality Roadmap — RAG → Evaluation → Agentic

This is the progression after the product shell is working. Do not start any of these until Priority 1-3 above are shipped and real users are using the product.

---

### Stage 1 — Wire RAG to API + FE (Priority 2-3 above)

Before measuring quality, make the product work end to end:
- `IngestProcessor` fully wired to `packages/ai` pipeline
- `ChatService` calling `askQuestion()` with streaming
- Web chat page calling backend, not OpenAI directly
- Source attribution showing which documents answers came from

**You are here after Priority 3 is done.**

---

### Stage 2 — Add RAGAS evaluation

**What RAGAS is:**
RAGAS is an evaluation framework that scores your RAG pipeline on 4 metrics using an LLM judge:

| Metric | What it measures | Red flag if low |
|---|---|---|
| `faithfulness` | Answer only uses info from retrieved chunks | Hallucinating outside context |
| `answer_relevancy` | Answer actually addresses the question | Retrieving wrong chunks |
| `context_precision` | Retrieved chunks are relevant to the question | Too many noise chunks retrieved |
| `context_recall` | All necessary chunks were retrieved | Chunk size too large, missing splits |

**How to implement:**
1. Install `ragas` Python package (RAGAS is Python-native — run as a separate evaluation script, not in the Node.js app)
2. Build an evaluation dataset — 20-50 question/answer/context triples from real Mnemra usage
3. Pull traces from LangSmith (LangSmith stores inputs/outputs/retrieved chunks per run)
4. Run RAGAS against those traces
5. Score baseline, identify which metric is lowest

**Clues for implementation:**
- LangSmith has a RAGAS integration — can pull run data directly via SDK
- Evaluation dataset can be bootstrapped: take 20 real questions agents asked, manually write ideal answers, note which docs they came from
- Run evaluation on a schedule (weekly) not per-request — too expensive to evaluate every query
- Store scores in a simple table or LangSmith dataset for tracking over time

**New env vars needed:**
```bash
# RAGAS uses OpenAI as judge by default
# Already have OPENAI_API_KEY so nothing new needed
# Optionally point to a different judge model:
RAGAS_JUDGE_MODEL=gpt-4-turbo
```

**Files to create:**
- `scripts/evaluate.py` — RAGAS evaluation script
- `scripts/eval-dataset.json` — question/answer/context evaluation set

---

### Stage 3 — Identify failure patterns from real usage

After 2-4 weeks of real usage + RAGAS scores, look for patterns:

**Common RAG failure patterns and what causes them:**

| Symptom | Likely cause | Fix |
|---|---|---|
| Low faithfulness | System prompt not strict enough | Tighten grounding instruction |
| Low context_precision | Chunk size too large, retrieval too broad | Reduce chunkSize, reduce limit in similaritySearch |
| Low context_recall | Chunk size too small, missing relevant sections | Increase chunkSize or overlap |
| Good scores but agents say answers are wrong | Evaluation dataset not representative | Rebuild eval dataset from real failure cases |
| Answers good for simple questions, bad for complex | Single-step retrieval insufficient | → Stage 4: LangGraph |

**How to surface patterns:**
- LangSmith dashboard — filter by low-score runs, read the traces
- Add user feedback to chat UI — thumbs up/down per answer, store in DB
- Weekly RAGAS report — track score trends over time

**New DB table when you get here:**
```sql
chat_feedback (
  id, chat_message_id, rating (positive|negative), comment, createdAt
)
```

---

### Stage 4 — LangGraph for agentic multi-step reasoning

**What LangGraph is:**
LangGraph lets you build stateful AI workflows as a graph — nodes are steps, edges are decisions. The AI can loop, branch, and retry instead of just going straight line.

**Current straight-line RAG:**
```
query → retrieve → answer
```

**LangGraph enables:**
```
query
  → retrieve chunks
  → grade: are chunks relevant?
      NO → rewrite query → retrieve again (loop up to 3x)
      YES → generate answer
  → grade: is answer grounded in chunks?
      NO → regenerate with stricter prompt
      YES → return answer + sources
```

**Specific use cases for Mnemra where LangGraph helps:**

1. **Query rewriting** — agent asked a vague question like "refund thing", initial retrieval finds weak chunks, LangGraph rewrites to "refund policy steps" and retries
2. **Multi-hop retrieval** — "compare our SLA to our refund timeline" needs two separate retrievals then synthesis
3. **Fallback routing** — if KB has no relevant chunks (score below threshold), route to a different knowledge source or reply "I don't know" with confidence
4. **Self-grading** — after generating answer, LLM grades its own faithfulness before returning to user

**Only add LangGraph when RAGAS shows:**
- `faithfulness` consistently below 0.7 (hallucinating)
- `context_recall` consistently below 0.6 (missing relevant chunks)
- Agents reporting multi-part questions getting partial answers

**How to implement when ready:**
1. Install `@langchain/langgraph` (Node.js package)
2. Replace `askQuestion()` async generator in `packages/ai/src/chains/index.ts` with a LangGraph `StateGraph`
3. Nodes: `retrieve`, `gradeChunks`, `rewriteQuery`, `generateAnswer`, `gradeAnswer`
4. Edges: conditional — grade output decides next node
5. Keep same external interface — `askQuestion()` still returns `AsyncGenerator<string>` — LangGraph is an internal implementation detail

**New env vars when implementing:**
```bash
# LangGraph uses LangSmith automatically — already have those
# No new vars needed
```

**Files to touch:**
- `packages/ai/src/chains/index.ts` — replace async generator internals with LangGraph StateGraph
- `packages/ai/src/chains/graph.ts` — new file, define nodes and edges
- `packages/ai/src/chains/nodes/` — separate file per node for clarity

---

### Summary: the order matters

```
1. Ship working product (P1-P3)
   → Real users, real questions, real failures

2. Add RAGAS + LangSmith evaluation
   → Baseline scores, identify weakest metric

3. Fix the weakest metric first
   → Chunk size? Prompt? Retrieval limit? Fix the simple thing first.

4. Only add LangGraph if failure pattern requires it
   → Multi-step questions, low recall after simpler fixes exhausted
```

Don't skip steps. Adding LangGraph to a RAG that isn't wired to real users yet
is solving a problem you haven't measured. RAGAS before LangGraph, always.

---

## Architecture decisions already made

| Decision | Choice | Reason |
|---|---|---|
| Vector storage | pgvector (single table + RLS) | Scales to thousands of tenants, no table-per-tenant complexity |
| Chunk dedup | SHA-256 per chunk, diff on re-ingest | Only re-embeds changed chunks, not full re-ingestion |
| Token counting | tiktoken cl100k_base | Matches OpenAI embedding model exactly |
| Chunk size | 512 tokens, 50 overlap | Fits embedding model limits with context preservation |
| Embedding model | text-embedding-3-small (configurable) | Cost-efficient, 1536 dimensions |
| Chat model | gpt-4-turbo (configurable) | Deterministic (temp=0), grounded system prompt |
| Streaming | AsyncGenerator yield | Tokens flow to FE as OpenAI sends them |
| Queue | Bull + Redis | Background ingestion, retry on failure |
| Auth | JWT access + refresh token | Stateless API, revokable sessions |
| OTP email | Resend | Simple API, good deliverability |

---

## Env vars needed

```bash
# DB
DATABASE_URL=postgresql://...

# Redis (for Bull queue)
REDIS_HOST=localhost
REDIS_PORT=6379

# OpenAI
OPENAI_API_KEY=
OPENAI_EMBEDDING_MODEL=text-embedding-3-small   # optional
OPENAI_CHAT_MODEL=gpt-4-turbo                   # optional

# LangSmith tracing
LANGSMITH_TRACING=true
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
LANGSMITH_API_KEY=
LANGSMITH_PROJECT=second-brain

# Auth
JWT_SECRET=
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Email
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@mnemra.com
```

---

## Prompt to resume with Claude Code

Paste this at the start of a new session:

```
You are a senior engineer and mentor helping me build Mnemra — an AI-powered support knowledge base SaaS (RAG-based). Mnemra is your support team's institutional memory on demand. It ingests past tickets, product docs, runbooks, and internal wikis, then makes all of that knowledge instantly queryable for support agents.

This is both a real product and a portfolio/learning project. Help me implement correctly AND understand what I'm building.

## Communication style
- Before implementing anything, create a clear step-by-step plan and wait for my approval
- Implement one step at a time — never jump ahead
- After each step, explain what you just built and why the decisions were made
- If there are multiple valid approaches, briefly explain the tradeoff and recommend one
- Pause after each step and ask if I have questions before moving on
- Always use caveman skill (/caveman) — terse, no fluff, full technical substance
- Simple english words and on point. If needed tech terms put analogy for easier understanding

## Architecture context
Turborepo monorepo with Bun workspaces:
- apps/api — NestJS backend (port 3001), Bull queue with Redis
- apps/web — Next.js 14 frontend
- packages/ai — complete AI pipeline (loaders → chunking → embeddings → vectorstore → chains)
- packages/db — Drizzle ORM + pgvector schema
- packages/ui — 15 shared UI components

## What's already built
- packages/ai: fully implemented (loaders, chunking with SHA-256 dedup + section-aware steel beams, embeddings, vectorstore with hash-based sync, streaming RAG chain, LangSmith tracing)
- packages/db: tenants, documents, chunks tables (pgvector)
- apps/api: NestJS skeleton, Bull queue wired, all services are stubs
- apps/web: landing page, dashboard shell, chat shell (calls OpenAI directly, NOT wired to RAG)
- packages/ui: 15 polished components

## Key decisions already made
- Single pgvector table + RLS for multi-tenancy (not separate tables per tenant)
- SHA-256 chunk-level dedup — only re-embeds changed chunks on re-ingestion
- tiktoken cl100k_base for real token counting
- Streaming via AsyncGenerator
- JWT access token (15m) + refresh token (7d)
- OTP verification via Resend on registration
- Bull + Redis for background ingestion jobs

## What to build next (Priority 1)
Read docs/ROADMAP.md for the full prioritized list. Start with Priority 1:
1. DB schema additions — users, otps, refresh_tokens, workspaces, workspace_members, invitations, knowledge_bases. Add status + knowledgeBaseId to documents.
2. Auth module in NestJS — register, verify-otp, login, refresh, logout, JWT guard
3. Auth pages in Next.js — /register, /login, /verify-otp

Before writing any code, read the existing files first, create a plan, and wait for approval.
```
