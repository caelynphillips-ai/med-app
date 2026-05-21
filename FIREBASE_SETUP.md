# Firebase Setup

If the app says `missing or insufficient permissions`, Firebase is denying the Firestore or Storage request. Publish these rules in the Firebase console.

## Firestore rules

Firebase Console -> Firestore Database -> Rules:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Storage rules

Firebase Console -> Storage -> Rules:

```js
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null
        && request.auth.uid == userId
        && (request.resource == null || request.resource.size < 10 * 1024 * 1024);
    }
  }
}
```

After publishing, refresh the app and try adding a medication again.
