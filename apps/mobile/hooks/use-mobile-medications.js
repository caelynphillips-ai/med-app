import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { MEDICATION_SCHEMA_VERSION } from "../../../shared/medicationSchema.js";
import { todayKey } from "../../../shared/dateTime.js";
import { observeAuthState, signInWithGoogle, signOutUser, startFirebasePreviewSession } from "../services/auth-service.js";
import { saveDoseStatusRecord, subscribeToDoseStatusRecord } from "../services/dose-status-repository.js";
import { MOBILE_CLIENT_NAME } from "../services/firebase-client";
import {
  deleteMedicationRecord,
  saveMedicationRecord,
  subscribeToMedicationRecords,
} from "../services/medication-repository.js";
import { describeMobileError, logMobileError } from "../services/mobile-error.js";
import {
  cancelAllMedicationNotifications,
  cancelMedicationNotifications,
  describeNotificationError,
  rescheduleMedicationNotifications,
  syncMedicationNotifications,
} from "../services/notification-service.js";
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
      if (nextUser?.isAnonymous) {
        setError((current) => (current.includes("Native Google sign-in is not configured") ? "" : current));
      }
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
            void syncMedicationNotifications(records).catch((err) => {
              logMobileError("Notification sync failed", err);
              setError(describeNotificationError(err, "Syncing medication reminders"));
            });
          },
          (err) => {
            logMobileError("Medication subscription failed", err);
            setError(describeMobileError(err, "Loading medications"));
            setLoadingMeds(false);
          },
        );
        unsubscribeStatuses = subscribeToDoseStatusRecord(user.uid, dateKey, setStatuses, (err) => {
          logMobileError("Dose status subscription failed", err);
          setError(describeMobileError(err, "Loading dose statuses"));
        });
      } catch (err) {
        logMobileError("Firebase data connection failed", err);
        setError(describeMobileError(err, "Connecting to Firebase"));
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
      logMobileError("Google sign-in failed", err);
      const message = describeMobileError(err, "Google sign-in");
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
      setError("");
    } catch (err) {
      logMobileError("Preview mode sign-in failed", err);
      const message = describeMobileError(err, "Preview mode");
      setError(message);
      Alert.alert("Preview mode", message);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      await signOutUser();
      setError("");
      try {
        await cancelAllMedicationNotifications();
      } catch (err) {
        logMobileError("Notification cleanup failed during sign out", err);
        setError(describeNotificationError(err, "Clearing medication reminders"));
      }
    } catch (err) {
      logMobileError("Sign out failed", err);
      setError(describeMobileError(err, "Sign out"));
    } finally {
      setBusy(false);
    }
  }

  async function saveMedication(medication, existingId = "") {
    if (!user) {
      throw new Error("Use Preview mode before saving medications. Google sign-in is not configured on native Android yet.");
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
      quantityRemaining: medication.quantityRemaining ?? null,
      refillThreshold: medication.refillThreshold ?? null,
      refillReminderEnabled: Boolean(medication.refillReminderEnabled),
      lastRefillDate: medication.lastRefillDate || "",
      reminder: medication.reminder || { enabled: false, leadMinutes: 15 },
      updatedBy: user.uid,
      updatedFrom: MOBILE_CLIENT_NAME,
    };
    if (medication.attachment) {
      payload.attachment = medication.attachment;
    }
    try {
      const savedId = await saveMedicationRecord(user.uid, medId, payload);
      try {
        await rescheduleMedicationNotifications(
          {
            ...payload,
            id: savedId,
          },
          { requestPermissions: Boolean(payload.reminder?.enabled || payload.refillReminderEnabled) },
        );
        setError("");
      } catch (err) {
        logMobileError("Notification scheduling failed", err);
        setError(describeNotificationError(err, "Scheduling medication reminders"));
      }
      return savedId;
    } catch (err) {
      logMobileError("Medication save failed", err);
      const message = describeMobileError(err, "Saving medication");
      setError(message);
      throw new Error(message);
    }
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
    try {
      await deleteMedicationRecord(user.uid, medId);
      setError("");
      try {
        await cancelMedicationNotifications(medId);
      } catch (err) {
        logMobileError("Notification cancel failed after medication delete", err);
        setError(describeNotificationError(err, "Canceling medication reminders"));
      }
    } catch (err) {
      logMobileError("Medication delete failed", err);
      const message = describeMobileError(err, "Deleting medication");
      setError(message);
      throw new Error(message);
    }
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
    try {
      await saveDoseStatusRecord(user.uid, dateKey, doseKey, status);
      setError("");
    } catch (err) {
      logMobileError("Dose status save failed", err);
      setError(describeMobileError(err, "Saving dose status"));
    }
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
