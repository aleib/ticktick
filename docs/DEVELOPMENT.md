## Development

### Prereqs

- Node.js 20+
- `pnpm` via Corepack

### Install

- `pnpm -w install`

### Run (local)

- API: `pnpm -C packages/api dev` (default `PORT=8787`)
- Web: `pnpm -C packages/web dev` (default `5173`)

### Run with Postgres (Docker)

- `docker compose -f packages/infra/docker-compose.yml up`

### Commands

- Typecheck: `pnpm -r typecheck`
- Tests: `pnpm -r test`
