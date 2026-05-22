import { Platform } from "react-native";
import { onAuthStateChanged, signInAnonymously, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "./firebase-client.js";

export function observeAuthState(onChange) {
  return onAuthStateChanged(auth, onChange);
}

export async function signInWithGoogle() {
  if (Platform.OS !== "web") {
    // TODO: Add iOS and Android Google OAuth client IDs before enabling real native account sync.
    throw new Error("Native Google sign-in needs iOS and Android OAuth client IDs before it can be enabled.");
  }
  googleProvider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, googleProvider);
}

export async function startFirebasePreviewSession() {
  return signInAnonymously(auth);
}

export async function signOutUser() {
  return signOut(auth);
}
