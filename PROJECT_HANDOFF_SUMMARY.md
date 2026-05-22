# Med Test Medication Organizer App Handoff Summary

Last updated: 2026-05-22

Current GitHub repo: `caelynphillips-ai/med-app`
Current branch: `main`
Latest known commit at handoff time: `9a48408 Support Expo Go tunnel startup`

## 1. Project Overview

### What the app does

Med Organizer is a medication, vitamin, and supplement organizer. It lets users sign in, create a personal medication list, track scheduled doses for the current day, mark doses as taken/skipped/missed, store notes and instructions, and upload medication label or instruction files.

The current main product experience is the browser web app in the repository root. There is also an Electron desktop wrapper, native SwiftUI iOS source, and a small Expo/EAS mobile build shell.

### Core goals

- Help users organize prescriptions, over-the-counter medications, vitamins, and supplements.
- Keep the experience calm, readable, accessible, and low-stress.
- Keep medication purpose text in the user's own words.
- Show today's schedule in time order.
- Let users mark doses as taken, skipped, or missed.
- Store data in Firebase so the same signed-in user can access it across app versions.
- Use medication autocomplete and dosage/use chips as reference helpers, not medical advice.
- Keep a clear disclaimer that the app is for personal organization only and does not provide medical advice.

### Target users

- Individuals managing their own medications, vitamins, and supplements.
- People who want a simple personal organizer rather than a clinical medical tool.
- Future possible users include caregivers or family/team members, but shared-care/team access is not implemented yet.

### Current overall state of development

- The browser web app is the most complete app and contains the actual medication organizer UI.
- Firebase Auth, Firestore, and Storage are integrated.
- Google sign-in is implemented in the web app.
- Firestore and Storage rules exist and are intended to restrict data to each signed-in user's own `users/{uid}` path.
- Sample medications seed for new users.
- Medication autocomplete, local RxTerms-shaped data, and live RxTerms fallback are implemented in the web app.
- Electron desktop app exists and loads a synced copy of the web app renderer.
- SwiftUI iOS source exists with Firebase-oriented models, services, and views, but it needs macOS/Xcode/Firebase iOS setup before it can be built and fully verified.
- Expo/EAS setup exists at the repo root, but the Expo `App.js` is currently a small build shell, not the full medication organizer UI.
- Android EAS builds are configured. Production builds produce `.aab`; preview builds produce `.apk`.
- Expo Go tunnel mode has been started successfully after adding `@expo/ngrok`.

## 2. Tech Stack

### Frameworks

- Browser web app: static HTML/CSS/JavaScript modules.
- Firebase Web SDK imported from Google CDN in `src/app.js` and `firebaseConfig.js`.
- Electron desktop app: Electron shell under `apps/desktop`.
- Native iOS source: SwiftUI under `apps/ios/MedOrganizer/MedOrganizer`.
- Expo/EAS build shell: React Native/Expo at the repository root through `App.js`, `app.json`, and `eas.json`.

### Libraries

- Firebase Web SDK 10.12.4:
  - `firebase-app`
  - `firebase-auth`
  - `firebase-firestore`
  - `firebase-storage`
- Electron:
  - `electron`
  - `electron-builder`
- Expo/React Native:
  - `expo ~55.0.26`
  - `react 19.2.0`
  - `react-native 0.83.6`
  - `react-dom 19.2.0`
  - `react-native-web ^0.21.0`
  - `@expo/metro-runtime ~55.0.11`
  - `@expo/ngrok ^4.1.0`
  - `typescript ~5.9.2`
  - `@types/react ~19.2.10`
- SwiftUI iOS source expects:
  - FirebaseAuth
  - FirebaseFirestore
  - FirebaseStorage
  - GoogleSignIn
  These are referenced by code/imports and the iOS README, but the Xcode project setup must be completed on macOS.

### APIs

- Firebase Authentication with Google sign-in.
- Cloud Firestore for medication records and dose status.
- Firebase Storage for attachments.
- RxTerms API from ClinicalTables/NLM:
  - `https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms={query}&ef=STRENGTHS_AND_FORMS`
  - Used by `src/rxterms.js` as an optional live fallback and by `scripts/import-rxterms.mjs` to refresh local data.

### State management

- Web app uses a single in-memory `state` object in `src/app.js`.
- State includes:
  - `user`
  - `booting`
  - `loadingMeds`
  - `busy`
  - `view`
  - `selectedMedId`
  - `editMode`
  - `meds`
  - `statuses`
  - `toast`
  - medication suggestion state
- Rendering is manual string-template rendering into `#app`.
- Current view is persisted in `localStorage` as `medOrganizerView`.
- Medication data itself is persisted in Firebase, not local storage.

### Storage system

- Firestore paths:
  - `users/{uid}/medications/{medicationId}`
  - `users/{uid}/doseStatus/{yyyy-mm-dd}`
  - `users/{uid}/appMeta/settings`
- Storage path:
  - `users/{uid}/medications/{medicationId}/{timestamp}-{filename}`
- Local JSON medication suggestion data:
  - `src/medications.json`
  - duplicate/shared copies under `shared/medication-data/medications.json` and iOS resources.

### Expo/EAS setup

- Root `app.json`:
  - `name`: `Med Organizer`
  - `slug`: `med-app`
  - `owner`: `caelynphillips.ux`
  - Android package: `com.caelynphillips.medorganizer`
  - iOS bundle identifier: `com.caelynphillips.medorganizer`
  - EAS project ID: `0068d222-a2af-437b-8f51-99a36e73074a`
  - Firebase project metadata: `med-test-7a252`
  - `web.output`: `single`
- `eas.json` profiles:
  - `development`: internal, development client.
  - `preview`: internal Android APK.
  - `production`: store build, Android AAB.
- `EAS_BUILD_NO_EXPO_GO_WARNING=true` is set on all profiles to suppress Expo Go production warning.
- Expo project notes:
  - Active Expo project: `@caelynphillips.ux/med-app`
  - Older accidental project: `@caelynphillips.ux/med-organizer`, project ID `140c74d8-6164-4cdb-9fd6-7f6ad69d3a8c`
  - The active repo/app config now points to `med-app`, not `med-organizer`.

### Codex usage

Codex has been used to:

- Create the original app idea Markdown file.
- Build the browser web app.
- Integrate Firebase Auth/Firestore/Storage.
- Add UI color and layout changes.
- Add medication autocomplete and RxTerms-based data.
- Add Electron desktop app scaffolding.
- Add SwiftUI iOS source.
- Add root Expo/EAS build setup.
- Push commits to GitHub.
- Debug EAS build failures and Expo Go startup issues.

### Important dependencies and commands

Root scripts:

```powershell
npm run web
npm start
npm run eas:build
npm run eas:build:ios
npm run eas:build:android
npm run desktop:sync
npm run desktop
npm run desktop:build
npm run desktop:dist
npm run rxterms:import
```

Web app:

```powershell
npm run web
```

Expo Go:

```powershell
npx.cmd expo start --tunnel
```

EAS Android preview APK:

```powershell
npm run eas:build:android -- --profile preview
```

EAS Android production AAB:

```powershell
npm run eas:build:android -- --profile production
```

## 3. App Structure

### Folder structure

```text
med test app/
  index.html
  firebaseConfig.js
  firestore.rules
  storage.rules
  package.json
  app.json
  eas.json
  App.js
  EAS_BUILD.md
  TEAM_RUNBOOK.md
  PROJECT_HANDOFF_SUMMARY.md
  src/
    app.js
    styles.css
    medications.json
    rxterms.js
  scripts/
    serve-web.mjs
    import-rxterms.mjs
  shared/
    app-constants.json
    schema/
      medication.schema.json
      medication-suggestion.schema.json
      dose-status.schema.json
    types/
      medication.ts
    medication-data/
      medications.json
  apps/
    web/
      README.md
    desktop/
      package.json
      electron/
        main.cjs
        preload.cjs
      scripts/
        sync-renderer.mjs
    ios/
      README.md
      project.yml
      MedOrganizer/
        MedOrganizer/
          Models/
          Services/
          Theme/
          ViewModels/
          Views/
          Resources/
```

### Key screens

Web app screens/views are rendered from `src/app.js`:

- Signed-out landing/auth screen with sample schedule preview and Google sign-in.
- Today dashboard:
  - Date header.
  - Stats: total doses, marked taken, next dose.
  - Dose cards sorted by time.
  - Reminder summary.
  - Notes summary.
  - Medical disclaimer.
- Medication list.
- Medication detail page.
- Add medication form.
- Edit medication form.
- Reminder cards page.

SwiftUI iOS source includes matching views:

- `SignInView.swift`
- `TodayView.swift`
- `MedicationListView.swift`
- `MedicationDetailView.swift`
- `MedicationFormView.swift`
- `RemindersView.swift`
- `RootView.swift`

Expo root `App.js` is not the full app. It is a build-ready shell showing:

- Header.
- EAS build shell message.
- Firebase/backend note.
- Platform note.
- Medical disclaimer.

### Key components

The web app is not componentized into separate files yet. It uses render functions:

- `renderTopBar`
- `renderSignedOutApp`
- `renderSignedInApp`
- `renderNavigation`
- `renderDashboard`
- `renderDoseCard`
- `renderMedicationList`
- `renderMedicationCard`
- `renderMedicationDetail`
- `renderMedicationForm`
- `renderDosageSuggestions`
- `renderUseSuggestions`
- `renderSelectedUseChips`
- `renderReminders`
- `renderReminderCard`
- `renderReminderSummary`
- `renderNotesSummary`

### Important utilities/services

Web:

- `firebaseConfig.js`: initializes Firebase app.
- `src/app.js`: Auth, Firestore, Storage, state, render logic, interactions.
- `src/rxterms.js`: RxTerms fetch, transform, normalization, merge/dedupe.
- `scripts/serve-web.mjs`: local static server for root web app.
- `scripts/import-rxterms.mjs`: fetches RxTerms data and merges it into `src/medications.json`.

Electron:

- `apps/desktop/electron/main.cjs`: Electron main process, local renderer HTTP server, CSP, navigation/auth allowlist.
- `apps/desktop/electron/preload.cjs`: preload bridge.
- `apps/desktop/scripts/sync-renderer.mjs`: copies root `index.html`, `firebaseConfig.js`, and `src/` into `apps/desktop/renderer`.

iOS:

- `AppViewModel.swift`: observes user meds/statuses and handles save/delete/mark dose.
- `MedicationRepository.swift`: Firestore reads/writes.
- `StorageService.swift`: Storage upload.
- `AuthService.swift`: Firebase/Google sign-in.
- `MedicationSuggestionService.swift`: bundled local suggestion data.
- `DateHelpers.swift`: date/time helpers.

Shared:

- `shared/schema/*.json`: cross-client data contracts.
- `shared/types/medication.ts`: TypeScript types for the data model.
- `shared/app-constants.json`: shared constants, default slots, statuses, disclaimer.

### Data flow

1. User opens app.
2. Firebase Auth checks current auth state.
3. If signed out, app shows sign-in screen.
4. If signed in:
   - `ensureSampleData(user)` seeds sample medications once if needed.
   - `subscribeToMedications(uid)` listens to `users/{uid}/medications`.
   - `subscribeToDoseStatus(uid)` listens to `users/{uid}/doseStatus/{todayKey}`.
5. UI renders from `state.meds` and `state.statuses`.
6. Add/edit form saves Firestore medication document.
7. Attachment upload saves file to Firebase Storage, then stores metadata on medication document.
8. Dose buttons update nested keys in the daily dose status document.
9. Firestore listeners refresh UI in real time.

### Routing/navigation structure

The web app uses manual view state, not URL routing:

- `state.view`
- Stored in local storage as `medOrganizerView`
- Views include:
  - `dashboard`
  - `medications`
  - `reminders`
  - `add`
  - `detail`
- `state.selectedMedId` determines which medication detail/edit page is active.
- `state.editMode` controls whether detail view shows the detail screen or form.

Electron loads the web app with:

```text
index.html?client=desktop
```

The query parameter sets `updatedFrom` to `desktop`.

Expo root has no navigation yet.

## 4. Medication System

### How medications are stored

Medication documents are stored per user:

```text
users/{uid}/medications/{medicationId}
```

Daily dose status is stored per user per date:

```text
users/{uid}/doseStatus/{yyyy-mm-dd}
```

Each dose key is:

```text
{medicationId}_{slotId}
```

Attachments are stored at:

```text
users/{uid}/medications/{medicationId}/{timestamp}-{safeFileName}
```

### Current medication schema

Current intended medication fields:

```json
{
  "schemaVersion": 1,
  "ownerId": "firebase-user-id",
  "name": "Lisinopril",
  "genericName": "Lisinopril",
  "category": "prescription",
  "purpose": "blood pressure",
  "dosage": "10 mg",
  "timesPerDay": 1,
  "schedule": [
    {
      "id": "morning",
      "label": "Morning",
      "time": "08:00"
    }
  ],
  "intake": "water",
  "foodInstructions": "May be taken with or without food. Take with water.",
  "notes": "Check blood pressure regularly.",
  "reminder": {
    "enabled": true,
    "leadMinutes": 15
  },
  "attachment": {
    "name": "label.jpg",
    "path": "users/{uid}/medications/{medicationId}/...",
    "url": "download-url",
    "contentType": "image/jpeg",
    "uploadedAt": "iso-date"
  },
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp",
  "updatedBy": "uid",
  "updatedFrom": "web"
}
```

Required by schema:

- `schemaVersion`
- `ownerId`
- `name`
- `category`
- `purpose`
- `dosage`
- `timesPerDay`
- `schedule`
- `intake`

Valid categories:

- `prescription`
- `over-the-counter`
- `vitamin`
- `supplement`

Valid intake values:

- `food`
- `water`
- `empty`

Persisted dose statuses:

- `taken`
- `skipped`
- `missed`

Computed statuses:

- `due`
- `auto-missed`

### Autocomplete implementation

Autocomplete is implemented in `src/app.js` and `src/rxterms.js`.

When the user types in the `Name` field:

- Local JSON is searched first.
- Results are ranked:
  - exact match
  - starts-with match
  - broader includes match
- Search fields:
  - `name`
  - `genericName`
  - `brandNames`
  - `strengthsAndForms`
  - `commonUses`
- If local results are sparse, live RxTerms fallback is scheduled.
- Live RxTerms search is debounced by 350ms.
- Live RxTerms results are cached for the session in `liveRxTermsCache`.
- Results are merged and deduped by medication name.

Accessibility:

- Autocomplete list uses `role="listbox"`/`role="option"` behavior.
- Keyboard handling exists for ArrowDown, ArrowUp, Enter, Escape.
- Active option updates `aria-activedescendant`.

### RxTerms integration

`src/rxterms.js` exposes:

- `RXTERMS_SEARCH_URL`
- `fetchRxTermsSuggestions`
- `transformRxTermsResponse`
- `normalizeMedicationEntry`
- `mergeMedicationEntries`
- `normalizeCategory`
- `displayCategory`

RxTerms data is transformed into app-friendly entries:

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

Important UI decision:

- Source labels such as `RxTerms` and `Local` are intentionally not shown to the user.
- Dosage options are presented as regular selectable dosage chips, not as medical recommendations.

### Local JSON structure

Main web local data:

```text
src/medications.json
```

Shared copy:

```text
shared/medication-data/medications.json
```

iOS bundled copy:

```text
apps/ios/MedOrganizer/MedOrganizer/Resources/medications.json
```

Entry structure:

```json
{
  "name": "Acetaminophen",
  "genericName": "Acetaminophen",
  "brandNames": ["Tylenol"],
  "category": "Over-the-counter",
  "rxTermsName": "Acetaminophen",
  "strengthsAndForms": ["325 MG Oral Tablet", "500 MG Oral Tablet"],
  "commonUses": ["for pain", "for fever"],
  "foodInstructions": "May be taken with or without food. Take with water.",
  "source": "RxTerms",
  "lastUpdated": "2026-05-20"
}
```

### Dosage handling

- The dosage field is always directly editable.
- Placeholder requested by user: `eg. 10 mg Tab`.
- If selected medication has `strengthsAndForms`, chips appear below the dosage input.
- Clicking a dosage chip fills the dosage field.
- User can manually overwrite the dosage at any time.
- The separate "Enter custom dosage" button was removed.
- Dosage suggestions must not be represented as dosage recommendations.

### Common uses behavior

- Field label: `Common uses / purpose`.
- Current field stores comma-separated text in the `purpose` property.
- Placeholder requested by user:

```text
Add a purpose or select common uses, e.g. blood pressure
```

- If selected medication has `commonUses`, chips appear below the input.
- Clicking a common-use chip appends it to the input with comma separation.
- Duplicates are prevented by normalized text comparison.
- Existing comma-separated values render as selected-use chips.
- Hovering/focusing a selected-use chip reveals an `x` button.
- Clicking `x` removes only that use.
- The field remains fully manually editable.

### Food instructions behavior

- UI label was changed from `Food instructions` to `Instructions`.
- Placeholder requested by user:

```text
Add instructions, e.g. take with food, before bed, avoid alcohol
```

- If a selected medication has `foodInstructions`, it prefills the instructions field.
- If no instructions exist, the field remains blank and editable.
- The app also has a separate radio section called `How it should be taken` with options:
  - Take with food
  - Take with water
  - Take on an empty stomach
- `intakeFromFoodInstructions` guesses intake from instructions when a suggestion is selected.

### Known limitations

- `genericName` still exists in code and data model, but it is not meant to be visible/required in the UI.
- The web form may still write `genericName` internally when selecting a medication.
- Local medication data is small and curated. Live RxTerms fallback improves coverage but depends on network access.
- Common uses are curated local values; RxTerms does not provide user-friendly purpose labels.
- RxTerms strengths/forms are not personal dosage instructions.
- No drug interaction checking exists.
- No real medication adherence notification scheduling exists in the web app.
- `auto-missed` is computed locally based on current device time and a 30-minute threshold.
- Timezone handling is local-device only.

## 5. Current UI/UX Decisions

### Color palette and visual style

Current palette is Material Design 3-inspired, calm, herbal/medical, and readable:

| Role | Hex |
|---|---|
| Primary sage | `#7A9D8E` |
| Secondary moss | `#5F7D73` |
| Background calm blue | `#EAF7F6` |
| Surface/cards beachside green | `#6CA692` |
| Accent dusty golden honey | `#C9A66B` |
| Soft alert terracotta clay | `#C97B63` |
| Text dark olive-charcoal | `#3F463F` |
| Light panel tint | `#CCF0ED` |

CSS variables live in `src/styles.css`.

Visual decisions:

- Cards use `#6CA692`.
- App background uses `#EAF7F6`.
- Google sign-in/auth card uses `#CCF0ED`.
- Category chips were changed to golden account-chip styling.
- Information detail chips/cards use the softer prior chip color.
- The "Open details" action on schedule cards is dark text at the bottom right with no highlighted pill.
- Primary font sizing was reduced by request; root font is `14px`.
- Rounded cards use `8px` radius, with pill controls using `999px`.

### Layout structure

- Top app bar with brand, user pill, and sign-out/sign-in action.
- Signed-in shell uses side nav rail plus main content.
- Dashboard uses a two-column layout on desktop:
  - Main schedule column.
  - Side stack for disclaimer, reminders, notes.
- Medication detail page uses:
  - Main detail card.
  - Schedule card.
  - Attachment card.
- Add/edit form uses a clean stacked top layout:
  - Name
  - Common uses / purpose
  - Category
- Form then continues with dosage, frequency, schedule, intake/instructions, reminders, notes, attachment, actions.
- Responsive breakpoints collapse layout to one column on tablet/mobile.

### Interaction patterns

- Side navigation buttons switch views.
- Add/edit actions are buttons, not URL routes.
- Dose statuses use segmented pill buttons.
- Details actions use buttons:
  - Back
  - Edit
  - Delete
- Add/edit form has both Save and Cancel/Exit actions at the bottom.
- Autocomplete dropdown supports mouse/touch and keyboard navigation.
- Toasts show success/error messages.

### Form behavior

- Required fields:
  - Name
  - Purpose
  - Dosage
  - At least one schedule time
- Schedule defaults to Morning for new meds.
- Times per day defaults to selected schedule count if not filled.
- Attachments upload after medication save so a medication ID exists.
- Existing attachment stays unless removed/replaced.
- Cancel behavior:
  - If editing existing med, returns to detail view.
  - If adding new med, returns to medication list.

### Chip/card interactions

- Dosage chips fill the dosage input.
- Common-use chips append to purpose input.
- Selected common uses render as removable chips.
- Remove button appears on hover/focus for selected use chips.
- Status chips show dose state.
- Category chips use accent/golden color.

### Accessibility considerations

- Large controls: many buttons/inputs use `min-height: 44px` or more.
- Clear labels on fields.
- Keyboard navigation in autocomplete.
- `aria-current` on nav.
- `aria-live`/status usage for loading/toasts.
- Focus outlines on form controls/chips.
- Reduced motion media query exists.
- Layout is responsive.

### Mobile responsiveness decisions

- Top bar stacks on narrow screens.
- Side nav becomes a top-ish compact rail with hidden text labels.
- Grids collapse to one column under mobile widths.
- Buttons flex to fit and avoid overlap.
- Schedule cards switch from time-column layout to stacked layout.

## 6. Features Already Implemented

- Original app idea saved in `my idea.md`.
- Browser web app with Firebase-backed medication organizer UI.
- Google sign-in through Firebase Auth.
- Signed-out landing/auth screen with sample schedule preview.
- Signed-in dashboard.
- New-user sample medication seeding.
- Firestore real-time subscription for medications.
- Firestore real-time subscription for today's dose statuses.
- Medication CRUD:
  - Add
  - View detail
  - Edit
  - Delete
- Medication form fields:
  - Name
  - Category
  - Common uses/purpose
  - Dosage
  - Times per day
  - Specific schedule slots and times
  - Intake mode
  - Instructions
  - Reminder enabled/lead time
  - Notes
  - Attachment upload
- Today schedule sorted by time.
- Dose status controls:
  - Taken
  - Skipped
  - Missed
- Computed auto-missed/past-due display.
- Medication detail page.
- Back button on detail page.
- Bottom cancel/exit action in add/edit form.
- In-app reminder-style cards.
- Medical disclaimer in the app.
- Firebase Storage attachment upload.
- Attachment removal.
- Local medication autocomplete data.
- RxTerms transform utility.
- Live RxTerms fallback with debounce/cache.
- Dosage suggestion chips.
- Common-use suggestion chips.
- Removable selected common-use chips.
- Instructions placeholder and label updated by request.
- Material Design 3-inspired CSS and custom palette.
- Responsive web layout.
- Firebase rules files:
  - `firestore.rules`
  - `storage.rules`
- Team runbook.
- Shared schema files.
- Shared TypeScript data types.
- Electron desktop app:
  - Local renderer server.
  - CSP.
  - OAuth/navigation allowlist.
  - Renderer sync script.
  - Packaging config through `electron-builder`.
- Native SwiftUI iOS source:
  - Models.
  - Services.
  - View model.
  - Views.
  - Theme.
  - Resource medication JSON.
  - XcodeGen project file.
- Expo/EAS root app setup:
  - `App.js`
  - `app.json`
  - `eas.json`
  - `.easignore`
  - `EAS_BUILD.md`
- EAS project link fixed:
  - active project ID `0068d222-a2af-437b-8f51-99a36e73074a`
- EAS Android production build issue fixed:
  - project ID mismatch resolved.
- Expo web output fixed:
  - `web.output` changed from `static` to `single`.
- Expo Go tunnel helper added:
  - `@expo/ngrok`
  - `tsconfig.json`
  - `.expo` ignored.
- GitHub repository initialized and pushed.

## 7. Features In Progress

- Full native/Expo mobile app:
  - The root Expo app is currently only a build shell, not the full organizer.
  - To make Expo Go show the real app, the web UI must be ported to React Native/Expo or wrapped intentionally.
- SwiftUI iOS app:
  - Source exists.
  - Needs macOS/Xcode verification.
  - Needs real Firebase iOS `GoogleService-Info.plist`.
  - Needs Google URL scheme setup.
  - Needs build/test on simulator/device.
- Electron desktop app:
  - App can run using synced web renderer.
  - Needs packaged build testing, signing, app icons, installer polish.
  - Google sign-in should be tested in packaged desktop app.
- Cross-client sync:
  - Data model is aligned.
  - Web is live.
  - Desktop and iOS need end-to-end smoke testing against the same Firebase account.
- Real reminders/notifications:
  - Only in-app reminder cards exist.
  - Browser notifications, desktop notifications, and iOS local notifications are not implemented.
- Team/caregiver sharing:
  - Not implemented.
  - Current model is per user only.

## 8. Bugs / Problems / Technical Debt

### Current bugs or likely issues

- Expo root app is only a shell, so Expo Go/EAS mobile does not yet show the full medication organizer.
- The full browser app and Expo app are separate experiences right now.
- The iOS app cannot be built on the current Windows machine.
- `genericName` still exists internally, though the UI requirement says it should not be displayed or required.
- Some docs may refer to old Expo initialization instructions; current active project is `med-app`, not `med-organizer`.
- `my idea.md` contains mojibake smart quote characters from earlier encoding.
- `expo-doctor` recently reported that `.expo` was not ignored even though `git check-ignore` confirmed it was ignored. This may be a Doctor/cache/path quirk and should be rechecked later.
- `npm audit --omit=dev` recently reported moderate vulnerabilities in Expo toolchain dependencies after adding tunnel support. Do not run `npm audit fix --force` casually because npm suggested a breaking downgrade path. Review Expo dependency guidance first.

### UI inconsistencies

- The web UI is polished, but the Expo shell UI is only a placeholder.
- Desktop app mirrors web only after running `npm run desktop:sync`; otherwise it can fall behind.
- SwiftUI iOS styling may not perfectly match the web palette until tested visually.
- Some labels in data/code still say `foodInstructions` while UI says `Instructions`.

### Architectural concerns

- Web app logic is concentrated in one large `src/app.js` file.
- Rendering is manual string templates; hard to scale and test.
- Firebase operations, state, render, and event handling are tightly coupled.
- Medication suggestion data exists in multiple copies:
  - `src/medications.json`
  - `shared/medication-data/medications.json`
  - iOS resources
  These can drift unless a sync script is added.
- No automated tests exist yet.
- No Firestore rules tests exist yet.
- No formal migration system exists beyond `schemaVersion`.
- No shared service modules for web/desktop yet.

### Performance issues

- Current data size is small, so performance is fine.
- Manual full re-render on every state update could become costly with large medication lists.
- Live RxTerms fallback is debounced and cached, but still network-dependent.
- Firestore listeners are per-current-user and should scale reasonably for personal use.

### Anything Codex struggled with

- Git and npm were initially not available on PATH from the user's shell.
- Electron binary download failed once and required retry/fix.
- Firebase OAuth needed authorized domain setup for `127.0.0.1`.
- Firestore writes failed until rules were explained.
- Expo/EAS initially linked the wrong project ID.
- Expo website build ran under `@caelynphillips.ux/med-app`, while local config pointed to `med-organizer`; fixed by updating `app.json`.
- Expo web output initially used `static`, which required `expo-router`; fixed by changing to `single`.
- Expo tunnel mode had trouble finding globally installed `@expo/ngrok`; fixed by installing `@expo/ngrok` in the project dev dependencies.
- In-app browser automation was blocked by a trust/native-pipe issue, so opening the web app used `Start-Process` instead.

### Areas needing cleanup/refactoring

- Split `src/app.js` into:
  - `authService.js`
  - `medicationRepository.js`
  - `storageService.js`
  - `suggestionService.js`
  - `scheduleUtils.js`
  - `render/*` or a real UI framework.
- Add tests for:
  - RxTerms transform.
  - medication search ranking.
  - common use parsing/removal.
  - dose status key/date behavior.
- Add a single source of truth for medication suggestion JSON.
- Decide whether Expo is the actual mobile path or just an EAS experiment.
- If Expo becomes the mobile path, port the app to React Native properly.
- If SwiftUI remains the mobile path, keep Expo shell separate or remove it later to avoid confusion.

## 9. Pending Ideas / Planned Features

- Full React Native/Expo implementation of the medication organizer.
- Complete and verify native SwiftUI iOS app.
- Real local notifications:
  - Browser notifications.
  - Desktop notifications.
  - iOS local notifications.
- Firebase Hosting deployment for the web app.
- Desktop app signing and installers.
- iOS TestFlight setup.
- App icons and launch screens.
- Offline persistence and offline write queue.
- Data export.
- Account deletion flow.
- Privacy policy and support contact.
- Caregiver/team sharing:
  - groups/care teams
  - invitations
  - roles
  - audit history
  - stricter security rules
- Medication list sharing between family members.
- Drug interaction warnings, only if backed by an appropriate source and disclaimer.
- Refill tracking.
- Refill reminders.
- Calendar view.
- Medication history/adherence analytics.
- Search/filter medication list.
- Better attachment previews.
- Camera capture for label photo.
- Scanner import on desktop.
- DailyMed/openFDA/RxNorm expansion later.
- App Check and abuse protection.
- Crash/error reporting with sensitive-data filtering.
- Firestore security rules test suite.

## 10. Important Prompts and Decisions

### Important user prompts

Initial app idea:

```text
Build a medication and vitamin organizer app.
```

Core requested fields:

- Name
- Category
- Purpose in user's own words
- Dosage
- Times per day
- Specific times of day
- Food/water/empty stomach instructions
- Notes

Important feature prompts:

- Use Firebase for database, storage, and authentication.
- Add Google sign-in.
- Use Material Design 3 UI design system.
- Add a calm accessible color palette.
- Add smart medication autocomplete and autofill.
- Use RxTerms as a source but store cleaned data locally.
- Preserve app structure; do not rebuild from scratch.
- Remove visible `Generic name`.
- Remove visible RxTerms/source labels.
- Keep dosage suggestions as normal chips.
- Always keep dosage and purpose editable.
- Add removable comma-separated common-use chips.
- Rename `Food instructions` to `Instructions`.
- Add cancel/exit near Save.
- Build plan for Electron desktop and Swift iOS.
- Set up Expo/EAS builds from GitHub.

### Architectural decisions

- Firebase remains the shared backend for all app versions.
- Data is per-user under `users/{uid}`.
- Team/caregiver sharing is intentionally deferred.
- The web app remains at repo root to preserve current local browser workflow.
- Electron uses the existing web app renderer instead of a separate desktop UI.
- SwiftUI iOS source was added as a native path.
- Expo/EAS setup was added at root for cloud mobile builds, but it is not yet the full mobile app.
- Medication autocomplete uses local JSON first for speed and reliability.
- Live RxTerms fallback is optional and debounced.
- RxTerms/source labels are kept in data but hidden from users.
- Dosage suggestions are reference options only, not medical advice.

### Design reasoning

- Calm green/blue palette to make the app feel medical-adjacent without feeling clinical or alarming.
- Large buttons and clear labels for accessibility.
- Simple navigation: Today, Medications, Reminders.
- Dashboard prioritizes today's schedule.
- Detail page emphasizes purpose clearly.
- Disclaimer stays general, not embedded in every dosage section.
- Cards use a consistent rounded Material-like style.

### API decisions

- Firebase Web SDK CDN imports are used for the static web app.
- Firestore uses real-time listeners rather than one-time fetches.
- Storage stores files under the user's own path.
- RxTerms API is not called on every keystroke by default.
- RxTerms live fallback only runs when local results are sparse.
- EAS project ID must match the Expo website project:
  - active ID: `0068d222-a2af-437b-8f51-99a36e73074a`

### Why certain approaches were chosen

- Static web app: fastest way to build and iterate.
- Firebase: works across web, desktop, and iOS with shared auth/data/storage.
- Electron: lets desktop reuse the existing web UI.
- SwiftUI: best long-term native iOS quality.
- Expo/EAS shell: makes GitHub-connected cloud builds possible quickly, but needs a real React Native implementation to become the production mobile app.

## 11. Recommended Next Steps

### Priority 1: Decide mobile direction

Choose one primary mobile path:

1. React Native/Expo mobile app
2. Native SwiftUI iOS app

Recommendation:

- If the goal is fast Android/iOS mobile with one codebase, port the full organizer to Expo/React Native.
- If the goal is premium iOS only first, continue SwiftUI and treat Expo shell as build experimentation.

### Priority 2: Refactor the web app into modules

Split `src/app.js` into smaller services and UI files:

- Firebase/auth service.
- Medication repository.
- Storage service.
- Suggestion service.
- Schedule/date helpers.
- UI render modules or a framework migration.

This will make future desktop/mobile reuse easier.

### Priority 3: Stabilize shared data and tests

Add tests for:

- `src/rxterms.js`
- medication suggestion ranking.
- common-use chip parsing/removal.
- date key generation.
- dose status persistence.
- Firestore schema fixtures.

Add a script to sync medication data copies across:

- `src/medications.json`
- `shared/medication-data/medications.json`
- iOS resources.

### Priority 4: Finish Firebase operational setup

- Confirm Firestore rules are published.
- Confirm Storage rules are published.
- Confirm Firebase Auth authorized domains:
  - `127.0.0.1`
  - deployed web domain later.
- Consider App Check before public launch.
- Add privacy policy, support email, and data deletion/export plan.

### Priority 5: Make desktop production-ready

- Run `npm run desktop:sync` after web changes.
- Test Google sign-in in packaged desktop.
- Add app icon.
- Test Windows installer.
- Add signing plan.
- Add update strategy.

### Priority 6: Complete mobile app

If using Expo:

- Replace root `App.js` shell with full organizer screens.
- Add Firebase JS SDK or React Native Firebase equivalents.
- Recreate Today, Medications, Detail, Add/Edit, Reminders.
- Reuse shared schema and local medication data.
- Test with Expo Go where possible.
- Use EAS preview APK for Android device testing.

If using SwiftUI:

- Move to a Mac.
- Add iOS app in Firebase.
- Add real `GoogleService-Info.plist`.
- Generate/open Xcode project.
- Fix Google URL scheme.
- Build and test on simulator/device.
- Validate Firestore sync with web.

### Priority 7: Run cross-client smoke tests

Use the same Google account:

1. Add medication on web.
2. Confirm it appears on desktop.
3. Mark a dose on desktop.
4. Confirm web sees the status.
5. Add/edit/delete on iOS or Expo mobile once implemented.
6. Confirm all clients stay in sync.

### Priority 8: Prepare for real release

- Deploy web to Firebase Hosting or another host.
- Create preview and production EAS builds.
- Use preview APK for direct Android install.
- Use production AAB only for Google Play Console.
- Set up TestFlight if using iOS.
- Finalize disclaimer, privacy policy, and support flow.

### Priority 9: Add team/caregiver sharing only after personal sync works

Do not loosen current per-user Firebase rules. Add a separate sharing model:

```text
careGroups/{groupId}
  members/{uid}
  medications/{medicationId}
  doseStatus/{yyyy-mm-dd}
```

Add roles:

- owner
- editor
- viewer
- caregiver

Then update UI and rules together.

