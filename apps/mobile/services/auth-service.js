import { Platform } from "react-native";
import { onAuthStateChanged, signInAnonymously, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "./firebase-client.js";

export function observeAuthState(onChange) {
  return onAuthStateChanged(auth, onChange);
}

export async function signInWithGoogle() {
  if (Platform.OS !== "web") {
    // TODO: Wire native Google auth here after iOS, Android, and Web OAuth client IDs are configured.
    throw new Error("Native Google sign-in needs iOS and Android OAuth client IDs before it can be enabled.");
  }
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
