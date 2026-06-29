# Architecture Manifest

Purpose:

Dense project map.

This file is map only.

It is not proof of behavior.

Verify all conclusions against real source code, tests, types, schemas, routes, controllers, services, stores, components, API contracts, database definitions.

If this map conflicts with source code, source code wins.

Mark stale or conflicting entries as `CONTEXT DRIFT`.

---

## Project Shape

TODO: Fill after repository analysis. Do not treat as verified.

## Frontend

### Framework

TODO: Fill after repository analysis. Do not treat as verified.

### Key Areas

TODO: Fill after repository analysis. Do not treat as verified.

### Routing

TODO: Fill after repository analysis. Do not treat as verified.

### State Management

TODO: Fill after repository analysis. Do not treat as verified.

### API Client

TODO: Fill after repository analysis. Do not treat as verified.

## Backend

### Framework

TODO: Fill after repository analysis. Do not treat as verified.

### Key Modules

TODO: Fill after repository analysis. Do not treat as verified.

### API Routes

TODO: Fill after repository analysis. Do not treat as verified.

### Services

TODO: Fill after repository analysis. Do not treat as verified.

### Middleware

TODO: Fill after repository analysis. Do not treat as verified.

## Database / Schema

### ORM / Query Builder

TODO: Fill after repository analysis. Do not treat as verified.

### Key Models

TODO: Fill after repository analysis. Do not treat as verified.

### Migrations

TODO: Fill after repository analysis. Do not treat as verified.

## API Contracts

### FE-BE Communication

TODO: Fill after repository analysis. Do not treat as verified.

### Request/Response Patterns

TODO: Fill after repository analysis. Do not treat as verified.

## Auth / Permissions

### Auth Strategy

TODO: Fill after repository analysis. Do not treat as verified.

### Permission Model

TODO: Fill after repository analysis. Do not treat as verified.

## Jobs / Automations

### Job Queue

TODO: Fill after repository analysis. Do not treat as verified.

### Background Jobs

TODO: Fill after repository analysis. Do not treat as verified.

## Storage

### Object Storage

SeaweedFS is the current object storage backend for local development and production planning.

- Local S3 endpoint: `http://localhost:8333`
- Local filer UI: `http://localhost:8888`
- Local master UI: `http://localhost:9333`
- Bucket name: `mnemra-documents`

SeaweedFS uses S3-compatible auth from env (`S3_*`) plus an identities JSON file mounted into the container.

### Storage Service

`apps/api/src/storage/storage.service.ts` owns object-storage access:
- `ensureBucket()` on module init
- `save(key, body, contentType?)`
- `getToTempFile(key)` for downstream loader/ingest steps
- `delete(key)`

Slice 3A adds only infra + storage abstraction + schema groundwork. Upload and ingest behavior arrive in Slice 3B.

## Verification Commands

### Type Check

TODO: Fill after repository analysis. Do not treat as verified.

### Lint

TODO: Fill after repository analysis. Do not treat as verified.

### Test

TODO: Fill after repository analysis. Do not treat as verified.

### Build

TODO: Fill after repository analysis. Do not treat as verified.
