# API Contracts

Purpose:

Map important frontend-backend contracts.

This file is map only.

It is not proof of behavior.

Verify all conclusions against real source code, tests, types, schemas, routes, controllers, services, stores, components, API contracts, database definitions.

If this map conflicts with source code, source code wins.

Mark stale or conflicting entries as `CONTRACT DRIFT`.

Mark missing contracts as `UNMAPPED CONTRACT`.

If frontend expectation and backend response differ, mark `CONTRACT MISMATCH`.

Do not invent request or response shapes.

Unknown fields must be marked `TODO: Fill after repository analysis. Do not treat as verified.`

---

## Contract Index

| Domain | Feature | Method | Endpoint / Route | Frontend Caller | Backend Handler | Request Shape | Response Shape | Auth / Permission | Risk | Notes |
| ------ | ------- | ------ | ---------------- | --------------- | --------------- | ------------- | -------------- | ----------------- | ---- | ----- |
| Auth | Register | POST | `/auth/register` | `apps/web/app/api/auth/register/route.ts` (proxy) → `register/page.tsx` | `auth.controller.ts#register` → `auth.service.ts#register` | `{email, password}` | `{message}` or `429` | None (public) | Deep | Email normalized to lowercase before any DB write/read. OTP sent via `NotificationsService` (console log in dev, Resend in prod). Throttled: 5 req / 10 min per caller (`@Throttle`), global default 60/min applies otherwise. Verified via `auth.service.spec.ts`, `test/auth.e2e-spec.ts`, `test/auth-rate-limit.e2e-spec.ts`. |
| Auth | Verify OTP | POST | `/auth/verify-otp` | `.../api/auth/verify-otp/route.ts` → `verify-otp/page.tsx` | `auth.controller.ts#verifyOtp` → `auth.service.ts#verifyOtp` | `{email, code}` | `{accessToken}` + `Set-Cookie: mnemra_rt` (httpOnly), or `429` | None (public) | Deep | Marks `users.isVerified=true`. Code must be unused (`usedAt IS NULL`) and unexpired. Throttled: 5 req / 10 min per caller. Verified live + e2e. |
| Auth | Login | POST | `/auth/login` | `.../api/auth/login/route.ts` → `login/page.tsx` | `auth.controller.ts#login` → `auth.service.ts#login` | `{email, password}` | `{accessToken}` + `Set-Cookie: mnemra_rt`, or `429` | None (public) | Deep | Blocks unverified accounts with 403. Throttled: 10 req / 10 min per caller. Verified live: 10×401 then 429 with `Retry-After: 600`. |
| Auth | Refresh | POST | `/auth/refresh` | `.../api/auth/refresh/route.ts` (must forward `Set-Cookie`, not optional) | `auth.controller.ts#refresh` → `auth.service.ts#refresh` | Cookie `mnemra_rt` | `{accessToken}` + new `Set-Cookie: mnemra_rt` (rotated), or `429`/`401` | Valid, non-revoked refresh cookie | Deep | Rotates on every use: old token revoked, brand-new token issued. Reusing an already-rotated (revoked) token is treated as theft — revokes ALL active refresh tokens for that user, forcing full re-login everywhere. Throttled: 20 req / 10 min per caller. Verified via `auth.service.spec.ts` (unit + theft-cascade case) and `test/auth.e2e-spec.ts` (real HTTP + cookie rotation). |
| Auth | Logout | POST | `/auth/logout` | `.../api/auth/logout/route.ts` | `auth.controller.ts#logout` → `auth.service.ts#logout` | Cookie `mnemra_rt` | `{message}` | Valid refresh cookie (no-op if missing/invalid) | Deep | Revokes the token row (`revokedAt`). No-op, does not throw, if token already revoked or unknown. Verified live. Not throttled — logging out should never be blocked. |
| Workspaces | Create Workspace | POST | `/workspaces` | TBD — Slice 4 UI/Next proxy not built yet | `workspaces.controller.ts#create` → `workspaces.service.ts#create` | `{name}` | `{id, name, ownerId, createdAt}` | Logged-in user (`JwtAuthGuard`) | Deep | Creates workspace plus owner membership in one DB transaction. Verified via `workspaces.service.spec.ts`, `test/workspaces.e2e-spec.ts`. |
| Workspaces | List My Workspaces | GET | `/workspaces/me` | TBD — Slice 4 UI/Next proxy not built yet | `workspaces.controller.ts#listMine` → `workspaces.service.ts#listForUser` | none | `[{id, name, ownerId, createdAt, role}]` | Logged-in user (`JwtAuthGuard`) | Deep | Includes caller's role from `workspace_members`. After OTP verification, list returns one auto-created personal workspace. |
| Workspaces | Accept Invite | POST | `/workspaces/accept-invite/:token` | TBD — Slice 4 UI/Next proxy not built yet | `workspaces.controller.ts#accept` → `workspaces.service.ts#acceptInvite` | path `token` | `{id, name, ownerId, createdAt}` | Logged-in user (`JwtAuthGuard`) | Deep | Token is single-use and expires after 7 days. Logged-in email must match invite email. Marks `acceptedAt` and adds `member` row inside one transaction. |
| Workspaces | Get One | GET | `/workspaces/:workspaceId` | TBD — Slice 4 UI/Next proxy not built yet | `workspaces.controller.ts#getOne` → `workspaces.service.ts#getOne` | path `workspaceId` | `{id, name, ownerId, createdAt}` | Member only (`JwtAuthGuard` + `WorkspaceMemberGuard`) | Deep | Non-members get 403 from guard before service lookup. Verified in `test/workspaces.e2e-spec.ts`. |
| Workspaces | Invite Member | POST | `/workspaces/:workspaceId/invite` | TBD — Slice 4 UI/Next proxy not built yet | `workspaces.controller.ts#invite` → `workspaces.service.ts#invite` | `{email}` | `{message}` | Owner/admin only (`JwtAuthGuard` + `WorkspaceMemberGuard` + `RolesGuard`) | Deep | Generates 64-char hex token, stores invite row, sends email via `NotificationsService` or dev console `[DEV INVITE]`. Token never returned in API body. |
| Workspaces | Remove Member | DELETE | `/workspaces/:workspaceId/members/:userId` | TBD — Slice 4 UI/Next proxy not built yet | `workspaces.controller.ts#remove` → `workspaces.service.ts#removeMember` | path `workspaceId`, `userId` | `{message}` | Owner only (`JwtAuthGuard` + `WorkspaceMemberGuard` + `RolesGuard`) | Deep | Blocks removing last owner with 403. Returns 404 when target membership row does not exist. |
| Knowledge Bases | Create Knowledge Base | POST | `/workspaces/:workspaceId/knowledge-bases` | TBD — Slice 4 UI/Next proxy not built yet | `knowledge-bases.controller.ts#create` → `knowledge-bases.service.ts#create` | `{name}` | `{id, workspaceId, name, createdAt}` | Owner/admin only (`JwtAuthGuard` + `WorkspaceMemberGuard` + `RolesGuard`) | Standard | Scoped by route workspace. Verified in `knowledge-bases.service.spec.ts`, `test/knowledge-bases.e2e-spec.ts`. |
| Knowledge Bases | List Knowledge Bases | GET | `/workspaces/:workspaceId/knowledge-bases` | TBD — Slice 4 UI/Next proxy not built yet | `knowledge-bases.controller.ts#list` → `knowledge-bases.service.ts#listForWorkspace` | none | `[{id, workspaceId, name, createdAt}]` | Member only (`JwtAuthGuard` + `WorkspaceMemberGuard`) | Standard | Workspace membership enforced before list. Non-members get 403. |
| Knowledge Bases | Delete Knowledge Base | DELETE | `/workspaces/:workspaceId/knowledge-bases/:kbId` | TBD — Slice 4 UI/Next proxy not built yet | `knowledge-bases.controller.ts#remove` → `knowledge-bases.service.ts#remove` | path `workspaceId`, `kbId` | `{message}` or `409`/`404` | Owner/admin only (`JwtAuthGuard` + `WorkspaceMemberGuard` + `RolesGuard`) | Standard | Returns 409 when `documents` still reference KB. Cross-workspace `kbId` returns 404 to avoid leaking existence. |
