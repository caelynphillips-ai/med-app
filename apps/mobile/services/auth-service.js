import { onAuthStateChanged, signInAnonymously, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "./firebase-client";

export function observeAuthState(onChange) {
  return onAuthStateChanged(auth, onChange);
}

export async function signInWithGoogle() {
  googleProvider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, googleProvider);
}

export async function startFirebasePreviewSession() {
  // Temporary preview mode only. This creates an anonymous Firebase user and does not sync with a Google account.
  return signInAnonymously(auth);
}

export async function signOutUser() {
  return signOut(auth);
}
