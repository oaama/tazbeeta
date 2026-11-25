# Tazbeeta frontend MVP preview

Developed by Eng Angluos Rezq for Hexa plus.

This is an offline frontend demo, not a live service. Customer, technician and dashboard views share the same fictional requests and messages within a running app. No data is sent to a server. Closing the app resets the workspace. The role switcher is intentionally available only in DEMO builds, not a production permission system.

## Run

From mobile/: `flutter pub get`, then `flutter run --dart-define=DEMO=true`.
For browser preview: `flutter run -d chrome --dart-define=DEMO=true`.
For a local web build: `flutter build web --debug --dart-define=DEMO=true --no-web-resources-cdn` and serve build/web using a local HTTP server. Do not open index.html as a file URL.

## Walk through the same request

1. Sign up with sample text as customer, skip the sample location, create a request.
2. Tap the two-arrow preview switcher, choose Dashboard.
3. Requests: assign a suitable available team technician. The demo blocks double-booking, unavailable/blocked technicians and mismatched skills. No GPS/distance is fabricated.
4. Switch to that named technician, open Jobs, start and complete the assigned request. Local chat messages are shared across the two role views.
5. Switch back to customer and open Projects to see the same completed request.

Dashboard: responsive overview, request search/status filters, manual assignment/cancellation, technician sample creation, customer/technician blocking, bilingual service add/edit activity log, local team conversations, feedback review, editable bilingual Help, app announcement and cash-preference toggle. Saved customer addresses are visible in the customer section. Technician availability and skills can be edited. Reset sample data is explicit and confirmed. Added sample technicians are fictional profiles, no password/setup email/account is created.

Start illustration is static. The approved wrench/roller contours draw once, fill into the approved original logo, and Arabic تظبيطه appears underneath. Reduced-motion mode shows the resting logo without animation.

Other implemented screens: role selection, sample sign-up/login/recovery, service browsing/search, new request, customer Projects, technician Jobs/availability, conversations/chat, More, addresses, cash preference, local feedback and Help. Arabic/English supported. Sample free-text descriptions/names may stay in their entered language.

## Not live yet

Production Node/Supabase backend deployment and real auth remain a separate next phase. No real payment, external messaging, push notifications, real GPS assignment, password reset email, or multi-device synchronization is claimed. The prior backend/public/admin.html remains production-integration source, not the offline dashboard entry point. Non-demo registration retains its temporary readiness gate.

APK replacement/package and durable signing are pending owner decisions. Do not build with a new ephemeral CI debug key and call it an in-place update.
