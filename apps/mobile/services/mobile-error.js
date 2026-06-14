export function describeMobileError(error, action = "Action") {
  const code = error?.code || "";
  const message = error?.message || String(error || "Something went wrong.");

  if (code === "auth/google-missing-web-client-id") {
    return "Google sign-in is missing its Web OAuth client ID. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to the EAS environment and rebuild the app.";
  }

  if (code === "auth/google-configuration-mismatch" || code === "auth/google-missing-id-token") {
    return "Google could not verify this Android build. Confirm the package name, Web OAuth client ID, SHA fingerprints, and google-services.json for the azur-well Firebase project, then rebuild.";
  }

  if (code === "auth/google-play-services-unavailable") {
    return "Google Play services are unavailable or out of date on this device. Update Google Play services and try again.";
  }

  if (code === "auth/google-sign-in-in-progress") {
    return "Google sign-in is already open. Finish or close it before trying again.";
  }

  if (code === "auth/google-network-request-failed") {
    return "Google sign-in could not reach Google or Firebase. Check the connection and try again.";
  }

  if (
    code === "auth/preview-google-account-exists"
    || code === "auth/credential-already-in-use"
    || code === "auth/provider-already-linked"
  ) {
    return "This Google account already has an Azur Well account. Your Preview data is still safe on this device and was not deleted or moved. Sign out only when you are ready to use the existing Google account without the Preview data.";
  }

  if (code === "auth/account-exists-with-different-credential" || code === "auth/email-already-in-use") {
    return "That email already belongs to an Azur Well account with another sign-in method. Your current data was not changed.";
  }

  if (code === "auth/operation-not-allowed" && /google/i.test(action)) {
    return "Google sign-in is not enabled for this Firebase project. Enable the Google provider in Firebase Authentication and rebuild if configuration changed.";
  }

  if (code === "auth/admin-restricted-operation" || code === "auth/operation-not-allowed") {
    return `Preview mode could not start because Firebase Anonymous sign-in is not enabled. Firebase returned ${code}: ${message}. In Firebase Console, enable Authentication > Sign-in method > Anonymous.`;
  }

  if (code === "permission-denied" || /missing or insufficient permissions/i.test(message)) {
    return `${action} was blocked by Firebase permissions. Firebase returned ${code || "permission-denied"}: ${message}. Make sure you are signed in with Preview mode and that Firestore rules allow this account to read and write its own user data.`;
  }

  if (code === "unauthenticated") {
    return `${action} needs an active Firebase session. Firebase returned ${code}: ${message}. Sign in with Google or use Preview mode before saving or syncing medications.`;
  }

  if (code === "auth/requires-recent-login") {
    return "For safety, Firebase needs a fresh sign-in before deleting this account. Sign out, sign back in, then try deleting the account again.";
  }

  if (code === "account/attachment-delete-failed") {
    return "One or more uploaded attachments could not be deleted, so the account was not deleted. Check your connection and try again.";
  }

  if (code === "account/invalid-attachment-path") {
    return "One attachment did not belong to this account, so the account was not deleted. Contact support before trying again.";
  }

  if (code === "unavailable" || code === "deadline-exceeded" || /network|offline|failed to fetch/i.test(message)) {
    return `${action} could not reach Firebase. Your current screen will stay visible when possible; try again when the connection is back.`;
  }

  if (code === "storage/unauthorized") {
    return `${action} was blocked by Firebase Storage. Confirm the Storage rules allow this account to access its own medication attachments.`;
  }

  if (code === "storage/quota-exceeded" || code === "resource-exhausted") {
    return `${action} could not store the attachment right now. Try again later or use a smaller file.`;
  }

  return `${action} failed: ${message}${code ? ` (${code})` : ""}`;
}

export function logMobileError(context, error) {
  console.warn(`[Azur Well mobile] ${context}`, {
    code: error?.code || "",
    message: error?.message || String(error || ""),
  });
}
