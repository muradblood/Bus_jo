# Admin refactor stage 2A

This branch contains the modular admin dashboard refactor for Vercel preview validation.

- Production `main` is unchanged.
- The `/admin` route keeps the same route and visual shell.
- Dashboard, bookings, cities, prices, visitors, and banks are separated into admin tab modules.
- Settings, design, and Telegram controls remain behavior-compatible in `AdminExtras.tsx`.
- No VPS deployment is part of this branch.
