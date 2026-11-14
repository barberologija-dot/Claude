# Termini

Appointment booking for barbershops. Each shop gets a public booking link (`/shop-slug`) and its own admin area (`/admin`).

**To put it online, follow [SETUP.md](SETUP.md).**

## How it is built

| Part | Technology | Where |
|---|---|---|
| Screens | React + Vite + TypeScript, static files | `src/` |
| Texts | One JSON file per language | `src/i18n/sl.json` |
| Database, logins, images | Supabase (Postgres) | `supabase/migrations/` |
| Emails | Cloudflare Pages Function + Brevo | `functions/api/notify.ts` |
| Hosting | Cloudflare Pages | builds `dist/` |

Two rules are enforced by the database itself:
- **No double booking:** the `no_double_booking` constraint on `appointments`.
- **Shop separation:** row level security on every table. A shop admin can only read and change rows of their own shop; a customer only their own appointments.

Customers can only book, move and cancel through database functions (`book_appointment`, `reschedule_my_appointment`, `cancel_my_appointment`), which check email verification, rate limits, booking rules and free slots.

## Stage 1 contents

Shop registration, locations (hours, breaks, days off), barbers (own hours, services), services, customer sign-up with email verification, booking flow, "My appointments", admin calendar (day and week), confirmation email, account deletion, placeholder legal pages.

Not yet built: walk-in day mode, reminders, push notifications, PWA install (Stage 2); last-minute list, analytics, platform owner panel (Stage 3).

## Adding a language

Copy `src/i18n/sl.json` to `hr.json` or `de.json`, translate it, and add it to `dictionaries` in `src/lib/i18n.ts` and `functions/api/notify.ts`.

## Local testing (for developers)

Needs Node 22 and a local Postgres 16. `dev/` contains a small stand-in for the Supabase API that runs the real migrations with row level security.

```bash
npm install
./dev/reset-db.sh                 # create the test database from the migrations
node dev/server.mjs               # test backend on :54321, prints the keys for .env.local
npm run test:db                   # 49 checks: separation, double booking, limits
node dev/seed.mjs                 # optional demo shop at /demo
npm run dev                       # app on :5173
node dev/check-i18n.mjs           # every text key exists in sl.json
```

The stand-in supports only what `src/lib/api.ts` uses (simple filters, no embedded selects), so keep new queries in that style or test them against a real Supabase project.
