import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { MEDICATION_SCHEMA_VERSION } from "../../../shared/medicationSchema.js";
import { sampleMedications } from "../../../shared/sampleMedications.js";
import { db, MOBILE_CLIENT_NAME } from "./firebase-client";

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
  sampleMedications.forEach((medication) => {
    const medRef = doc(collection(db, "users", user.uid, "medications"));
    batch.set(medRef, {
      ...medication,
      schemaVersion: MEDICATION_SCHEMA_VERSION,
      ownerId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
      updatedFrom: MOBILE_CLIENT_NAME,
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
