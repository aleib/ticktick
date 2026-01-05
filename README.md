# TickTick

Single-user, offline-first **weekly time & habit tracker** (Mon→Sun) with a **single concurrent timer** (normal or Pomodoro), manual adjustments, and daily/weekly dashboards.

## Monorepo layout

- `packages/shared`: canonical domain types + Zod schemas + pure utilities
- `packages/api`: Fastify API (Postgres in v1; Cloudflare-ready boundaries)
- `packages/web`: React + Vite SPA (IndexedDB source of truth; mutation outbox sync)
- `packages/mobile`: stub for v2
- `packages/infra`: docker-compose and ops scaffolding

## Docs

- Spec: `docs/SPEC.md`
- Architecture: `docs/ARCHITECTURE.md`
- API: `docs/API.md` (OpenAPI: `packages/api/openapi.yaml`)
- Development: `docs/DEVELOPMENT.md`
- Docs policy: `docs/DOCS_POLICY.md`

## Architecture notes (MVP)

- **Offline-first**: UI writes to IndexedDB immediately, plus an outbox mutation record.
- **Sync**: push mutations then pull remote changes; v1 conflict policy is last-write-wins by `updatedAt`.
- **Timer**: one running session at a time; running state is persisted every ~5s and on lifecycle events.

## MVP screens (target)

- **Tasks**: create/edit/delete, targets, recurrence
- **Timer**: single concurrent timer; normal + Pomodoro modes
- **ManualEntry**: add/adjust time after the fact
- **DailyDashboard**: daily totals + target progress
- **WeeklyDashboard**: Mon→Sun totals; stacked per-task breakdown
- **Settings**: Pomodoro durations, idle threshold, notification prefs

## Core user flows (MVP)

- **Create task**: user enters title → app writes `tasks` row in IndexedDB → enqueue outbox mutation → UI updates immediately.
- **Start timer**: user selects task + mode → enforce single active timer → persist `runningTimer` every ~5s and on lifecycle events.
- **Idle auto-pause**: if user is inactive for `idlePauseSeconds` → app splits session at last activity → timer becomes paused and requires explicit resume.
- **Crash/tab close recovery**: on `pagehide`/hidden visibility → timer is persisted and paused; on reopen user can resume explicitly.
- **Manual entry**: user creates manual session (date + minutes) → persisted locally → totals update → outbox mutation enqueued.
- **Offline sync**: when online, client pushes pending outbox mutations then pulls server changes since last watermark.

## Dev quickstart

- **Install deps**: `pnpm -w install`
- **Run API**: `pnpm -C packages/api dev` (defaults to `PORT=8787`)
- **Run Web**: `pnpm -C packages/web dev` (defaults to `5173`)

## MVP acceptance checklist

- Task CRUD works (create + soft-delete in UI; edit/recurrence next).
- Single active timer start/stop creates a session and persists running state.
- Idle detection auto-splits the session and leaves the timer paused for explicit resume.
- Manual entry creates a session and updates daily totals.
- Offline-first: tasks/sessions persist locally even with API down; outbox sync pushes/pulls when online.
- Pomodoro (basic): timer can run in Pomodoro mode and notifies when interval ends.

## Tests (scaffold)

- `pnpm -r test` runs Node tests via `tsx` loader (unit + API route smoke test).
- **Unit**: shared time utilities + web timer engine (pure logic).
- **Integration**: API routes via Fastify `inject()`; sync/report endpoints next.
- **E2E (planned)**: Playwright flows (task CRUD, start/stop timer, offline mutation + resync).
