## TickTick — Product Spec (MVP)

Single-user web app for **weekly time & habit tracking** (Monday→Sunday) with a **single concurrent timer** (normal or Pomodoro), **manual adjustments**, and **offline-first** persistence + sync.

### In scope (MVP)

- Task CRUD (title, optional category, optional recurrence, optional targets).
- Targets: daily minutes and/or weekly minutes.
- Timer: **one active timer** at a time, per task.
  - normal timer
  - Pomodoro (no automatic chaining in MVP)
- Idle detection: auto-split at last activity and leave timer paused for explicit resume.
- Crash/tab-close recovery: persist running state and pause on lifecycle events.
- Manual entries: create time sessions after the fact.
- Reports: daily totals + weekly totals (Mon→Sun), chart-ready aggregates.
- Offline-first: app works fully offline; sync when online.

### Out of scope (MVP)

- Multi-user auth and accounts (design should not block adding it later).
- Cross-device realtime sync.
- Calendar integration, mobile app implementation (planned for v2), sharing/export.

### Core domain entities

- **Task**: an item you track (targets and optional recurrence).
- **Session**: a time interval tied to a task (timer-derived or manual).
- **Settings**: pomodoro defaults, idle threshold, notification preference, week start.
- **Mutation**: outbox record for offline-first sync.
- **RunningTimerState**: persisted singleton timer state (for crash recovery).

Canonical definitions:

- `packages/shared/src/model.ts`
- `packages/shared/src/schemas.ts`
