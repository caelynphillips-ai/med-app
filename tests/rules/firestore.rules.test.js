import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const PROJECT_ID = "demo-med-organizer-rules";
let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

after(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

describe("Firestore medication rules", () => {
  test("owner can read, create, edit, and delete their own medication", async () => {
    const db = ownerDb("owner-a");
    const medicationRef = doc(db, "users/owner-a/medications/med-1");

    await assertSucceeds(setDoc(medicationRef, validMedication("owner-a")));
    await assertSucceeds(getDoc(medicationRef));
    await assertSucceeds(
      updateDoc(medicationRef, {
        dosage: "20 mg",
        quantityRemaining: 12,
        quantityPerDose: 2,
        refillThreshold: 5,
        refillReminderEnabled: true,
        lastRefillDate: "2026-05-23",
        updatedAt: serverTimestamp(),
        updatedBy: "owner-a",
        updatedFrom: "web",
      }),
    );
    await assertSucceeds(deleteDoc(medicationRef));
  });

  test("valid medication fields include refill fields and optional attachment data", async () => {
    const db = ownerDb("owner-a");
    const medicationRef = doc(db, "users/owner-a/medications/med-2");

    await assertSucceeds(
      setDoc(medicationRef, {
        ...validMedication("owner-a"),
        attachment: {
          contentType: "image/png",
          name: "label.png",
          path: "users/owner-a/medications/med-2/label.png",
          uploadedAt: "2026-05-23T12:00:00.000Z",
          url: "https://example.invalid/label.png",
        },
        quantityRemaining: 9,
        quantityPerDose: 0.5,
        refillThreshold: 3,
        refillReminderEnabled: true,
        lastRefillDate: "2026-05-01",
      }),
    );
  });

  test("unknown medication fields are rejected", async () => {
    const db = ownerDb("owner-a");
    await assertFails(
      setDoc(doc(db, "users/owner-a/medications/med-unknown"), {
        ...validMedication("owner-a"),
        unexpectedField: "not allowed",
      }),
    );
  });

  test("invalid updatedFrom values are rejected", async () => {
    const db = ownerDb("owner-a");
    await assertFails(
      setDoc(doc(db, "users/owner-a/medications/med-invalid-client"), {
        ...validMedication("owner-a"),
        updatedFrom: "android",
      }),
    );
  });

  test("cross-user medication access is blocked", async () => {
    const owner = ownerDb("owner-a");
    const other = ownerDb("owner-b");
    const medicationPath = "users/owner-a/medications/med-1";

    await assertSucceeds(setDoc(doc(owner, medicationPath), validMedication("owner-a")));
    await assertFails(getDoc(doc(other, medicationPath)));
    await assertFails(updateDoc(doc(other, medicationPath), { dosage: "25 mg" }));
    await assertFails(deleteDoc(doc(other, medicationPath)));
  });

  test("anonymous authenticated preview users can write their own medication records", async () => {
    const anonymousDb = anonymousDbFor("anon-preview");
    await assertSucceeds(
      setDoc(doc(anonymousDb, "users/anon-preview/medications/med-1"), {
        ...validMedication("anon-preview"),
        updatedFrom: "ios",
      }),
    );
  });
});

describe("Firestore dose status rules", () => {
  test("owner can read and write doseStatus docs", async () => {
    const db = ownerDb("owner-a");
    const statusRef = doc(db, "users/owner-a/doseStatus/2026-05-23");

    await assertSucceeds(setDoc(statusRef, validDoseStatus("owner-a")));
    const snapshot = await assertSucceeds(getDoc(statusRef));
    assert.equal(snapshot.exists(), true);
  });

  test("cross-user doseStatus access is blocked", async () => {
    const owner = ownerDb("owner-a");
    const other = ownerDb("owner-b");
    const statusPath = "users/owner-a/doseStatus/2026-05-23";

    await assertSucceeds(setDoc(doc(owner, statusPath), validDoseStatus("owner-a")));
    await assertFails(getDoc(doc(other, statusPath)));
    await assertFails(setDoc(doc(other, statusPath), validDoseStatus("owner-b")));
  });
});

describe("Firestore app metadata rules", () => {
  test("owner can read and write appMeta/settings", async () => {
    const db = ownerDb("owner-a");
    const settingsRef = doc(db, "users/owner-a/appMeta/settings");

    await assertSucceeds(
      setDoc(settingsRef, {
        displayName: "Caelyn",
        sampleSeeded: true,
        sampleSeededAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(getDoc(settingsRef));
  });

  test("cross-user appMeta/settings access is blocked", async () => {
    const other = ownerDb("owner-b");
    await assertFails(
      setDoc(doc(other, "users/owner-a/appMeta/settings"), {
        sampleSeeded: true,
      }),
    );
  });
});

function ownerDb(uid) {
  return testEnv.authenticatedContext(uid).firestore();
}

function anonymousDbFor(uid) {
  return testEnv.authenticatedContext(uid, {
    firebase: {
      sign_in_provider: "anonymous",
    },
  }).firestore();
}

function validMedication(uid) {
  return {
    schemaVersion: 1,
    ownerId: uid,
    name: "Lisinopril",
    genericName: "",
    category: "prescription",
    purpose: "for blood pressure",
    dosage: "10 mg",
    timesPerDay: 1,
    schedule: [{ id: "morning", label: "Morning", time: "08:00" }],
    intake: "water",
    foodInstructions: "Take with water",
    notes: "Check blood pressure regularly.",
    quantityRemaining: null,
    quantityPerDose: null,
    refillThreshold: null,
    refillReminderEnabled: false,
    lastRefillDate: "",
    reminder: { enabled: true, leadMinutes: 15 },
    attachment: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: uid,
    updatedFrom: "web",
  };
}

function validDoseStatus(uid) {
  return {
    statuses: {
      "med-1:morning": {
        status: "taken",
        updatedAt: "2026-05-23T12:00:00.000Z",
        updatedBy: uid,
        updatedFrom: "web",
      },
    },
    updatedAt: serverTimestamp(),
    updatedBy: uid,
    updatedFrom: "web",
  };
}
