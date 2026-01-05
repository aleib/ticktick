## Architecture overview

TickTick is a single-user, offline-first app with clean package boundaries for future Cloudflare migration.

### Monorepo

- `packages/shared`: canonical types + Zod schemas + pure utilities (time/week helpers)
- `packages/web`: React SPA, IndexedDB source of truth, outbox sync, timer/idle logic
- `packages/api`: Fastify API, Postgres in v1 via Drizzle, repository interfaces for portability
- `packages/infra`: docker-compose + SQL init schema
- `packages/mobile`: stub for v2

### Key invariants

- IndexedDB is the source of truth (web).
- Single active timer (web).
- No silent running across reload: lifecycle persists and pauses.
- Shared package is canonical for contracts.

### Offline-first sync (push then pull)

- Web writes entities to IndexedDB and enqueues outbox mutations.
- Sync:
  - **push** pending mutations in order
  - **pull** canonical entities since a `serverTs` watermark
  - merge with **LWW** by `updatedAt` (v1)

### Timer architecture

- Pure state transitions: `packages/web/src/timer/timerEngine.ts`
- Persistence wrapper: `packages/web/src/timer/timerStore.ts`
- Idle detection: `packages/web/src/idle/idleWatcher.ts`
