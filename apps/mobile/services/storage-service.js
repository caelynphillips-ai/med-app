import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase-client";

export async function uploadMedicationAttachment(uid, medicationId, file) {
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
  const fileRef = ref(storage, `users/${uid}/medications/${medicationId}/${Date.now()}-${safeName}`);
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
