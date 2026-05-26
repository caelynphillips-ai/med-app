import {
  deleteObject,
  getDownloadURL,
  listAll,
  ref,
  uploadBytes,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";
import { storage } from "../config/firebaseClient.js";

export async function uploadMedicationAttachment(uid, medId, file) {
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
  const fileRef = ref(storage, `users/${uid}/medications/${medId}/${Date.now()}-${safeName}`);
  await uploadBytes(fileRef, file, { contentType: file.type || "application/octet-stream" });
  const url = await getDownloadURL(fileRef);
  return {
    name: file.name,
    path: fileRef.fullPath,
    url,
    contentType: file.type || "application/octet-stream",
    uploadedAt: new Date().toISOString(),
  };
}

export async function deleteAttachmentPath(path) {
  await deleteObject(ref(storage, path));
}

export async function listMedicationAttachmentPaths(uid) {
  const folderRef = ref(storage, `users/${uid}/medications`);
  const paths = await listAttachmentPaths(folderRef);
  return paths.filter((path) => path.startsWith(`users/${uid}/medications/`));
}

async function listAttachmentPaths(folderRef) {
  const result = await listAll(folderRef);
  const nestedPaths = await Promise.all(result.prefixes.map((prefixRef) => listAttachmentPaths(prefixRef)));
  return [
    ...result.items.map((itemRef) => itemRef.fullPath),
    ...nestedPaths.flat(),
  ];
}
