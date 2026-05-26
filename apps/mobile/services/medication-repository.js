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
} from "firebase/firestore";
import { db } from "./firebase-client";

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
  const preparedPayload = { ...payload };
  if (!preparedPayload.intake) {
    if (medId) {
      preparedPayload.intake = deleteField();
    } else {
      delete preparedPayload.intake;
    }
  }

  if (medId) {
    await updateDoc(doc(db, "users", uid, "medications", medId), {
      ...preparedPayload,
      updatedAt: serverTimestamp(),
    });
    return medId;
  }

  const medRef = await addDoc(collection(db, "users", uid, "medications"), {
    ...preparedPayload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return medRef.id;
}

export async function deleteMedicationRecord(uid, medId) {
  await deleteDoc(doc(db, "users", uid, "medications", medId));
}
