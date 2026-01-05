## API (v1)

### Principles

- JSON over HTTP (REST-ish).
- Client generates UUIDs for offline creation.
- Prefer upserts and soft deletes to keep sync robust.
- Validate inputs using Zod schemas from `packages/shared`.

### OpenAPI

See `packages/api/openapi.yaml`.

### Core endpoints (scaffold)

- `GET /api/health`
- `GET /api/tasks`
- `PUT /api/tasks/:id` (upsert)
- `DELETE /api/tasks/:id` (soft delete)
- `GET /api/sessions?from=ISO&to=ISO`
- `PUT /api/sessions/:id` (upsert)
- `DELETE /api/sessions/:id` (soft delete)
- `GET /api/settings`
- `PUT /api/settings`
- `POST /api/sync/push`
- `POST /api/sync/pull`
- `GET /api/reports/daily?date=YYYY-MM-DD&tz=IANA`
- `GET /api/reports/weekly?weekStart=YYYY-MM-DD&tz=IANA`
