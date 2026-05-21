# Expo EAS Build Setup

This repository now includes a root-level Expo app configuration so Expo can build the connected GitHub repository for iOS and Android.

## What EAS Builds

- `app.json` defines the Expo app identity, iOS bundle identifier, Android package name, and shared project metadata.
- `App.js` is the current Expo mobile entry point. It is intentionally small so EAS has a valid native app to compile without replacing the existing web, Electron, or SwiftUI work.
- `eas.json` defines development, preview, and production build profiles.
- `.easignore` keeps desktop build output and local-only files out of EAS uploads.

## Useful Commands

```bash
npm start
npm run eas:build
npm run eas:build:ios
npm run eas:build:android
```

## Expo Website Builds

Before the first website build, link this repo to an Expo/EAS project:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
```

The `init` command adds the Expo project ID to `app.json` under `extra.eas.projectId`. Commit and push that small `app.json` change so non-interactive builds from GitHub can find the EAS project.

Then:

1. Open the Expo dashboard.
2. Connect the GitHub repository `caelynphillips-ai/med-app`.
3. Select this repository root as the project directory.
4. Choose the `preview` profile for internal testing, or `production` for store-ready builds.
