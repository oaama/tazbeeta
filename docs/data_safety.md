# Google Play Data safety answers (Tazbeeta)

Does the app collect or share user data? Yes (collects). Sharing: see below.
Is all data encrypted in transit? Yes (HTTPS).
Can users request deletion? Yes: in-app (More > Delete account) and web page https://tazbeeta.angluosr.workers.dev/delete-account
Data deletion URL: https://tazbeeta.angluosr.workers.dev/delete-account
Independent security review: No.

| Data type (Play category) | Collected | Shared | Optional | Purpose |
|---|---|---|---|---|
| Name (Personal info) | Yes | No | No | App functionality, account management |
| Email address (Personal info) | Yes | No | No | App functionality, account management, communications |
| User IDs (Personal info) | Yes | No | No | App functionality |
| Phone number (Personal info) | Yes | No | Yes | App functionality (company contact; never shown to the other party) |
| Address (Personal info) | Yes | No* | No | App functionality (service location) |
| Approximate location (Location) | Yes | No | Yes | App functionality |
| Precise location (Location) | Yes | No* | Yes | App functionality (find address, nearest technician) |
| Photos (Photos and videos) | Yes | No* | Yes | App functionality (problem and work photos) |
| Messages / other in-app messages (Messages) | Yes | No* | Yes | App functionality (chat, complaints) |
| Device or other IDs (push token) | Yes | No | Yes | App functionality (push notifications) |

*Information needed to do the job is visible to the technician assigned by the company (address, photos, chat). Play treats data sent to a service provider acting on your behalf as "not shared", and transfer to the user's assigned technician is part of the core feature. Processors: Cloudflare (hosting and database) and Google (Firebase Cloud Messaging for push). If you prefer the cautious reading, mark Address, Photos, Messages and Precise location as "Shared" with purpose "App functionality".

Not collected: payment card data, financial info, contacts, calendar, health, web history, audio, files, microphone/camera streams, advertising ID.
Data sold: No. Used for ads or tracking: No. Analytics: none in the app.
Location use: foreground only. No background location.
Security practices: encrypted in transit: Yes. Passwords are salted and hashed. Deletion request mechanism: Yes.
