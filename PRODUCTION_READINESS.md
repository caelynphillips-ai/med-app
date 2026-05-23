# Production Readiness Notes

This checklist tracks what is ready, what has been hardened, and what still blocks a public launch.

## Current App Targets

- Browser web app at the repository root
- Electron desktop app in `apps/desktop`
- Expo mobile app at the repository root with mobile code in `apps/mobile`
- SwiftUI iOS source in `apps/ios`

All production clients must keep using the same Firebase project and paths:

```text
users/{uid}/medications/{medicationId}
users/{uid}/doseStatus/{yyyy-mm-dd}
users/{uid}/appMeta/settings
users/{uid}/medications/{medicationId}/{fileName}
```

## Firebase Rules

Publish the checked-in rules before any team or external testing:

- `firestore.rules`
- `storage.rules`

Current rule intent:

- Only the signed-in owner can access their own user path.
- Medication writes are limited to the known schema fields.
- Dose status writes are limited to `statuses`, audit fields, and known client names.
- App metadata is limited to `appMeta/settings`.
- Storage writes are limited to medication attachment paths, supported file types, and files under 10 MB.

Do not add caregiver/team sharing by loosening these rules. Build sharing as a separate role-based model.

## Authentication Status

Web and desktop:

- Firebase Google sign-in is active.
- Firebase Authentication Authorized domains must include the browser and desktop loopback domains used for local testing.

Expo mobile:

- Preview mode uses Firebase anonymous auth.
- Anonymous auth must stay enabled while Preview mode exists.
- Native Google sign-in is not ready until iOS, Android, and Web OAuth client IDs plus Android SHA-1/SHA-256 fingerprints are configured.
- See `apps/mobile/services/GOOGLE_AUTH_SETUP.md`.

## Error And Offline Behavior

Current hardening:

- Web and mobile map Firebase permission, unauthenticated, network, and Storage errors to calmer user-facing messages.
- Web shows an offline banner when the browser reports that the device is offline.
- Existing visible data is not cleared on temporary subscription failures.
- Mobile notification scheduling cancels newly scheduled notifications if local tracking IDs cannot be saved.
- Attachment deletion failures do not block medication deletion, but they are surfaced as warnings.

Known limit:

- This is not a full offline sync engine. Users should treat offline edits as unsupported until a queued-write design is added.

## Notifications

Current mobile reminders are local notifications only:

- No cloud messaging
- No caregiver notifications
- Notification IDs are stored on the device with AsyncStorage
- Sign-out clears tracked local reminders when possible

Real-device testing is still required for:

- Permission prompts
- Android notification channel behavior
- Refill reminder timing
- Rescheduling after edit/delete

## Data Export And Privacy

Privacy screens provide:

- Medical disclaimer
- Storage explanation
- JSON export
- Readable medication list export
- Preview mode explanation on mobile
- Account deletion preparation copy

Exports include attachment metadata, not uploaded files.

## Account Deletion Plan

Account deletion is not implemented yet. Before public launch, add a secure irreversible flow that:

1. Requires recent sign-in or reauthentication.
2. Shows exactly what will be deleted.
3. Deletes Storage attachments under `users/{uid}/medications`.
4. Deletes `users/{uid}/medications`.
5. Deletes `users/{uid}/doseStatus`.
6. Deletes `users/{uid}/appMeta/settings`.
7. Deletes or disables the Firebase Auth user.
8. Records no medical data outside the user-owned Firebase paths.

Do not expose a destructive deletion button until this flow is implemented and tested.

## Expo/EAS Launch Checklist

Before a preview or production build:

1. Confirm `app.json` has the correct owner, EAS project ID, Android package, and iOS bundle ID.
2. Confirm `eas.json` preview builds APK and production builds store-ready artifacts.
3. Run `npx expo export --platform android` locally.
4. Build Android preview with `eas build --platform android --profile preview`.
5. Test on a real Android device.
6. Configure native Google OAuth before relying on Google account sync in mobile.
7. For iOS, configure Apple credentials and test a TestFlight/dev build on a real device.

## Release Blockers

- Native Google sign-in for Expo mobile is not implemented.
- Account deletion is documented but not implemented.
- No formal offline sync or conflict handling exists.
- Store metadata, privacy policy URL, support URL, and screenshots are not prepared.
- Desktop app distribution still needs code signing.
- SwiftUI iOS app is source-only and has not been validated in Xcode in this workspace.
