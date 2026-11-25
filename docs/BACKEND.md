# Backend integration checkpoint, 24 November 2026

Tazbeeta / تظبيطه · Hexa plus · Eng Angluos Rezq

## Verified locally

- Node API with Supabase-compatible ES256 authentication stand-in. Role is stored server-side, never granted from client metadata. Admin bootstrap is by immutable `ADMIN_USER_ID`, never email.
- Customer request creation, company assignment, technician start/complete, customer follow-up and scoped chat.
- Nine admin sections: overview, requests, technicians, customers, services, activity, conversations, feedback and app content.
- Server-side assignment rejects unavailable, blocked, wrong-skill and already-busy technicians. Write transactions serialize conflicting assignments, including across processes through a PostgreSQL advisory lock. Completed/cancelled requests cannot be reopened.
- Feedback review, team replies, bilingual Help, announcement and cash-preference setting. No payments are collected.
- Whole Node suite passed in memory and against a real temporary local PostgreSQL process. Seven tables were checked for RLS enablement. This is not verification against the user's live Supabase project.
- Flutter API contract test completed customer → admin → technician → customer against the local Node server. Flutter live-mode dashboard UI loaded server data, hid preview role/reset controls and saved bilingual Help. Browser admin was checked at desktop and 390px Arabic width.
- Existing offline Flutter test suite passed. The delivered APK remains the earlier offline preview, not this new live-mode source.

## Run locally

`cd backend && npm ci && npm test`

`node devstack.js` runs a LOCAL-ONLY auth stand-in plus seeded sample data on ports 3100/3101. It is a test helper, not deployable authentication and must not be exposed to the internet.

From `mobile/`, with the local helper running:

```
flutter test test/live_contract_test.dart test/live_ui_test.dart --dart-define=API_URL=http://127.0.0.1:3100 --dart-define=SUPABASE_URL=http://127.0.0.1:3101 --dart-define=SUPABASE_ANON_KEY=demo-anon
```

These two tests intentionally skip unless that exact local API address is configured. Screenshot tests write project-relative `shots_*` files, excluded from source.

## Production configuration, not yet applied

Server-only: `DATABASE_URL` (or PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE), `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_USER_ID`, and optionally `PGSSL_CA` for the database certificate chain. TLS verifies certificates by default. `PGSSL=off` is for isolated local testing only.

Public values: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SITE_URL`. `SITE_URL` must be the approved HTTPS origin; recovery links never use untrusted Host headers. Add that approved `/reset` redirect to the project's allowed redirects only with authority. Keep Confirm email ON. Do not change Supabase auth settings silently.

The server creates JSONB tables `users`, `services`, `requests`, `messages`, `feedback`, `content`, `activity` if absent and enables RLS without Data API policies. Only server-side direct database access is intended. Review migration/backup before first live start. An empty database receives three starter company services, no sample people or requests. All seven tables are app-specific; do not run against an unrelated project.

## Deployment gates still open

1. Approve the hosting service/account. Netlify adapter/config exists as preparation, not deployment or signup approval. No paid plan, card, domain purchase or revoked portfolio resource may be used.
2. Verify the intended Supabase project, database connection route, server-only key handling and confirmed admin account's immutable user ID. Credentials must not enter chat or source.
3. Approve first live schema creation, starter services and public configuration. Verify real JWT issuer/JWKS, database TLS and RLS with the actual project.
4. Configure the approved recovery redirect and final release API address. Remove the temporary non-demo signup gate only as part of the agreed service rollout. It was a preview implementation choice, not a legal requirement.
5. Test two independent real sessions/devices, auth confirmation/recovery, technician setup links, blocking, chat visibility and persistence across restart/deploy before release. Test the final signed APK on the user's device.

## Known limits

- No production host, real cross-device test or live Supabase end-to-end verification yet.
- Dashboard refresh is manual; it is not a realtime subscription.
- Flutter dashboard snapshot loads full collections and conversations. Suitable for a small MVP, not a claim of high-volume scalability. Pagination/rate limiting is a rollout hardening item.
- Partial upstream technician-creation failures need care: a Supabase account could exist even if a later database/link step fails. Check existing Auth users before retrying, never recreate blindly.
- Help is empty on a fresh live database until the admin adds approved company text. No invented support phone, service guarantee or legal policy.
- Reset/setup links are bearer credentials. Displayed once to admin, never recorded in activity. No fixed expiry promise is made; project policy controls expiry.
- Cash is an app preference only, not collection, pricing or payment authorization.

## Company workflow revision

Public registration is customer-only. Team sign-in is separate; technician accounts are created by management. A request moves from pending to inspection, then a versioned company quote. Only its customer may accept that exact quote version. Assignment requires acceptance. No inspection fee, deposit, standard price, appointment time, quote expiry or payment collection is assumed by this implementation. Seed quotes are illustrative, not a company price list. This flow has local memory/Postgres/API/UI tests, not a deployed Supabase verification.
