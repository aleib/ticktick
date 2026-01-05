---
description: "Web app rules (React + IndexedDB + sync + timer invariants)."
globs:
  - "packages/web/**"
alwaysApply: false
---

## Architecture (web)

- IndexedDB (`Dexie`) is the **source of truth**.
- All user writes must:
  - update IndexedDB (`db.*`) first
  - enqueue an outbox mutation (`db.outbox`) for eventual sync
- Prefer small modules with explicit boundaries:
  - `src/db/`: Dexie schema + tables
  - `src/sync/`: outbox + push/pull sync + merge policy
  - `src/timer/`: single-timer engine + persistence wrapper
  - `src/idle/`: idle detection behavior

## Timer rules (web)

- Enforce **single active timer**. Starting a new timer must not leave multiple running sessions.
- Persist running timer state on:
  - interval (~5s)
  - lifecycle (`pagehide`, hidden visibility)
- Idle detection must **exclude idle time** (split session at last activity and leave timer paused).

## UI conventions

- Keep UI state minimal; persist real state in IndexedDB.
- Avoid adding state management libraries until there’s a clear need.
