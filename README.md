# Tazbeeta | تظبيطه

Home services for **Hexa plus**. Developed by **Eng Angluos Rezq**.

## Current state

- `mobile/`: Flutter customer, company technician and nine-section admin dashboard, Arabic/English. `DEMO=true` remains an offline sample workspace.
- `backend/`: Node API, Supabase Auth JWT verification, PostgreSQL storage and browser admin dashboard. API contracts and full request lifecycle tested locally, including a real local PostgreSQL process. No production deployment is claimed.
- `docs/BACKEND.md`: local verification, configuration and deployment gates.
- `docs/PROTOTYPE.md`: offline preview guide.

The delivered APK is the offline frontend preview. Later source changes do not change that installed APK. A server-connected release needs an approved host, real configuration and live verification first.

## Preview

From `mobile/`: `flutter pub get`, then `flutter run --dart-define=DEMO=true`.

## Local backend

From `backend/`: `npm ci`, `npm test`, `npm start`. Without database variables it uses memory only for development; production refuses that fallback. Never point tests or `devstack.js` at real accounts or databases.

Customer submits, company assigns an eligible technician, technician starts and completes, customer follows the same request. No marketplace, bidding, card collection or payment processing.

Preview updates use the existing encrypted repository signing secret. Do not rotate it or put signing material in source, artifacts or logs. The current APK retains `com.sallehli.sallehli`.
