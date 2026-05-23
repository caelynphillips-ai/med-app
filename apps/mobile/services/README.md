# Mobile Firebase Service Plan

The mobile app will keep the same Firebase project and paths as the web app:

- `users/{uid}/medications/{medicationId}`
- `users/{uid}/doseStatus/{yyyy-mm-dd}`
- `users/{uid}/appMeta/settings`
- Storage attachments under `users/{uid}/medications/{medicationId}/{fileName}`

Implemented mobile service pieces:

1. Firebase JS SDK initialization for the existing project.
2. Firestore repositories that mirror the web app paths.
3. Dose-status writes that preserve the web app document shape.
4. Storage upload/delete helpers that preserve the current attachment shape.
5. A web-compatible Google sign-in path plus a native anonymous preview session.
6. Local notification scheduling for installed Expo builds, with notification IDs tracked only in device storage.

Native Google sign-in still needs iOS and Android OAuth client IDs before team members can use the same Google account across native mobile and web.

The path helpers in `firebase-paths.js` keep path naming centralized so web, mobile, Electron, and SwiftUI can stay aligned.
