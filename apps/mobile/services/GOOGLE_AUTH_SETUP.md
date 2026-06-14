# Native Google Auth Setup

This mobile app uses the same Firebase project, Firestore paths, Storage paths, and medication schema as the web app. Android Google sign-in uses `@react-native-google-signin/google-signin` to exchange a Google ID token for a Firebase credential.

## App Identifiers

- iOS bundle ID: `com.caelynphillips.medorganizer`
- Android package: `com.caelynphillips.medorganizer`
- Expo scheme: `medorganizer`

Keep these values aligned with `app.json`, Firebase, Google Cloud, and EAS. Changing them later usually requires new OAuth clients.

## Required OAuth Clients

Create or confirm these Google OAuth clients:

- iOS OAuth client ID for `com.caelynphillips.medorganizer`
- Android OAuth client ID for `com.caelynphillips.medorganizer`
- Web client ID for Firebase/AuthSession token exchange

Set the Web OAuth client ID as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in the EAS `development`, `preview`, and `production` environments. The client ID is public configuration, but placeholder or mismatched IDs must not be built into the app.

## Android Signing Fingerprints

The Android OAuth client must include the signing certificate fingerprints for the builds your team will test or ship:

- SHA-1 fingerprint
- SHA-256 fingerprint

Use the debug/dev-build fingerprint for local testing and the EAS/Play signing fingerprint for preview or production builds. If the wrong fingerprint is registered, Google sign-in may open but fail before Firebase account sync completes.

## Firebase Console Setup

In Firebase Console:

1. Open the `azur-well` project.
2. Go to Authentication > Sign-in method.
3. Enable the Google provider.
4. Add or confirm the iOS app with bundle ID `com.caelynphillips.medorganizer`.
5. Add or confirm the Android app with package `com.caelynphillips.medorganizer`.
6. Add the required Android SHA-1 and SHA-256 fingerprints.
7. Download `google-services.json` after adding the Android fingerprints.

The mobile app must keep using the existing user paths:

- `users/{uid}/medications/{medicationId}`
- `users/{uid}/doseStatus/{yyyy-mm-dd}`
- `users/{uid}/appMeta/settings`

## Google Cloud Setup

In Google Cloud Console:

1. Confirm the OAuth consent screen is configured.
2. Add test users if the consent screen is still in testing mode.
3. Confirm the iOS OAuth client uses the iOS bundle ID above.
4. Confirm the Android OAuth client uses the Android package and SHA fingerprints above.
5. Confirm the Web OAuth client is available for Firebase/AuthSession credential exchange.
6. Confirm the Web client ID used by `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` belongs to the `azur-well` project.

## EAS And Dev Build Notes

- Google sign-in requires an EAS development or preview build and does not run in Expo Go.
- Android preview builds need the same package name and matching SHA fingerprints registered in Firebase/Google Cloud.
- iOS builds need the same bundle ID and Apple team credentials used for the OAuth client.
- Keep preview mode available until real native Google auth is confirmed on physical devices.
- Upload the ignored `google-services.json` as an EAS file environment variable named `GOOGLE_SERVICES_JSON` for each Android build environment.

## Current Temporary Preview Mode

The current native preview path uses Firebase anonymous auth. It is intentionally temporary:

- It creates a Firebase user.
- It does not use the user's Google account.
- It does not sync with the same account as web Google sign-in.
- It remains available for testing the mobile screens, Firestore reads/writes, Storage behavior, and dose status updates without connecting a Google account.

When a Preview user signs in with a Google account that is not already used by Firebase, the anonymous account is linked in place so its data remains under the same UID. If the Google account already exists, Azur Well leaves the Preview account and its data untouched and explains that it cannot merge the accounts automatically.
