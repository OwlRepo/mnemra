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
