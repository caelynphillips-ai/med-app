# Azur Well Production Readiness Notes

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
- Android Google sign-in is implemented with Firebase credential exchange and Preview-account linking.
- Android Google sign-in still requires a fresh EAS preview build and real-device validation.
- iOS Google sign-in and Sign in with Apple remain future production setup work.
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
- Readable medication list export
- Preview mode explanation on mobile
- Secure account deletion

The readable export includes medication, schedule, instruction, note, reminder, refill, attachment metadata, and recent dose history summary information. It does not include uploaded attachment files.

## Account Deletion Status

Account deletion is implemented in the web and Expo mobile Privacy flows. The flow:

1. Requires the user to type `DELETE`.
2. Shows a final confirmation dialog.
3. Deletes Storage attachments under `users/{uid}/medications`.
4. Deletes `users/{uid}/medications`.
5. Deletes `users/{uid}/doseStatus`.
6. Deletes `users/{uid}/appMeta/settings`.
7. Deletes the Firebase Auth user last when Firebase allows it.

Firebase can require recent sign-in before Auth user deletion. If that happens, users should sign out, sign back in, and retry. Re-test this flow after moving to a partner Firebase project and deploying the current Storage rules.

## Expo/EAS Launch Checklist

Before a preview or production build:

1. Confirm `app.json` has the correct owner, EAS project ID, Android package, and iOS bundle ID.
2. Confirm `eas.json` preview builds APK and production builds store-ready artifacts.
3. Run `npx expo export --platform android` locally.
4. Build Android preview with `eas build --platform android --profile preview`.
5. Test on a real Android device.
6. Validate Android Google sign-in and Preview-account linking in the fresh preview build.
7. For iOS, configure Apple credentials and test a TestFlight/dev build on a real device.

## Release Blockers

- Android Google sign-in needs fresh-build and real-device validation; iOS native auth is not implemented.
- No formal offline sync or conflict handling exists.
- Store metadata, privacy policy URL, support URL, and screenshots are not prepared.
- Desktop app distribution still needs code signing.
- SwiftUI iOS app is source-only and has not been validated in Xcode in this workspace.
