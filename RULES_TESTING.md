# Firebase Rules Testing

These tests exercise Firestore and Storage security rules against the local Firebase Emulator Suite. They do not use production Firebase data or real user accounts.

## Install Test Tooling

If dependencies are not installed yet:

```powershell
npm install
```

The Firebase emulators also require Java on your PATH. On Windows, install a current LTS JDK such as Temurin:

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
```

If the global Firebase CLI is missing and you want it available outside npm scripts:

```powershell
npm install --global firebase-tools
```

The repository also includes `firebase-tools` as a dev dependency so `npm run test:rules` can use the project-local CLI after `npm install`.

## Run Rules Tests

```powershell
npm run test:rules
```

This starts the Firestore and Storage emulators using `firebase.json`, then runs:

```powershell
npm run test:rules:unit
```

Do not run `test:rules:unit` directly unless the emulators are already running.

## Coverage

Firestore tests cover:

- Owner medication read/create/edit/delete.
- Valid refill fields: `quantityRemaining`, `refillThreshold`, `refillReminderEnabled`, `lastRefillDate`.
- Rejection of unknown medication fields.
- Rejection of invalid `updatedFrom`.
- Cross-user medication blocking.
- Owner dose status read/write.
- Cross-user dose status blocking.
- Owner `appMeta/settings` read/write.
- Anonymous authenticated preview users.

Storage tests cover:

- Owner image upload/delete under `users/{uid}/medications/{medicationId}/{fileName}`.
- Owner PDF upload.
- Anonymous authenticated preview uploads.
- Cross-user read/delete/write blocking.
- Unsupported file type rejection.
- Files over 10 MB rejection.
- Rejection of valid files outside the medication attachment path.

## Notes

The emulator uses mocked authenticated users. Anonymous Preview mode is represented by an authenticated context with an anonymous sign-in provider claim, which matches the rules requirement that `request.auth.uid` owns the path.
