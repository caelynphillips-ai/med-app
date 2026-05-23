# Med Organizer

A Firebase-backed medication, vitamin, and supplement organizer with four client targets:

- Browser web app
- Electron desktop app
- Expo mobile app
- Native SwiftUI iOS app source

All clients use the same Firebase Authentication, Firestore, Firebase Storage, medication suggestion data shape, and user-owned document paths.

## Run the Web App

```powershell
npm run web
```

If npm is unavailable:

```powershell
python -m http.server 5173 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:5173
```

## Run the Desktop App

```powershell
npm run desktop:sync
npm --prefix apps/desktop install
npm run desktop
```

The desktop app is in `apps/desktop` and loads a synced copy of the web app renderer.

## iOS App

The SwiftUI iOS app source is in:

```text
apps/ios/MedOrganizer/MedOrganizer
```

iOS builds require macOS and Xcode. Add an iOS app to Firebase project `med-test-7a252`, download `GoogleService-Info.plist`, and follow `apps/ios/README.md`.

## Shared Contract

Shared schemas, constants, and cross-client rules live in `shared`.

Firestore paths:

```text
users/{uid}/medications/{medicationId}
users/{uid}/doseStatus/{yyyy-mm-dd}
users/{uid}/appMeta/settings
```

Storage path:

```text
users/{uid}/medications/{medicationId}/{timestamp}-{filename}
```

## Team Runbook

See `TEAM_RUNBOOK.md` for platform setup, cross-client testing, and release notes.

See `PRODUCTION_READINESS.md` for Firebase rules, auth status, notification limits, account deletion planning, and launch blockers.

## Firebase Features Used

- Authentication: Google sign-in
- Firestore: per-user medication records and daily dose status
- Storage: medication label photos, PDFs, or instruction files
- Local JSON: RxTerms-shaped smart medication autocomplete and autofill suggestions
- Optional RxTerms refresh: `scripts/import-rxterms.mjs`

## Permissions Setup

If Firebase shows `missing or insufficient permissions`, publish the rules in `firestore.rules` and `storage.rules`. The same instructions are also in `FIREBASE_SETUP.md`.
