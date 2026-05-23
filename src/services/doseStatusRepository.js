import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { db } from "../config/firebaseClient.js";

export function subscribeToDoseStatusRecord(uid, dateKey, onStatuses, onError) {
  const statusRef = doc(db, "users", uid, "doseStatus", dateKey);
  return onSnapshot(
    statusRef,
    (snapshot) => {
      onStatuses(snapshot.exists() ? snapshot.data().statuses || {} : {});
    },
    onError,
  );
}

export async function saveDoseStatusRecord(uid, dateKey, doseKey, status, clientName) {
  const statusRef = doc(db, "users", uid, "doseStatus", dateKey);
  await setDoc(
    statusRef,
    {
      statuses: {
        [doseKey]: {
          status,
          updatedAt: new Date().toISOString(),
          updatedBy: uid,
          updatedFrom: clientName,
        },
      },
      updatedAt: serverTimestamp(),
      updatedBy: uid,
      updatedFrom: clientName,
    },
    { merge: true },
  );
}

export async function getDoseStatusHistoryRecords(uid, dateKeys) {
  const entries = await Promise.all(
    dateKeys.map(async (dateKey) => {
      const snapshot = await getDoc(doc(db, "users", uid, "doseStatus", dateKey));
      return [dateKey, snapshot.exists() ? snapshot.data().statuses || {} : {}];
    }),
  );
  return Object.fromEntries(entries);
}
