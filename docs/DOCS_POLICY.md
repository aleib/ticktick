## Docs policy (keeping docs up to date)

These docs are treated as a **product + architecture contract** for both humans and LLM agents.

### Source of truth hierarchy
- **Truth**: running code + `packages/shared` domain model/schemas.
- **Contract docs**: `docs/SPEC.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DEVELOPMENT.md`.

### Required “doc touch” rules (when code changes)
- If you change `packages/shared/src/model.ts` or `packages/shared/src/schemas.ts`:
  - update `docs/SPEC.md` to match the new domain model/semantics.
- If you change `packages/api/src/**` routes/contracts or `packages/api/openapi.yaml`:
  - update `docs/API.md` (and keep OpenAPI accurate).
- If you change sync/timer/idle behavior (`packages/web/src/sync/**`, `packages/web/src/timer/**`, `packages/web/src/idle/**`):
  - update `docs/ARCHITECTURE.md`.
- If you change dev workflows (scripts, ports, env vars, docker):
  - update `docs/DEVELOPMENT.md`.

### Practical tips for agents
- Prefer small incremental doc updates alongside code changes.
- When changing behavior, update docs *first* (or in the same patch) to reduce drift.
- Keep docs concise: intent, invariants, and contracts—avoid duplicating code.


