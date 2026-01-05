## TickTick — Agent Instructions

This repo is intentionally built to be **offline-first** and **Cloudflare-ready** (future migration), with a **single-user v1** scope.

## Non-negotiable product invariants

- **Offline-first**: Web app writes to IndexedDB first; server sync is eventual.
- **Single active timer**: never allow more than one running timer at a time.
- **No silent running across reload**: on lifecycle events, persist and pause; user explicitly resumes.
- **Canonical types** live in `packages/shared` (types + Zod schemas).

## Coding conventions

- TypeScript everywhere.
- Prefer `type` over `interface`.
- Use modern JS/TS (`async/await`, `?.`, `??`).
- In JSX: `cond ? <X/> : null` (avoid `cond && <X/>`).
- Keep it KISS; small explicit modules over indirection.
- Comments should explain intent/invariants (add JSDoc only for logic-heavy code).

## What to update when changing the model

If you change any domain entity (Task/Session/Settings/Mutation), also update:

- `packages/shared/src/model.ts`
- `packages/shared/src/schemas.ts`
- any API handlers using those schemas
- IndexedDB schema usage (`packages/web/src/db/db.ts`)

## Documentation hygiene (required for agents)
When you change code, update the matching docs in the same PR/commit:
- If you change `packages/shared/src/model.ts` or `packages/shared/src/schemas.ts`, update `docs/SPEC.md` (domain model + rules).
- If you change API routes or contracts (`packages/api/src/**`, `packages/api/openapi.yaml`), update `docs/API.md` (and keep OpenAPI accurate).
- If you change sync/timer/idle invariants, update `docs/ARCHITECTURE.md`.
- If you change developer workflows (scripts, Docker, ports, env vars), update `docs/DEVELOPMENT.md`.
