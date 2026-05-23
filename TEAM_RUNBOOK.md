# Med Organizer Team Runbook

This workspace now contains the browser app, the Electron desktop app, and the native SwiftUI iOS app source. All three clients use the same Firebase project and the same user-owned data paths.

## Workspace Layout

```text
med test app/
  index.html
  firebaseConfig.js
  src/
  apps/
    web/
    desktop/
    ios/
  shared/
    app-constants.json
    schema/
    types/
    medication-data/
  firestore.rules
  storage.rules
```

The browser app remains at the root so the current local URL keeps working. The desktop app keeps a bundled renderer copy under `apps/desktop/renderer`, generated from the root web files.

## Shared Firebase Backend

Firebase project:

```text
med-test-7a252
```

Shared paths:

```text
users/{uid}/medications/{medicationId}
users/{uid}/doseStatus/{yyyy-mm-dd}
users/{uid}/medications/{medicationId}/{timestamp}-{filename}
```

All apps write:

- `schemaVersion: 1`
- `ownerId`
- `updatedAt`
- `updatedBy`
- `updatedFrom`

Client values:

- `web`
- `desktop`
- `ios`

## Web App

Run from the workspace root:

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

Firebase Auth must include `127.0.0.1` in Authorized domains.

## Desktop App

The Electron app lives here:

```text
apps/desktop
```

Before running desktop after any web changes:

```powershell
npm run desktop:sync
```

Install desktop dependencies:

```powershell
npm --prefix apps/desktop install
```

Run:

```powershell
npm run desktop
```

Build an unpacked desktop app:

```powershell
npm run desktop:build
```

Create installers:

```powershell
npm run desktop:dist
```

Production desktop distribution still needs code signing:

- macOS Developer ID signing and notarization
- Windows signing certificate

## iOS App

The SwiftUI app source lives here:

```text
apps/ios/MedOrganizer/MedOrganizer
```

On a Mac:

1. Add an iOS app to Firebase project `med-test-7a252`.
2. Use bundle id `com.caelynphillips.medorganizer`.
3. Download `GoogleService-Info.plist`.
4. Put it at:

```text
apps/ios/MedOrganizer/MedOrganizer/GoogleService-Info.plist
```

5. Replace the placeholder URL scheme in `Info.plist` with the reversed client id from that plist.
6. Generate and open the Xcode project:

```bash
cd apps/ios
brew install xcodegen
xcodegen generate
open MedOrganizer.xcodeproj
```

The iOS app cannot be built on this Windows machine because Apple requires Xcode/macOS for iOS signing and device builds.

## Cross-Client Smoke Test

Use one Google account across all clients.

1. Sign in on web.
2. Add a medication on web.
3. Open desktop and confirm the medication appears.
4. Mark a dose taken on desktop.
5. Confirm the status appears on web.
6. Run iOS on a simulator or device.
7. Confirm the medication list appears.
8. Add a medication on iOS.
9. Confirm it appears on web and desktop.

## Medical Safety Copy

Every client should show:

```text
This app is for personal organization only and does not provide medical advice. Confirm medication details with the prescription label, doctor, or pharmacist.
```

## Important Limits

The current backend rules are per-user. Team members can use any app version, but they do not share one medication list unless they sign into the same account. A true caregiver/team sharing feature should be a separate phase with roles, invitations, and stricter Firestore rules.

See `PRODUCTION_READINESS.md` before public launch. Native mobile Google sign-in, irreversible account deletion, store metadata, and formal offline sync are still launch blockers.
