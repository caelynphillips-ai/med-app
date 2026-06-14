# Desktop and iOS Expansion Plan

## Goal

Turn the current medication organizer web app into a family of apps that all use the same Firebase backend:

- Existing browser app
- Electron desktop app for macOS, Windows, and possibly Linux
- Native Swift iOS app

All versions should share the same authentication system, Firestore database, Firebase Storage files, medication autocomplete data model, and user experience concepts. A user should be able to sign in on any version and see the same medications, schedule, dose statuses, notes, and uploaded files.

## Current App Baseline

The current app is a static browser app with:

- Firebase Authentication using Google sign-in
- Firestore user data under `users/{uid}`
- Firebase Storage uploads under `users/{uid}/medications/{medicationId}`
- Medication CRUD
- Daily schedule and dose status tracking
- Local RxTerms-shaped medication suggestion data in `src/medications.json`
- Optional live RxTerms fallback through `src/rxterms.js`
- Medical disclaimer and personal-organization positioning

Important existing files:

- `index.html`
- `src/app.js`
- `src/styles.css`
- `src/medications.json`
- `src/rxterms.js`
- `firebaseConfig.js`
- `firestore.rules`
- `storage.rules`

## Architecture Decision

Use Firebase as the shared backend for all clients.

Each app should have its own frontend/runtime, but they must agree on:

- Auth providers
- Firestore paths
- Firestore document shapes
- Storage paths
- Security rules
- Medication suggestion data shape
- Date and time handling
- Dose status values
- Medical disclaimer language

Recommended app split:

```text
med-test-app/
  apps/
    web/
    desktop/
    ios/
  shared/
    schema/
    medication-data/
    docs/
  firebase/
    firestore.rules
    storage.rules
```

This can be introduced gradually. The current files do not need to move immediately; first stabilize the data contract, then migrate structure when desktop/iOS work begins.

## Shared Firebase Backend

### Firebase Project

Keep using the existing Firebase project:

```text
azur-well
```

Add each new app to the same Firebase project:

- Web app: already exists
- Desktop app: can use the existing Web Firebase config unless a separate web app entry is preferred
- iOS app: add an iOS app in Firebase Console and download `GoogleService-Info.plist`

### Authentication

Keep Firebase Authentication as the identity layer.

Supported sign-in strategy:

- Web: Firebase Auth + Google provider
- Electron: Firebase Auth + Google provider, ideally using a desktop-safe OAuth flow
- iOS: Firebase Auth + Google Sign-In SDK
- iOS App Store readiness: plan for Sign in with Apple or an Apple-compliant alternative if the app is submitted publicly with Google sign-in

Important principle:

The same person must end up with the same Firebase `uid` across web, desktop, and iOS. If adding Apple sign-in later, use Firebase provider linking so one human does not accidentally create two separate medication lists.

### Firestore Data Model

Keep the current user-owned model for the first desktop/iOS release:

```text
users/{uid}
  medications/{medicationId}
  doseStatus/{yyyy-mm-dd}
  appMeta/settings
```

Medication document shape:

```json
{
  "schemaVersion": 1,
  "ownerId": "firebase-user-id",
  "name": "Lisinopril",
  "genericName": "Lisinopril",
  "category": "prescription",
  "purpose": "blood pressure",
  "dosage": "10 mg Tab",
  "timesPerDay": 1,
  "schedule": [
    {
      "id": "morning",
      "label": "Morning",
      "time": "08:00"
    }
  ],
  "intake": "water",
  "foodInstructions": "Take with water.",
  "notes": "Refill before end of month.",
  "reminder": {
    "enabled": true,
    "leadMinutes": 15
  },
  "attachment": {
    "name": "label.jpg",
    "path": "users/{uid}/medications/{medicationId}/label.jpg",
    "url": "download-url",
    "contentType": "image/jpeg",
    "uploadedAt": "iso-date"
  },
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

Dose status document:

```text
users/{uid}/doseStatus/{yyyy-mm-dd}
```

```json
{
  "statuses": {
    "{medicationId}_{slotId}": {
      "status": "taken",
      "updatedAt": "iso-date"
    }
  },
  "updatedAt": "serverTimestamp"
}
```

Allowed dose statuses:

```text
due
taken
skipped
missed
auto-missed
```

Only persisted statuses should be:

```text
taken
skipped
missed
```

`due` and `auto-missed` should be computed by each client.

### Storage Model

Keep the existing Storage path:

```text
users/{uid}/medications/{medicationId}/{timestamp}-{filename}
```

Supported attachments:

- Photos of medication labels
- PDFs
- Doctor/pharmacy instruction files

Each client should upload through Firebase Storage and write the attachment metadata to the medication document.

### Security Rules

Current personal-user rules are appropriate for a first multi-client release:

```text
allow read, write only when request.auth.uid == userId
```

Before any team/shared-medication feature:

- Add a formal sharing model
- Do not loosen rules globally
- Introduce `teams/{teamId}` or `careGroups/{groupId}`
- Store membership roles
- Validate permissions through rules or Cloud Functions

Potential future shared model:

```text
careGroups/{groupId}
  members/{uid}
  medications/{medicationId}
  doseStatus/{yyyy-mm-dd}
```

Roles:

```text
owner
editor
viewer
caregiver
```

For now, keep personal user data isolated.

## Shared Data Contract

Create a shared schema folder before starting desktop/iOS:

```text
shared/schema/
  medication.schema.json
  dose-status.schema.json
  medication-suggestion.schema.json
```

Use this shared schema to generate or manually maintain:

- TypeScript types for web/Electron
- Swift structs for iOS
- Firestore validation expectations
- Test fixtures

Recommended TypeScript contract:

```ts
type MedicationCategory =
  | "prescription"
  | "over-the-counter"
  | "vitamin"
  | "supplement";

type IntakeInstruction = "food" | "water" | "empty";

type DoseStatus = "taken" | "skipped" | "missed";
```

Recommended Swift models:

```swift
struct Medication: Identifiable, Codable {
    var id: String?
    var schemaVersion: Int
    var ownerId: String
    var name: String
    var genericName: String?
    var category: MedicationCategory
    var purpose: String
    var dosage: String
    var timesPerDay: Int
    var schedule: [MedicationScheduleSlot]
    var intake: IntakeInstruction
    var foodInstructions: String?
    var notes: String?
    var reminder: MedicationReminder
    var attachment: MedicationAttachment?
}
```

## Medication Suggestions and RxTerms

Keep local data as the primary autocomplete source.

Current files:

```text
src/medications.json
src/rxterms.js
scripts/import-rxterms.mjs
```

Target shared layout:

```text
shared/medication-data/
  medications.json
  rxterms-transform.ts
  import-rxterms.mjs
```

Each client should use the same normalized suggestion shape:

```json
{
  "name": "Metformin",
  "genericName": "Metformin",
  "brandNames": [],
  "category": "Prescription",
  "rxTermsName": "Metformin",
  "strengthsAndForms": ["500 MG Oral Tablet", "1000 MG Oral Tablet"],
  "commonUses": [],
  "foodInstructions": "",
  "source": "RxTerms",
  "lastUpdated": "2026-05-20"
}
```

UI rule:

Do not show source labels such as RxTerms or Local to end users. Source can remain in data for debugging, import management, and audits.

Autocomplete behavior:

- Search local JSON first
- Search across name, generic name, brand names, and strengths/forms
- Rank exact match first
- Rank starts-with next
- Rank broader includes last
- Optionally live-fetch RxTerms only when local results are sparse
- Debounce live fetch
- Cache live results for the session
- Merge without duplicates

iOS should bundle the same local JSON file. Live RxTerms fallback can be added after the native app is stable.

## Electron Desktop App Plan

### Desktop Strategy

Use Electron to package the existing web app experience into a desktop application.

Recommended approach:

- Keep renderer UI as the current web app or a lightly refactored version
- Use Electron main process only for desktop shell behavior
- Keep Firebase calls in the renderer
- Use strict Electron security defaults
- Do not expose Node APIs to the renderer unless needed

### Proposed Desktop Structure

```text
apps/desktop/
  package.json
  electron/
    main.ts
    preload.ts
  renderer/
    index.html
    src/
  build/
```

If keeping current static app first:

```text
apps/desktop/electron/main.js
```

Can load:

```text
file://.../index.html
```

or a packaged renderer build.

### Electron Security Requirements

Main BrowserWindow settings:

```js
webPreferences: {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  preload: path.join(__dirname, "preload.js")
}
```

Other requirements:

- Add a Content Security Policy
- Block arbitrary navigation
- Use `setWindowOpenHandler`
- Never store Firebase service account credentials in the desktop app
- Treat the desktop app like a public client

### Electron Authentication

Main challenge:

Google OAuth in desktop shells can be more fragile than browser OAuth.

Implementation options:

1. Use Firebase Web SDK in the Electron renderer and test Google sign-in in a packaged app.
2. Prefer redirect/system-browser style auth if popup auth has desktop-window issues.
3. Consider a hosted auth callback page on Firebase Hosting if needed.

Recommended first pass:

- Use the Firebase Web SDK already used by the web app
- Use `signInWithRedirect` or controlled popup flow after testing
- Add desktop redirect/callback handling only if needed

### Electron Storage and Files

Attachment upload flow:

- Use standard file picker in renderer first
- Upload file directly to Firebase Storage
- Store metadata in Firestore

Later desktop improvements:

- Drag-and-drop file upload
- Camera/scanner import
- Local encrypted cache for offline viewing

### Electron Offline Behavior

Phase 1:

- Online-first
- Show clear offline/error states

Phase 2:

- Enable Firestore offline persistence where supported
- Queue writes when offline
- Resolve conflicts using `updatedAt`

### Desktop Packaging

Recommended packaging options:

- Electron Forge for project scaffolding and packaging
- electron-builder if you want deeper installer/update configuration

Deliverables:

- macOS `.dmg` or `.pkg`
- Windows `.exe` installer
- Optional Linux AppImage/deb

Release requirements:

- macOS Developer ID signing
- macOS notarization
- Windows code-signing certificate
- Auto-update plan
- Crash/error reporting

## Native Swift iOS App Plan

### iOS Strategy

Build a native SwiftUI app that uses the same Firebase backend.

Do not wrap the web app in a WebView for the final iOS app. A native SwiftUI app will give better:

- App Store fit
- Accessibility
- Performance
- File/photo permissions
- Local reminders
- Offline support
- Native navigation

### iOS Project Structure

```text
apps/ios/MedOrganizer/
  MedOrganizerApp.swift
  AppDelegate.swift
  GoogleService-Info.plist
  Models/
  Services/
    AuthService.swift
    MedicationRepository.swift
    StorageService.swift
    MedicationSuggestionService.swift
  Views/
    TodayView.swift
    MedicationListView.swift
    MedicationDetailView.swift
    MedicationFormView.swift
    RemindersView.swift
  Resources/
    medications.json
```

### iOS Firebase Setup

In Firebase Console:

- Add iOS app
- Set bundle ID
- Download `GoogleService-Info.plist`
- Add it to Xcode target
- Enable Google provider in Firebase Authentication
- Configure URL schemes for Google Sign-In

Swift packages:

- FirebaseAuth
- FirebaseFirestore
- FirebaseStorage
- GoogleSignIn

Possible later packages:

- FirebaseCrashlytics
- FirebaseAnalytics
- FirebaseAppCheck

### iOS Authentication

Initial iOS auth:

- Google Sign-In through Firebase Auth

App Store consideration:

- If publicly distributed and Google sign-in is offered for account auth, plan for Sign in with Apple or another qualifying equivalent login option.

Account linking:

- If adding Apple sign-in later, link providers to the same Firebase user where possible.
- Add account recovery and duplicate-account handling.

### iOS Firestore Repository

Create a repository layer:

```swift
final class MedicationRepository {
    func observeMedications(userId: String) -> AsyncThrowingStream<[Medication], Error>
    func saveMedication(_ medication: Medication, userId: String) async throws
    func deleteMedication(id: String, userId: String) async throws
    func observeDoseStatus(userId: String, dateKey: String) -> AsyncThrowingStream<DoseStatusDocument, Error>
    func updateDoseStatus(userId: String, dateKey: String, doseKey: String, status: DoseStatus) async throws
}
```

Keep Firestore paths identical to web/desktop:

```text
users/{uid}/medications
users/{uid}/doseStatus/{yyyy-mm-dd}
```

### iOS Storage

Attachment sources:

- Photo library
- Camera
- Files app

Upload path:

```text
users/{uid}/medications/{medicationId}/{timestamp}-{filename}
```

After upload:

- Get download URL
- Store attachment metadata on medication document

### iOS Views

Minimum native screens:

- Sign-in screen
- Today schedule
- Medication list
- Add medication
- Edit medication
- Medication detail
- Reminder settings

Match current product behavior:

- Add/edit all current fields
- Autocomplete medication name from local JSON
- Dosage chips from strengths/forms
- Common-use chips with comma-separated removable selected uses
- Editable instructions
- Mark doses as taken/skipped/missed
- Medical disclaimer

### iOS Notifications

Phase 1:

- Keep reminder-style UI only, matching current app.

Phase 2:

- Add optional local notifications with user permission.
- Use `UNUserNotificationCenter`.
- Schedule local notifications from medication schedule and reminder lead time.
- Sync notification preferences through Firestore.

Important:

Notification delivery is local-device behavior. Firestore stores preferences, but each device schedules its own local notifications.

## Keeping All Apps Working Together

### Shared Backend Contract

All apps must use the same:

- Firestore paths
- Storage paths
- field names
- category values
- dose status values
- date key format

Use date keys:

```text
yyyy-mm-dd
```

Use local device timezone for today's schedule unless a future profile setting defines a preferred timezone.

### Sync Behavior

Each app should:

- Listen to medication collection changes in real time
- Listen to today’s dose status document
- Write updates immediately
- Use server timestamps for writes
- Recompute schedule locally

Conflict handling:

- Last write wins for simple field edits
- Dose status can safely overwrite per dose key
- For future collaboration, add audit fields and change history

Recommended metadata:

```json
{
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp",
  "updatedBy": "uid",
  "updatedFrom": "web | desktop | ios"
}
```

### Versioning

Add:

```json
{
  "schemaVersion": 1
}
```

Every client should tolerate missing optional fields.

Migration strategy:

- Clients read older docs gracefully
- Cloud Function migration only if needed later
- Never require every user to open web first before iOS/desktop works

## Team Usage Clarification

There are two meanings of “team can use any version.”

### Version A: Same Individual Uses Any App

This is easiest and should be Phase 1:

- Each user signs in
- Their own meds sync across web, desktop, iOS
- User can switch devices freely

### Version B: Shared Team/Caregiver Access

This is a larger feature and should be Phase 2:

- Invite another user to view or manage a medication list
- Add roles
- Update Firestore rules
- Add acceptance flow
- Add audit/history

Recommendation:

Ship Phase 1 first. Design the schema so Phase 2 can be added without breaking existing users.

## Privacy, Safety, and Compliance

Medication data is sensitive.

Before public launch:

- Write a privacy policy
- Define whether the app is personal use only or healthcare/business use
- Review HIPAA obligations if used by a covered entity or business associate
- Minimize analytics on medication names and notes
- Do not log medication names in crash reports
- Add account deletion/data export plan
- Add clear medical disclaimer in all clients

Required disclaimer:

```text
This app is for personal organization only and does not provide medical advice. Confirm medication details with the prescription label, doctor, or pharmacist.
```

## Development Phases

### Phase 0: Backend Contract Stabilization

Deliverables:

- Document Firestore schema
- Add `schemaVersion`
- Add shared sample fixtures
- Confirm Firestore and Storage rules
- Confirm all current web writes match the schema

Acceptance criteria:

- Existing web app still works
- New docs include schemaVersion
- Old docs still render correctly

### Phase 1: Refactor Web App Into Reusable Modules

Keep UI intact, but extract:

- Firebase init
- Auth service
- Medication repository
- Storage service
- Medication suggestion service
- Date/schedule helpers

Possible files:

```text
src/services/auth.js
src/services/medications.js
src/services/storage.js
src/services/suggestions.js
src/utils/schedule.js
```

Acceptance criteria:

- No behavior regression
- Same visual UI
- Add/edit/delete still works
- Dose statuses still work

### Phase 2: Electron Prototype

Deliverables:

- Electron shell
- Desktop window loads app
- Google sign-in works in desktop build
- Firestore reads/writes work
- Storage upload works

Acceptance criteria:

- Sign in on desktop
- Add a medication on desktop
- See it on web
- Mark a dose on web
- See status on desktop

### Phase 3: Electron Production Build

Deliverables:

- App icon
- macOS build
- Windows build
- Code signing plan
- Auto-update decision
- Installer testing

Acceptance criteria:

- Desktop build installs cleanly
- Auth persists after restart
- App handles offline/no-network gracefully
- No exposed secrets

### Phase 4: iOS Prototype

Deliverables:

- Xcode SwiftUI project
- Firebase configured
- Google sign-in
- Today schedule
- Medication list
- Medication detail
- Add/edit form

Acceptance criteria:

- Sign in on iOS
- Existing web meds appear
- Add med on iOS
- Web and desktop see it
- Upload attachment from iOS
- Web can open attachment

### Phase 5: iOS Polish

Deliverables:

- App icon
- Launch screen
- Accessibility pass
- Dynamic Type support
- Empty/error/loading states
- Optional local notifications
- TestFlight build

Acceptance criteria:

- TestFlight testers can use app
- No crashes during core flows
- VoiceOver labels are sensible
- App Store auth requirements reviewed

### Phase 6: Shared Team/Caregiver Feature

Only start after personal multi-device sync works.

Deliverables:

- Care group schema
- Membership roles
- Invite flow
- Updated security rules
- UI for shared lists
- Audit trail

Acceptance criteria:

- Users can share access intentionally
- Non-members cannot read data
- Role restrictions work across all clients

## Testing Plan

### Shared Backend Tests

- Firestore rule tests
- Storage rule tests
- Schema fixture tests
- Migration tests

### Web Tests

- Auth state handling
- Medication CRUD
- Dose status updates
- Autocomplete and RxTerms fallback
- Responsive layout

### Electron Tests

- Packaged app launch
- Auth persistence
- OAuth flow
- Firestore sync
- Storage upload
- Window security checks

### iOS Tests

- Sign-in
- Firestore listeners
- Add/edit/delete medication
- Dose status updates
- Attachment upload
- Offline behavior
- Dynamic Type
- VoiceOver labels

### Cross-Client Sync Tests

Test matrix:

| Action | Web sees it | Desktop sees it | iOS sees it |
|---|---:|---:|---:|
| Add medication on web | Yes | Yes | Yes |
| Edit medication on desktop | Yes | Yes | Yes |
| Delete medication on iOS | Yes | Yes | Yes |
| Mark dose taken on web | Yes | Yes | Yes |
| Upload attachment on iOS | Yes | Yes | Yes |

## Release Plan

### Internal Alpha

- Web remains local/dev
- Electron unsigned/internal build
- iOS local Xcode installs

### Private Beta

- Web deployed to Firebase Hosting
- Desktop signed if possible
- iOS TestFlight

### Public Release

- Web production domain
- Desktop signed/notarized installers
- iOS App Store submission
- Privacy policy
- Support email
- Data deletion instructions

## Key Risks

### OAuth Differences

Google sign-in behaves differently across browser, Electron, and iOS. Plan time for platform-specific auth testing.

### App Store Login Requirements

iOS may require an Apple-compliant login option if Google sign-in is offered publicly.

### Sensitive Data

Medication data can be sensitive. Avoid logging medication names and notes.

### Shared Access

Team/caregiver sharing changes the security model. Do not add it by simply widening user rules.

### Offline Conflicts

If offline write support is added, define conflict behavior before launch.

## Recommended Next Steps

1. Stabilize and document the Firestore schema.
2. Add `schemaVersion` to new medication writes.
3. Extract current web Firebase/data logic into service modules.
4. Create an Electron proof of concept that loads the current app.
5. Test Google sign-in in packaged Electron.
6. Create a SwiftUI iOS prototype with Firebase Auth, Firestore, and Storage.
7. Run cross-client sync tests.
8. Decide whether shared team/caregiver access is in scope for v1 or v2.
