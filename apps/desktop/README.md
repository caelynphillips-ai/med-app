# Med Organizer Desktop

This Electron app packages the same Med Organizer experience as a desktop app while keeping Firebase Authentication, Firestore, and Storage connected to the same backend as the browser app.

## Run

From the workspace root:

```powershell
npm run desktop:sync
npm --prefix apps/desktop install
npm run desktop
```

The desktop app starts a private local server inside Electron and loads the bundled renderer from `apps/desktop/renderer`.

## Build

```powershell
npm run desktop:build
```

Use `npm run desktop:dist` when you are ready to create installers. Production distribution still needs platform signing:

- macOS: Developer ID signing and notarization
- Windows: code-signing certificate
- iOS: not applicable to Electron

## Auth Note

Google sign-in uses Firebase Auth in the renderer. Keep `127.0.0.1` in Firebase Authentication authorized domains because the desktop shell serves the app from a local loopback URL.
