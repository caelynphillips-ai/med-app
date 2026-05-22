export function messageFromError(error) {
  if (!error) {
    return "Something went wrong.";
  }

  if (error.code === "permission-denied" || /missing or insufficient permissions/i.test(error.message || "")) {
    return "Firebase denied this save. Publish the Firestore rules in firestore.rules so signed-in users can read and write their own medications.";
  }

  const message = error.message || String(error);
  return message.replace(/^Firebase:\s*/i, "").replace(/\s*\([^)]*\)\.?$/, ".");
}
