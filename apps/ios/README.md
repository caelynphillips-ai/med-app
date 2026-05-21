# Med Organizer iOS

This is the native SwiftUI iOS client for Med Organizer. It uses the same Firebase backend as the browser and Electron apps:

- Firebase Authentication with Google sign-in
- Firestore at `users/{uid}/medications` and `users/{uid}/doseStatus/{yyyy-mm-dd}`
- Firebase Storage at `users/{uid}/medications/{medicationId}`
- The same bundled medication suggestion JSON

## What You Need On A Mac

1. Open the Firebase Console for project `med-test-7a252`.
2. Add an iOS app with bundle id `com.medorganizer.ios`.
3. Download `GoogleService-Info.plist`.
4. Put it in:

```text
apps/ios/MedOrganizer/MedOrganizer/GoogleService-Info.plist
```

5. Install XcodeGen if you want to generate the Xcode project from `project.yml`:

```bash
brew install xcodegen
cd apps/ios
xcodegen generate
open MedOrganizer.xcodeproj
```

6. In Xcode, confirm the Google URL scheme from `GoogleService-Info.plist` is present in the app target URL Types.

The web Firebase config cannot replace `GoogleService-Info.plist`; iOS apps need their own Firebase client config from the same Firebase project.

## Shared Behavior

The iOS app intentionally mirrors the web app:

- Today schedule
- Medication list
- Add/edit medication
- Medication detail
- Dose status buttons: taken, skipped, missed
- Medication autocomplete from local JSON
- Dosage and common-use chips
- Editable instructions and notes
- Optional photo attachment upload to Firebase Storage

The required disclaimer is shown in the app:

```text
This app is for personal organization only and does not provide medical advice. Confirm medication details with the prescription label, doctor, or pharmacist.
```
