# Azur Well Partner Handoff

This document prepares Azur Well for a future partner handoff. It explains what the app does today, which account-specific values must be replaced, and what setup work is still needed before public release.

## App Overview

Azur Well is a medication, vitamin, and supplement organizer for personal care tracking. It helps users:

- Save medications, vitamins, and supplements.
- Track purpose, dosage, schedule, instructions, notes, attachments, reminders, and refill details.
- Mark daily doses as taken, skipped, or missed.
- Review 7-day adherence history from saved dose statuses.
- Export a readable medication list.
- Delete their account data through the Privacy screen.

Medical disclaimer: the app is for personal organization only and does not provide medical advice. Users should confirm medication details with the prescription label, doctor, or pharmacist.

## Current Feature List

- Firebase Google sign-in on web and desktop.
- Temporary anonymous Preview mode on Expo mobile.
- Firestore-backed medication CRUD.
- Firebase Storage attachments for medication files.
- Smart medication autocomplete from local RxTerms-shaped data with optional live RxTerms fallback.
- Today schedule sorted by time.
- Dose status buttons: taken, skipped, missed.
- Medication detail pages.
- Reminder cards and Expo local notification scheduling.
- Refill tracking and local refill reminders.
- Search, category filters, utility filters, and sorting.
- 7-day adherence history from `doseStatus` documents.
- Privacy screen with readable export, sign out, and secure account deletion.
- Firebase security rules and emulator tests.
- GitHub Actions project checks.

## Tech Stack

- Web: plain JavaScript modules, HTML, CSS, Firebase Web SDK.
- Mobile: Expo, React Native, Firebase JS SDK, Expo Notifications, AsyncStorage.
- Desktop: Electron wrapper around the synced web renderer.
- iOS source: SwiftUI scaffold/source under `apps/ios`.
- Backend: Firebase Authentication, Firestore, Firebase Storage.
- Build/deploy tooling: Expo/EAS, Firebase CLI, GitHub Actions.
- Rules tests: Firebase Emulator Suite and `@firebase/rules-unit-testing`.

## Architecture

Primary shared data paths:

```text
users/{uid}/medications/{medicationId}
users/{uid}/doseStatus/{yyyy-mm-dd}
users/{uid}/appMeta/settings
users/{uid}/medications/{medicationId}/{timestamp}-{filename}
```

Shared logic lives under `shared/`. The web app uses `src/`, the Expo mobile app uses `apps/mobile/`, the Electron app uses `apps/desktop/`, and the SwiftUI source lives under `apps/ios/`.

The current Expo app is rooted at the repository root through `App.js`, `app.json`, and `eas.json`, while its screens and services live under `apps/mobile/`.

## Account-Specific Values To Replace

These values currently point to the original development accounts and should be replaced or transferred before partner handoff.

| Area | Current value | Handoff action |
| --- | --- | --- |
| App name | `Azur Well` | Keep unless partner renames the product. |
| Expo slug | `med-app` | Keep or replace before creating partner EAS project. |
| URL scheme | `medorganizer` | Replace if bundle/package/app identity changes. |
| Expo owner | `caelynphillips.ux` | Transfer project or create under partner Expo account. |
| EAS project ID | `0068d222-a2af-437b-8f51-99a36e73074a` | Replace after `eas init` in partner account. |
| GitHub repository | `caelynphillips-ai/med-app` | Transfer repo or update references. |
| Firebase project ID | `med-test-7a252` | Replace with partner Firebase project. |
| Firebase auth domain | `med-test-7a252.firebaseapp.com` | Replace from partner Firebase web config. |
| Firebase storage bucket | `med-test-7a252.firebasestorage.app` | Replace from partner Firebase web config. |
| Firebase messaging sender ID | `501078768121` | Replace from partner Firebase web config. |
| Firebase app ID | `1:501078768121:web:8b4e1dc443f807793be528` | Replace from partner Firebase web config. |
| Firebase API key | Checked into Firebase client config files | Replace from partner Firebase web config. |
| Android package | `com.caelynphillips.medorganizer` | Replace before Play Console/OAuth setup if partner owns a different package. |
| iOS bundle ID | `com.caelynphillips.medorganizer` | Replace before Apple Developer/OAuth setup if partner owns a different bundle ID. |
| Desktop app ID | `com.medorganizer.desktop` | Replace before signed desktop distribution if needed. |

Files that currently contain account-specific values:

- `firebaseConfig.js`
- `apps/mobile/services/firebase-client.js`
- `apps/mobile/services/firebase-client.native.js`
- `apps/desktop/renderer/firebaseConfig.js` after running desktop sync
- `shared/app-constants.json`
- `app.json`
- `eas.json`
- `README.md`, `FIREBASE_SETUP.md`, `EAS_BUILD.md`, and related setup docs

## Replace Before Handoff Checklist

- Replace Firebase project config in every Firebase client file.
- Replace `app.json` `owner`, `extra.eas.projectId`, `extra.firebaseProjectId`, and `extra.githubRepository`.
- Decide whether Android package and iOS bundle ID stay as-is or move to partner-owned IDs.
- Create Google OAuth clients for web, Android, and iOS.
- Add Android SHA-1 and SHA-256 fingerprints to Firebase/Google Cloud.
- Configure Apple Developer account, App Store Connect app, and iOS bundle ID.
- Add production privacy policy URL and support URL.
- Deploy production Firestore and Storage rules.
- Re-run Firebase rules tests.
- Build a new Android preview APK after replacing account values.
- Build iOS with partner Apple credentials on macOS.
- Confirm account deletion behavior in the partner Firebase project.

## Firebase Setup Steps

1. Create or choose the partner Firebase project.
2. Enable Authentication providers:
   - Google for web/desktop.
   - Anonymous while Expo Preview mode remains available.
3. Create a Web app in Firebase and copy its config.
4. Replace the checked-in Firebase config values in the web, mobile, and desktop config files.
5. Create Firestore Database.
6. Create Firebase Storage.
7. Deploy the checked-in rules.
8. Add Firebase Authentication authorized domains for production web domain and any local testing domains.
9. Test sign-in, medication save, dose status save, attachment upload/remove, export, and account deletion.

## Firestore And Storage Rules Deployment

Rules are checked in at:

```text
firestore.rules
storage.rules
firebase.json
```

Deploy from a Firebase-authenticated terminal:

```powershell
firebase deploy --only firestore:rules,storage
```

If using a project alias, confirm it points to the partner project before deploying:

```powershell
firebase use
firebase projects:list
```

Rules intent:

- Users can only access their own `users/{uid}` data.
- Medication writes are limited to known schema fields.
- Dose status writes are limited to known status/audit fields.
- Storage attachments are limited to `users/{uid}/medications/{medicationId}/{fileName}`.
- Storage uploads allow images, PDFs, and fallback `application/octet-stream` under 10 MB.
- Users can list their own medication attachment folders for account deletion cleanup.

## Rules Testing Instructions

Install dependencies:

```powershell
npm install
```

Install Java if needed:

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
```

Run rules tests:

```powershell
npm run test:rules
```

These tests use the local Firebase Emulator Suite and do not touch production Firebase data.

## Expo And EAS Setup Notes

Current profiles in `eas.json`:

- `development`: internal development client.
- `preview`: internal Android APK.
- `production`: store-ready builds with auto-increment.

Partner setup:

1. Install and log into EAS CLI.
2. Run `npx eas-cli@latest init` after deciding whether to transfer or recreate the Expo project.
3. Replace `extra.eas.projectId` and `owner` in `app.json`.
4. Connect the partner GitHub repository in the Expo dashboard.
5. Use `preview` for Android APK testing.
6. Use `production` for Play Store/App Store artifacts.

Useful commands:

```powershell
npm start
npm run ci:expo-export
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest build --platform ios --profile production
```

## Android Keystore And Fingerprint Notes

Native Google sign-in requires Android signing certificate fingerprints:

- SHA-1
- SHA-256

Use the fingerprints for the exact signing credential used by the build:

- EAS preview/internal builds use the EAS Android credential for this project.
- Play Store builds may also need the Play App Signing certificate fingerprint.
- Local development builds may need a debug/dev-build fingerprint.

Do not export private keystore files during handoff unless the partner explicitly owns and secures them. Prefer viewing fingerprints through EAS credentials or Google Play Console.

## Google OAuth And Native Auth Status

Current status:

- Web Google sign-in works through Firebase Auth.
- Desktop Google sign-in uses the synced web renderer and Firebase Auth.
- Expo native Google sign-in is not implemented yet.
- Expo Preview mode uses Firebase Anonymous Auth and is intentionally temporary.

Required OAuth clients before native mobile account sync:

- Web OAuth client ID.
- Android OAuth client ID for the Android package and SHA fingerprints.
- iOS OAuth client ID for the iOS bundle ID.

Implementation notes live in:

```text
apps/mobile/services/GOOGLE_AUTH_SETUP.md
```

Do not remove Preview mode until native Google sign-in has been implemented and tested on real Android and iOS devices.

## Apple And iOS Account Notes

Partner must provide:

- Apple Developer Program membership.
- App Store Connect access.
- Production bundle ID decision.
- App Store app record.
- Support URL.
- Privacy policy URL.
- App privacy answers.
- iOS signing credentials through EAS or Xcode.

If the SwiftUI app source is used, a Mac with Xcode is required. If the Expo iOS app is used, EAS still requires Apple credentials for signing and TestFlight/App Store builds.

## Environment Variables And Templates

`.env.example` contains placeholder values only. The current app does not fully load Firebase config from `.env` automatically; the template is a handoff reference for future environment-based configuration.

If the partner wants environment-driven config, update the web and mobile Firebase client modules deliberately and test all targets afterward.

## Storage And Account Deletion Notes

Secure account deletion is implemented in the web and mobile Privacy flows. It attempts to delete:

- Firestore medications.
- Firestore dose status history.
- Firestore `appMeta/settings`.
- Storage attachments under the user medication attachment paths.
- Firebase Auth user account last.

Firebase may require recent login before deleting a non-anonymous Auth user. The UI should tell the user to sign out and sign back in if that happens.

The partner Firebase project must use the current Storage rules so users can list their own attachment folders during deletion cleanup.

## Known Launch Blockers

- Native Google sign-in for Expo mobile still needs OAuth client IDs and implementation.
- iOS App Store/TestFlight build needs Apple Developer setup.
- Android Play Store release needs Play Console setup, package ownership decision, store listing, privacy policy, and support URL.
- Production Firebase project and rules deployment are not yet under partner ownership.
- Real-device notification testing still needs to be completed after partner builds.
- Formal full QA pass has not been run for this handoff phase.
- Desktop distribution still needs signing if desktop release is part of launch.
- Store screenshots, app descriptions, age/content ratings, and privacy disclosures are not prepared.

## Final QA Checklist To Run Later

Run this after partner account setup, not during this documentation handoff.

- Web sign-in with partner Firebase Google Auth.
- Web medication add/edit/delete.
- Web attachment upload/remove.
- Web dose status save and history update.
- Web readable export.
- Web account deletion with a fresh sign-in.
- Expo Preview mode anonymous save persistence.
- Expo Android preview APK opens on a real device.
- Mobile medication list, detail, Add/Edit, reminders, refills, history, privacy, and account deletion.
- Local notification permission prompt and reminder scheduling on Android.
- Native Google sign-in once implemented.
- iOS build/test on physical device or TestFlight.
- Firebase rules tests pass.
- GitHub Actions checks pass.
- Confirm no data is written outside the documented user-owned Firebase paths.

