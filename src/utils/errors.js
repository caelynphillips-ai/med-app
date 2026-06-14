export function messageFromError(error) {
  if (!error) {
    return "Something went wrong.";
  }

  const code = error.code || "";
  const message = error.message || String(error);

  if (code === "permission-denied" || /missing or insufficient permissions/i.test(message)) {
    return "Firebase blocked this action. Make sure you are signed in and that the published Firestore and Storage rules allow access to your own account data.";
  }

  if (code === "unauthenticated") {
    return "Your sign-in session expired. Sign in again before saving or exporting data.";
  }

  if (code === "auth/requires-recent-login") {
    return "For safety, Firebase needs a fresh sign-in before deleting this account. Sign out, sign back in, then try deleting the account again.";
  }

  if (code === "auth/admin-restricted-operation" || code === "auth/operation-not-allowed") {
    return "Preview mode is not enabled for this Firebase project yet. Enable Anonymous sign-in in Firebase Authentication, then try again.";
  }

  if (code === "account/attachment-delete-failed") {
    return "One or more uploaded attachments could not be deleted, so the account was not deleted. Check your connection and try again.";
  }

  if (code === "account/invalid-attachment-path") {
    return "One attachment did not belong to this account, so the account was not deleted. Contact support before trying again.";
  }

  if (code === "unavailable" || code === "deadline-exceeded" || /network|offline|failed to fetch/i.test(message)) {
    return "The connection was interrupted. Your saved data is still shown when available; try again when the connection is back.";
  }

  if (code === "storage/unauthorized") {
    return "Firebase Storage blocked the attachment action. Check that the Storage rules allow your account to access its own medication files.";
  }

  if (code === "storage/quota-exceeded" || code === "resource-exhausted") {
    return "Firebase is temporarily unable to store this file. Try again later or use a smaller attachment.";
  }

  return message.replace(/^Firebase:\s*/i, "").replace(/\s*\([^)]*\)\.?$/, ".");
}
