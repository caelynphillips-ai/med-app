# Firebase Setup

Firebase project:

```text
med-test-7a252
```

If the app says `missing or insufficient permissions`, Firebase is denying the Firestore or Storage request. Publish the checked-in rules exactly from:

```text
firestore.rules
storage.rules
```

## Firestore

Firebase Console -> Firestore Database -> Rules.

The rules keep data isolated under each signed-in user:

```text
users/{uid}/medications/{medicationId}
users/{uid}/doseStatus/{yyyy-mm-dd}
users/{uid}/appMeta/settings
```

The rules also restrict medication documents to the known app fields and known client values: `web`, `desktop`, and `ios`.

## Storage

Firebase Console -> Storage -> Rules.

Attachments are limited to this path:

```text
users/{uid}/medications/{medicationId}/{fileName}
```

Only the matching signed-in user can read, upload, update, or delete files in their path. Uploads are limited to images, PDFs, or fallback `application/octet-stream` files under 10 MB.

## Auth Providers

Enable:

- Google sign-in for the browser and desktop app
- Anonymous sign-in for temporary Expo mobile Preview mode

Native iOS/Android Google sign-in is not implemented yet. See `apps/mobile/services/GOOGLE_AUTH_SETUP.md` before removing Preview mode.

## After Publishing Rules

Refresh the app, sign in again if needed, and test:

1. Add a medication.
2. Mark a dose taken.
3. Upload and remove an attachment.
4. Export data from Privacy.
