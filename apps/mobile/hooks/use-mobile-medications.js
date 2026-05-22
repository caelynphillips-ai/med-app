import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { MEDICATION_SCHEMA_VERSION } from "../../../shared/medicationSchema.js";
import { todayKey } from "../../../shared/dateTime.js";
import { observeAuthState, signInWithGoogle, signOutUser, startFirebasePreviewSession } from "../services/auth-service.js";
import { saveDoseStatusRecord, subscribeToDoseStatusRecord } from "../services/dose-status-repository.js";
import { MOBILE_CLIENT_NAME } from "../services/firebase-client.js";
import {
  deleteMedicationRecord,
  saveMedicationRecord,
  subscribeToMedicationRecords,
} from "../services/medication-repository.js";
import { ensureSampleData } from "../services/sample-data-service.js";
import { deleteAttachmentPath } from "../services/storage-service.js";

export function useMobileMedications() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [medications, setMedications] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [loadingMeds, setLoadingMeds] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dateKey = useMemo(() => todayKey(), []);

  useEffect(() => {
    return observeAuthState((nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (!nextUser) {
        setMedications([]);
        setStatuses({});
      }
    });
  }, []);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    let unsubscribeMeds = null;
    let unsubscribeStatuses = null;
    let cancelled = false;

    async function connectData() {
      setLoadingMeds(true);
      setError("");
      try {
        await ensureSampleData(user);
        if (cancelled) {
          return;
        }
        unsubscribeMeds = subscribeToMedicationRecords(
          user.uid,
          (records) => {
            setMedications(records);
            setLoadingMeds(false);
          },
          (err) => {
            setError(messageFromError(err));
            setLoadingMeds(false);
          },
        );
        unsubscribeStatuses = subscribeToDoseStatusRecord(user.uid, dateKey, setStatuses, (err) => {
          setError(messageFromError(err));
        });
      } catch (err) {
        setError(messageFromError(err));
        setLoadingMeds(false);
      }
    }

    void connectData();

    return () => {
      cancelled = true;
      if (unsubscribeMeds) {
        unsubscribeMeds();
      }
      if (unsubscribeStatuses) {
        unsubscribeStatuses();
      }
    };
  }, [dateKey, user]);

  async function continueWithGoogle() {
    setBusy(true);
    setError("");
    try {
      await signInWithGoogle();
    } catch (err) {
      const message = messageFromError(err);
      setError(message);
      Alert.alert("Google sign-in", message);
    } finally {
      setBusy(false);
    }
  }

  async function continueWithFirebasePreview() {
    setBusy(true);
    setError("");
    try {
      await startFirebasePreviewSession();
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      await signOutUser();
    } finally {
      setBusy(false);
    }
  }

  async function saveMedication(medication, existingId = "") {
    if (!user) {
      throw new Error("Sign in before saving medications.");
    }

    const medId = existingId || medication.id || "";
    const payload = {
      schemaVersion: medication.schemaVersion || MEDICATION_SCHEMA_VERSION,
      ownerId: user.uid,
      name: medication.name || "",
      genericName: medication.genericName || "",
      category: medication.category || "prescription",
      purpose: medication.purpose || "",
      dosage: medication.dosage || "",
      timesPerDay: Number(medication.timesPerDay) || 1,
      schedule: Array.isArray(medication.schedule) ? medication.schedule : [],
      intake: medication.intake || "water",
      foodInstructions: medication.foodInstructions || "",
      notes: medication.notes || "",
      reminder: medication.reminder || { enabled: false, leadMinutes: 15 },
      updatedBy: user.uid,
      updatedFrom: MOBILE_CLIENT_NAME,
    };
    if (medication.attachment) {
      payload.attachment = medication.attachment;
    }
    return saveMedicationRecord(user.uid, medId, payload);
  }

  async function deleteMedication(medId) {
    if (!user || !medId) {
      return;
    }
    const medication = medications.find((item) => item.id === medId);
    if (medication?.attachment?.path) {
      try {
        await deleteAttachmentPath(medication.attachment.path);
      } catch (err) {
        console.warn("Attachment delete failed before medication delete.", err);
      }
    }
    await deleteMedicationRecord(user.uid, medId);
  }

  async function markDose(doseKey, status) {
    if (!user) {
      setStatuses((current) => ({
        ...current,
        [doseKey]: {
          status,
          updatedAt: new Date().toISOString(),
          updatedFrom: MOBILE_CLIENT_NAME,
        },
      }));
      return;
    }
    await saveDoseStatusRecord(user.uid, dateKey, doseKey, status);
  }

  return {
    authReady,
    busy,
    continueWithFirebasePreview,
    continueWithGoogle,
    dateKey,
    deleteMedication,
    error,
    loading: !authReady || loadingMeds,
    markDose,
    medications,
    saveMedication,
    setError,
    signOut,
    statuses,
    user,
  };
}

function messageFromError(error) {
  if (!error) {
    return "Something went wrong.";
  }
  if (error.code === "permission-denied") {
    return "Missing or insufficient permissions. Check that you are signed in and Firebase rules are deployed.";
  }
  return error.message || String(error);
}
