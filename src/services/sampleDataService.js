import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { CLIENT_NAME, MEDICATION_SCHEMA_VERSION } from "../config/constants.js";
import { db } from "../config/firebaseClient.js";
import { sampleMedications } from "../data/sampleMedications.js";

export async function ensureSampleData(user) {
  const settingsRef = doc(db, "users", user.uid, "appMeta", "settings");
  const settingsSnap = await getDoc(settingsRef);
  const hasSeeded = settingsSnap.exists() && settingsSnap.data().sampleSeeded;
  if (hasSeeded) {
    return;
  }

  const existing = await getDocs(query(collection(db, "users", user.uid, "medications"), limit(1)));
  if (!existing.empty) {
    await setDoc(
      settingsRef,
      {
        sampleSeeded: true,
        sampleSeededAt: serverTimestamp(),
      },
      { merge: true },
    );
    return;
  }

  const batch = writeBatch(db);
  sampleMedications.forEach((med) => {
    const medRef = doc(collection(db, "users", user.uid, "medications"));
    batch.set(medRef, {
      ...med,
      schemaVersion: MEDICATION_SCHEMA_VERSION,
      ownerId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
      updatedFrom: CLIENT_NAME,
    });
  });
  batch.set(
    settingsRef,
    {
      sampleSeeded: true,
      sampleSeededAt: serverTimestamp(),
      displayName: user.displayName || "",
    },
    { merge: true },
  );
  await batch.commit();
}
