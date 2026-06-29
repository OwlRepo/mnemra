# Repository Map

Purpose:

Dense file ledger.

This file is map only.

It is not proof of behavior.

Verify all conclusions against real source code.

If this map conflicts with source code, source code wins.

Mark stale or conflicting entries as `CONTEXT DRIFT`.

---

## File Index

TODO: Fill after repository analysis. Do not treat as verified. (Auth rows below are verified; everything else still TODO.)

| Path | Purpose | Domain | Risk | Notes |
| ---- | ------- | ------ | ---- | ----- |
| `apps/api/src/auth/auth.service.ts` | Core auth logic: register/verifyOtp/login/refresh/logout, email normalization, bcrypt hashing, JWT + refresh token issuance | Auth | Deep | Tested in `auth.service.spec.ts` |
| `apps/api/src/auth/auth.controller.ts` | HTTP routes for `/auth/*`, sets/clears the `mnemra_rt` httpOnly cookie | Auth | Deep | Tested in `test/auth.e2e-spec.ts` |
| `apps/api/src/auth/decorators/current-user.decorator.ts` | Param decorator that reads `req.user` as `{userId, email}` for authenticated handlers | Auth / Workspaces | Express | Used by `workspaces.controller.ts` |
| `apps/api/src/auth/guards/workspace-member.guard.ts` | Per-request check: is this user a member of the workspace in the route param; attaches `{workspaceId, role}` to the request | Auth / Workspaces | Deep | Tested in `workspace-member.guard.spec.ts` |
| `apps/api/src/auth/guards/roles.guard.ts` | RBAC guard that enforces `@Roles(...)` against `req.workspaceMember.role` after membership lookup | Auth / Workspaces | Deep | Tested in `roles.guard.spec.ts`; must run after `WorkspaceMemberGuard` |
| `apps/api/src/auth/decorators/roles.decorator.ts` | Metadata decorator for workspace RBAC (`owner`, `admin`, `member`) | Auth / Workspaces | Express | Consumed by `RolesGuard` |
| `apps/api/src/auth/decorators/current-workspace-member.decorator.ts` | Param decorator that reads `req.workspaceMember` for controller handlers | Auth / Workspaces | Express | No tests needed — trivial passthrough |
| `apps/api/src/workspaces/workspaces.controller.ts` | HTTP routes for create/list/get/invite/accept/remove workspace flows | Workspaces | Deep | Guard order matters: `JwtAuthGuard`, `WorkspaceMemberGuard`, then `RolesGuard` where applicable |
| `apps/api/src/workspaces/workspaces.service.ts` | Workspace creation, member listing, invite issuance/acceptance, and last-owner enforcement | Workspaces | Deep | Tested in `workspaces.service.spec.ts` |
| `apps/api/src/workspaces/workspaces.module.ts` | Wires workspaces controller/service plus auth/notification guard dependencies | Workspaces | Standard | Imported by `app.module.ts` |
| `apps/api/src/workspaces/dto/create-workspace.dto.ts` | Validation DTO for `POST /workspaces` | Workspaces | Express | `name` length 1..255 |
| `apps/api/src/workspaces/dto/invite-member.dto.ts` | Validation DTO for `POST /workspaces/:workspaceId/invite` | Workspaces | Express | Validates invitee email |
| `apps/api/src/knowledge-bases/knowledge-bases.controller.ts` | Nested workspace routes for create/list/delete knowledge bases | Knowledge Bases | Standard | Reuses `JwtAuthGuard`, `WorkspaceMemberGuard`, `RolesGuard` |
| `apps/api/src/knowledge-bases/knowledge-bases.service.ts` | KB create/list/delete logic, including non-empty delete guard via `documents` count | Knowledge Bases | Standard | Tested in `knowledge-bases.service.spec.ts` |
| `apps/api/src/knowledge-bases/knowledge-bases.module.ts` | Wires KB controller/service and auth guard dependencies | Knowledge Bases | Standard | Imported by `app.module.ts` |
| `apps/api/src/knowledge-bases/dto/create-knowledge-base.dto.ts` | Validation DTO for `POST /workspaces/:workspaceId/knowledge-bases` | Knowledge Bases | Express | `name` length 1..255 |
| `apps/api/src/storage/storage.service.ts` | S3-compatible object storage adapter: ensure bucket, save object bytes, download to temp file, delete by key | Storage | Deep | Tested in `storage.service.spec.ts`; SeaweedFS-backed locally |
| `apps/api/src/storage/storage.module.ts` | Exports `StorageService` and boots bucket creation on API startup | Storage | Standard | Imported by `app.module.ts` in Slice 3A |
| `apps/api/src/notifications/notifications.service.ts` | Sends OTP and invite email via Resend, or console-logs in dev when `EMAIL_OTP_ENABLED!=='true'` | Auth / Workspaces | Standard | Covered by `auth.service.spec.ts`, `workspaces.service.spec.ts`, `test/workspaces.e2e-spec.ts` |
| `docker/seaweedfs/s3.json` | Local SeaweedFS S3 identity file with dev-only credentials matching `.env.example` | Storage Infra | Deep | Never reuse for production secrets |
| `packages/db/src/db/index.ts` | Drizzle client + exported `pg.Pool` (`pool` exported specifically so tests can close the connection cleanly) | DB infra | Standard | — |
