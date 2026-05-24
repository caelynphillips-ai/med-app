# CI and Release Guardrails

GitHub Actions runs automated checks on every push and pull request so Firebase rule and Expo bundling regressions are caught before release work.

## Workflow

Workflow file:

```text
.github/workflows/project-checks.yml
```

Workflow name:

```text
Project Checks
```

The workflow uses:

- Node.js 24
- Java 21 Temurin for the Firebase Emulator Suite
- `npm ci` for repeatable installs from the committed `package-lock.json`

No repository secrets are required. Firebase rules tests use the local emulator project `demo-med-organizer-rules` and do not touch production Firebase data.

## Checks

The workflow runs:

```powershell
npm run test:rules
npm run ci:web-export
npm run ci:expo-export
```

`npm run test:rules` starts the Firestore and Storage emulators, then runs the rules unit tests in `tests/rules`.

`npm run ci:web-export` validates the Expo web bundle.

`npm run ci:expo-export` validates the Expo Android/React Native bundle. This is not an EAS build and does not produce an APK; it is a fast bundling check.

Expected runtime is usually 5 to 10 minutes depending on dependency cache warmth.

## Local Troubleshooting

If dependency installation fails, run:

```powershell
npm install
```

If Firebase emulator tests fail because Java is missing, install Java and open a new terminal:

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
```

If rules tests fail, run:

```powershell
npm run test:rules
```

Review the failing test name first. Permission-denied console messages are expected in negative tests as long as the test suite itself passes.

If an Expo export fails, run the failing command locally:

```powershell
npm run ci:web-export
npm run ci:expo-export
```

Generated CI export files are written to `.expo-ci/` and are ignored by Git.
