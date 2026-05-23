import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db, MOBILE_CLIENT_NAME } from "./firebase-client";

export function subscribeToDoseStatusRecord(uid, dateKey, onStatuses, onError) {
  return onSnapshot(
    doc(db, "users", uid, "doseStatus", dateKey),
    (snapshot) => {
      onStatuses(snapshot.exists() ? snapshot.data().statuses || {} : {});
    },
    onError,
  );
}

export async function saveDoseStatusRecord(uid, dateKey, doseKey, status) {
  await setDoc(
    doc(db, "users", uid, "doseStatus", dateKey),
    {
      statuses: {
        [doseKey]: {
          status,
          updatedAt: new Date().toISOString(),
          updatedBy: uid,
          updatedFrom: MOBILE_CLIENT_NAME,
        },
      },
      updatedAt: serverTimestamp(),
      updatedBy: uid,
      updatedFrom: MOBILE_CLIENT_NAME,
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
