import { deleteUser } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { db } from "../config/firebaseClient.js";
import { deleteAttachmentPath, listMedicationAttachmentPaths } from "./storageService.js";

export async function deleteCurrentAccount(user) {
  if (!user?.uid) {
    throw new Error("Sign in before deleting your account.");
  }

  const uid = user.uid;
  const medicationSnapshot = await getDocs(collection(db, "users", uid, "medications"));
  const attachmentPaths = medicationSnapshot.docs
    .map((entry) => entry.data()?.attachment?.path)
    .filter(Boolean);
  const listedAttachmentPaths = await listMedicationAttachmentPaths(uid);

  await deleteAttachmentPaths(uid, [...attachmentPaths, ...listedAttachmentPaths]);
  await deleteDocs(medicationSnapshot.docs);
  await deleteCollectionPath(uid, "doseStatus");
  await deleteDoc(doc(db, "users", uid, "appMeta", "settings"));

  try {
    await deleteUser(user);
  } catch (error) {
    error.dataDeleted = true;
    throw error;
  }
}

async function deleteCollectionPath(uid, collectionName) {
  const snapshot = await getDocs(collection(db, "users", uid, collectionName));
  await deleteDocs(snapshot.docs);
}

async function deleteDocs(docs) {
  await Promise.all(docs.map((entry) => deleteDoc(entry.ref)));
}

async function deleteAttachmentPaths(uid, paths) {
  const uniquePaths = [...new Set(paths)];
  const failures = [];

  await Promise.all(
    uniquePaths.map(async (path) => {
      try {
        assertOwnAttachmentPath(uid, path);
        await deleteAttachmentPath(path);
      } catch (error) {
        if (error?.code === "storage/object-not-found") {
          return;
        }
        failures.push({ path, error });
      }
    }),
  );

  if (failures.length) {
    const error = new Error("Attachment cleanup failed. Your account was not deleted. Try again when your connection is stable.");
    error.code = "account/attachment-delete-failed";
    error.failures = failures;
    throw error;
  }
}

function assertOwnAttachmentPath(uid, path) {
  if (!path.startsWith(`users/${uid}/medications/`)) {
    const error = new Error("An attachment path did not belong to this account.");
    error.code = "account/invalid-attachment-path";
    throw error;
  }
}
