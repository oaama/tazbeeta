# Functional audit, 0.3.2

Baseline: delivered offline Android preview 0.3.0, build2006. This revision remains an offline preview unless built with real API configuration. No live deployment, payments or production account changes are included.

## Page and action checks

| Area | Implemented and checked | Limits |
| --- | --- | --- |
| Customer entrance | Customer-only signup and login; separate company-team login | Real Supabase verification remains deployment work |
| Customer profile | Name, phone, city/area edit/save; email and role read-only | Phone is a contact field, not OTP verified; no invented identity checks |
| Technician profile | Separate company-technician identity, contact/work area, management-owned service skills, availability | No self-edit of skills or role; no fabricated years of experience/ratings |
| Admin profile | Management identity, editable own contact fields, navigation and logout | Admin identity is server-owned |
| Services | Existing three categories, images, localized explanation, inspection/quote/acceptance process, linked intake | No invented extra company catalog or prices |
| Request intake | Requirement, full address, saved-address picker; empty addresses blocked | No appointment inventory or photo upload added |
| Requests | All/active/completed/cancelled views; full detail, progress, address, inspection note, quote version/scope/amount | Inspection coordination is through team chat, not a confirmed calendar slot |
| Quote acceptance | Confirmation shows exact quote; server checks owner and current version before assignment | Seed prices are illustrations only |
| Technician work | Assigned jobs only, start/complete lifecycle, availability and one-shot location | No background tracking or auto-dispatch |
| Addresses | Add/edit/delete with confirmation; failed saves preserve prior values | Maximum10; no maps autocomplete claim |
| Messages | Team/customer/assigned-technician thread access, visible load error and retry; failed send retains input, duplicate-send guard | No push notification delivery; no attachment messaging |
| Settings | Saved language and notification preferences, linked editable profile | Saved preferences do not imply connected push delivery |
| Admin workspace | Nine existing sections, contact details in people lists, management-created team accounts, skills/availability, inspection/quote/assignment gates, profile/logout | No new workforce/payment policy |
| Help and feedback | Local/API-backed forms; admin edits Help; add-Help bug fixed | No invented support phone/email or external store review |
| Payment preferences | Local preference only with clear no-collection/policy disclaimer | Not checkout, booking or payment processing |
| Offline restart | Profile, addresses, services, requests, messages, admin edits and active account survive restart; logout clears session | Data stays on that device, not multi-device sync |
| Decorative controls | Dead favorite/bell controls removed; profile control is actionable | No implied favorites or notification inbox |

## Verification

- Automated bilingual Flutter page and action tests, including new profile, role isolation, restart, address CRUD/failed save, chat failure/retry and service-detail/quote journeys.
- Actual Flutter phone-size renders checked, with top-of-page and deliberately scrolled worker captures distinguished.
- Local real Flutter-to-Node API contract includes profile save, invalid-phone rejection and address persistence, plus inspection/quote/accept/assign/chat/completion.
- Node authorization/validation/race tests run in development memory and an actual local PostgreSQL process; seven-table RLS enablement checked.
- No physical-device install/run or production Supabase end-to-end test is claimed.

## Outstanding product decisions, not silently invented

Approved service catalog beyond the three current categories; actual inspection fees and visit timing; cancellation terms; company support contacts; payment rules; technician onboarding requirements; appointments/photos/quote-history display. Hosting remains paused. These do not prevent testing the present offline preview, but the app is not represented as production-ready.

## Custom service requests

User-requested addition: a no-match entry in catalog/search opens a custom-need form, not a forced unrelated category. It captures a service title, description, address and contact phone (profile fallback) with account name/email. The company sees a distinct custom request and can chat/inspect it. Management must explicitly classify it into a real active company service before quoting. The original customer title stays recorded. No matching service means the company keeps it in triage, discusses with the customer, or adds a real supported service. Assignment still needs exact quote acceptance and an available technician with that service skill. No automatic hiring, arbitrary assignment, promised availability, visit time or price. Local bilingual UI/custom lifecycle tests, actual Flutter-to-Node custom contract and Node memory/Postgres tests cover this route.
