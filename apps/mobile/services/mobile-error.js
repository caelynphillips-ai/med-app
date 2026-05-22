export function describeMobileError(error, action = "Action") {
  const code = error?.code || "";
  const message = error?.message || String(error || "Something went wrong.");

  if (code === "auth/native-google-not-configured") {
    return "Native Google sign-in is not configured yet. Use Preview mode for temporary testing until iOS, Android, and Web OAuth client IDs are added.";
  }

  if (code === "auth/admin-restricted-operation" || code === "auth/operation-not-allowed") {
    return `Preview mode could not start because Firebase Anonymous sign-in is not enabled. Firebase returned ${code}: ${message}. In Firebase Console, enable Authentication > Sign-in method > Anonymous.`;
  }

  if (code === "permission-denied" || /missing or insufficient permissions/i.test(message)) {
    return `${action} was blocked by Firebase permissions. Firebase returned ${code || "permission-denied"}: ${message}. Make sure you are signed in with Preview mode and that Firestore rules allow this account to read and write its own user data.`;
  }

  if (code === "unauthenticated") {
    return `${action} needs an active Firebase session. Firebase returned ${code}: ${message}. Use Preview mode before saving or syncing medications.`;
  }

  return `${action} failed: ${message}${code ? ` (${code})` : ""}`;
}

export function logMobileError(context, error) {
  console.warn(`[Med Organizer mobile] ${context}`, {
    code: error?.code || "",
    message: error?.message || String(error || ""),
  });
}
