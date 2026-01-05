---
description: "Shared package rules (types + Zod + time semantics)."
globs:
  - "packages/shared/**"
alwaysApply: false
---

## `packages/shared` is canonical

- Domain `type`s + Zod schemas here are the **source of truth** for both web and API.
- Avoid adding runtime dependencies unless truly shared.

## Zod schema typing

- Be careful when using schemas that accept `undefined` (e.g. `z.unknown()`); it can make object keys optional in input typing.
- Prefer schemas that match our contract intent: required keys should be required at runtime.

## Time semantics

- Timestamps represent **UTC instants** (`toISOString()`).
- Weekly reporting assumes **Monday start** for MVP (expand later if needed).
