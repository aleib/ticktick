## Development

### Prereqs

- Node.js 20+
- `pnpm` via Corepack

### Install

- `pnpm -w install`

### Run (local)

- API (Workers + D1): `pnpm -C packages/api dev:worker`
- Web: `pnpm -C packages/web dev` (default `5173`)

### D1 migrations (local/prod)

- Local: `pnpm -C packages/api d1:migrate:local`
- Prod: `pnpm -C packages/api d1:migrate:prod`

### Commands

- Typecheck: `pnpm -r typecheck`
- Tests: `pnpm -r test`
