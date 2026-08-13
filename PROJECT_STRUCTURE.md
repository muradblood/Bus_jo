# Project structure

This repository is organized by feature while keeping compatibility entry points at the previous paths.

## Frontend

- `src/features/booking/` — booking flow components, route/city data, and booking storage.
- `src/features/admin/` — admin pages, admin layout components, and admin authentication helpers.
- `src/features/payments/` — bank and payment-provider data.
- `src/features/telegram/` — browser-side Telegram notification settings and status helpers.
- `src/features/visitors/` — visitor tracking and geographic access rules.
- `src/components/layout/` — shared page layout, header, and footer.
- `src/components/feedback/` — loading and consent feedback components.
- `src/components/ui/` — reusable UI primitives.
- `src/pages/` — public route pages and compatibility entry points for admin routes.
- `src/sections/` — home/public page sections.
- `src/providers/` — application providers such as tRPC.
- `src/hooks/` — general hooks and compatibility entry points.

## Backend

- `server/src/database/` — database access and SQLite/JSON storage implementations.
- `server/src/notifications/` — server-side notification delivery.
- `server/src/routers/` — tRPC routers grouped by domain.
- Runtime entry files such as `app.ts`, `index.ts`, `context.ts`, `trpc.ts`, `socket.ts`, and `sessionStore.ts` remain at `server/src/` to avoid changing runtime wiring in this organization-only phase.

## Compatibility files

Small re-export files remain at previous import paths. Existing imports therefore continue to resolve without changing application behavior. New development should prefer the feature-oriented paths above.

## Deployment and public assets

`deploy/`, `api/`, and public asset URLs are intentionally unchanged. Moving public assets could change runtime URLs and is outside this organization-only phase.
