import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import {
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signOut,
} from "firebase/auth";
import { auth } from "./firebase-client";

let configuredWebClientId = "";

export function observeAuthState(onChange) {
  return onAuthStateChanged(auth, onChange);
}

export async function signInWithGoogle() {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();

  if (!webClientId) {
    throw createAuthError(
      "auth/google-missing-web-client-id",
      "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not configured for this build.",
    );
  }

  configureGoogleSignin(webClientId);

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (isCancelledResponse(response)) {
      throw createAuthError("auth/google-sign-in-cancelled", "Google sign-in was canceled.");
    }

    const idToken = response.data?.idToken;
    if (!idToken) {
      throw createAuthError(
        "auth/google-missing-id-token",
        "Google did not return an ID token for Firebase.",
      );
    }

    const credential = GoogleAuthProvider.credential(idToken);
    const currentUser = auth.currentUser;

    if (currentUser?.isAnonymous) {
      try {
        return await linkWithCredential(currentUser, credential);
      } catch (error) {
        if (isExistingGoogleAccountError(error)) {
          await safelyClearGoogleSession();
          throw createAuthError(
            "auth/preview-google-account-exists",
            "This Google account already has an Azur Well account. Your Preview data is still safe and was not deleted or moved.",
            error,
          );
        }
        throw error;
      }
    }

    return signInWithCredential(auth, credential);
  } catch (error) {
    throw normalizeGoogleSignInError(error);
  }
}

export async function startFirebasePreviewSession() {
  return signInAnonymously(auth);
}

export async function signOutUser() {
  await safelyClearGoogleSession();
  return signOut(auth);
}

function configureGoogleSignin(webClientId) {
  if (configuredWebClientId === webClientId) {
    return;
  }

  GoogleSignin.configure({
    webClientId,
    offlineAccess: false,
  });
  configuredWebClientId = webClientId;
}

function isExistingGoogleAccountError(error) {
  return [
    "auth/account-exists-with-different-credential",
    "auth/credential-already-in-use",
    "auth/email-already-in-use",
    "auth/provider-already-linked",
  ].includes(error?.code);
}

function normalizeGoogleSignInError(error) {
  if (error?.code?.startsWith("auth/google-") || error?.code === "auth/preview-google-account-exists") {
    return error;
  }

  if (
    [
      "auth/invalid-credential",
      "auth/invalid-id-token",
      "auth/invalid-oauth-client-id",
    ].includes(error?.code)
  ) {
    return createAuthError(
      "auth/google-configuration-mismatch",
      "Firebase rejected the Google credential for this Android build.",
      error,
    );
  }

  if (isErrorWithCode(error)) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return createAuthError("auth/google-sign-in-cancelled", "Google sign-in was canceled.", error);
    }
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return createAuthError(
        "auth/google-play-services-unavailable",
        "Google Play services are unavailable or need an update.",
        error,
      );
    }
    if (error.code === statusCodes.IN_PROGRESS) {
      return createAuthError(
        "auth/google-sign-in-in-progress",
        "Google sign-in is already open.",
        error,
      );
    }
  }

  const message = error?.message || String(error || "");
  if (
    error?.code === "DEVELOPER_ERROR"
    || String(error?.code) === "10"
    || /DEVELOPER_ERROR|ApiException:\s*10|code:\s*10/i.test(message)
  ) {
    return createAuthError(
      "auth/google-configuration-mismatch",
      "Google could not verify this Android build.",
      error,
    );
  }
  if (
    error?.code === "auth/network-request-failed"
    || error?.code === "NETWORK_ERROR"
    || /NETWORK_ERROR|network request failed|unable to resolve host|timeout/i.test(message)
  ) {
    return createAuthError(
      "auth/google-network-request-failed",
      "Google sign-in could not reach the network.",
      error,
    );
  }

  return error;
}

async function safelyClearGoogleSession() {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Firebase sign-out and Preview mode must still work if Google has no cached session.
  }
}

function createAuthError(code, message, cause) {
  const error = new Error(message);
  error.code = code;
  if (cause) {
    error.cause = cause;
  }
  return error;
}
