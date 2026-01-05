---
description: "Global rules for TickTick (coding style + core product invariants)."
alwaysApply: true
---

## Coding style (global)

- Use **TypeScript** everywhere.
- Prefer `type` over `interface`.
- Use modern JS/TS: `async/await`, optional chaining (`?.`), nullish coalescing (`??`).
- In JSX, prefer `cond ? <X/> : null` over `cond && <X/>`.
- Keep it **KISS**. Small, readable functions beat abstraction.
- Comments should explain **intent** and tricky invariants. Add JSDoc only for logic-heavy parts.

## Product invariants (do not break)

- **Offline-first**: the web app writes to IndexedDB first; server sync is eventual.
- **Single active timer**: at most one running timer at a time across the app.
- **No silent running across reload**: lifecycle events must persist and pause running state; user explicitly resumes.
- **Canonical types live in `packages/shared`**: domain types and Zod schemas are the source of truth for API + web.

## Data contracts & validation

- Any API boundary must validate input with Zod schemas from `@ticktick/shared`.
- If changing the domain model, update:
  - shared `type`s
  - shared Zod schemas
  - API handlers
  - IndexedDB table usage / migrations

## Documentation guardrail (agents must comply)
- Domain model/schema changes → `docs/SPEC.md`
- API surface changes → `docs/API.md` (and keep `packages/api/openapi.yaml` accurate)
- Sync/timer/idle logic changes → `docs/ARCHITECTURE.md`
- Dev workflow changes (ports, scripts, docker) → `docs/DEVELOPMENT.md`
