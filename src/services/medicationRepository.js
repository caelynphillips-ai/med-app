import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { db } from "../config/firebaseClient.js";

export function subscribeToMedicationRecords(uid, onMedications, onError) {
  const medsQuery = query(collection(db, "users", uid, "medications"), orderBy("createdAt", "asc"));
  return onSnapshot(
    medsQuery,
    (snapshot) => {
      onMedications(
        snapshot.docs.map((entry) => ({
          id: entry.id,
          ...entry.data(),
        })),
      );
    },
    onError,
  );
}

export async function saveMedicationRecord(uid, medId, payload) {
  if (medId) {
    const medRef = doc(db, "users", uid, "medications", medId);
    await updateDoc(medRef, {
      ...payload,
      updatedAt: serverTimestamp(),
    });
    return { medId, medRef };
  }

  const medRef = await addDoc(collection(db, "users", uid, "medications"), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { medId: medRef.id, medRef };
}

export async function updateMedicationAttachment(uid, medId, attachment, metadata) {
  await updateDoc(doc(db, "users", uid, "medications", medId), {
    attachment,
    updatedAt: serverTimestamp(),
    ...metadata,
  });
}

export async function clearMedicationAttachment(uid, medId) {
  await updateDoc(doc(db, "users", uid, "medications", medId), {
    attachment: deleteField(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteMedicationRecord(uid, medId) {
  await deleteDoc(doc(db, "users", uid, "medications", medId));
}
