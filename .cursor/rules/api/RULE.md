---
description: "API rules (Fastify + Postgres/Drizzle + portable design for Cloudflare)."
globs:
  - "packages/api/**"
alwaysApply: false
---

## Architecture (api)

- Keep handlers thin; move orchestration into services if logic grows.
- Data access must go through repository interfaces (`src/repos/*`) so we can swap Postgres for D1 later.
- Avoid Postgres-only features unless there is a strong reason (keep schema portable).

## Contracts

- Validate requests with Zod schemas from `@ticktick/shared`.
- Prefer **idempotent** writes where practical (client-generated UUIDs, upserts, soft deletes).

## Offline-first sync

- Treat `tasks` and `sessions` as **upsertable by client id**.
- Prefer **soft delete** (`deletedAt`) to avoid sync edge cases.
