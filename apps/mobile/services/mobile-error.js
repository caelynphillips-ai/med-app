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
