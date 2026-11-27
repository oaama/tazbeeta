# Google Play compliance check (Tazbeeta, branch feature/company-ops)

## Checked and OK
- Target SDK 36 (Flutter default at build time); meets the current Play requirement.
- Package id com.sallehli.sallehli. Keep it. It cannot change after the first upload.
- Permissions in the manifest: INTERNET, ACCESS_COARSE_LOCATION, ACCESS_FINE_LOCATION (foreground only), POST_NOTIFICATIONS. No background location, SMS, contacts, camera permission (photos use the system picker), or storage permission.
- Account deletion: in-app (More > Delete account, password required) plus web page /delete-account. Both required by Play for apps with accounts.
- Privacy policy and terms: in-app links plus hosted pages /privacy, /terms (EN and AR), served by the worker from the company name, address and support email set in Admin > App content.
- Cleartext traffic: the API is HTTPS only.
- Push: Firebase Cloud Messaging, project tazbeeta-60933 (owner angelo.rezq.dev@gmail.com). google-services.json holds public client config only.
- No ads SDK, no analytics SDK, no in-app purchases, so no billing or ads declarations.

## Must be done before submission (not done by me)
1. Company name, address and support email: currently placeholders ([COMPANY LEGAL NAME], [COMPANY ADDRESS, EGYPT]). Enter them in Admin > App content. The policy pages update at once.
2. Deploy the worker (new pages, deletion endpoint and push need it). Waits for Angelo's go.
3. App Bundle: Play requires an AAB. The CI builds a preview-signed APK only. Add an AAB job and use Play App Signing. Upload key: generate a new one, or reuse the current preview key as the upload key.
   Note: phones with the old preview-signed APK cannot update from a Play build, because Play re-signs with its own key. Those users must uninstall first.
4. Personal developer account rule: a closed test with at least 12 testers for 14 days before production. Start early. Organization accounts skip this but need a D-U-N-S number.
5. Reviewer access: create a reviewer customer account and give its login in "App access". Do not give the admin account.
6. Data safety form: use data_safety.md. Content rating: store_listing.md.
7. Store graphics: icon 512, feature graphic 1024x500, phone screenshots 1080x1920 (AR and EN). All made.
8. Arabic listing: add Arabic as a second store language and paste the Arabic texts.

## Risks to know
- Location text: the app asks for location with an in-app explanation before the system prompt. Keep that.
- Chat monitoring: the company can read chats (admin view). Mention is in the privacy policy.
- Payments are made to the company outside the app (cash or transfer). That keeps the app out of Play's payment policy, but do not add card entry without review.
