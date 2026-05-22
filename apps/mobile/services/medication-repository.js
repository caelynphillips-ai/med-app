import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase-client.js";

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
    await updateDoc(doc(db, "users", uid, "medications", medId), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
    return medId;
  }

  const medRef = await addDoc(collection(db, "users", uid, "medications"), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return medRef.id;
}

export async function deleteMedicationRecord(uid, medId) {
  await deleteDoc(doc(db, "users", uid, "medications", medId));
}
