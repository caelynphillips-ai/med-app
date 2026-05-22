# Mobile Firebase Service Plan

The mobile app will keep the same Firebase project and paths as the web app:

- `users/{uid}/medications/{medicationId}`
- `users/{uid}/doseStatus/{yyyy-mm-dd}`
- `users/{uid}/appMeta/settings`
- Storage attachments under `users/{uid}/medications/{medicationId}/{fileName}`

Next service step:

1. Add the Firebase JS SDK as an npm dependency for Expo.
2. Initialize Firebase from the existing project config.
3. Use Expo-compatible Google sign-in, then pass the Google credential into Firebase Auth.
4. Add Firestore repositories that mirror the web service modules.
5. Add Storage upload/delete helpers that preserve the current attachment shape.

The path helpers in `firebase-paths.js` keep path naming centralized so web, mobile, Electron, and SwiftUI can stay aligned.
