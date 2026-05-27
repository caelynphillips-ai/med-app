import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { formatClock, formatMinutes, minutesFromTime } from "../../../shared/dateTime.js";
import { formatRefillNumber, getRefillInfo } from "../../../shared/refill.js";
import { normalizedSchedule } from "../../../shared/schedule.js";

const TRACKED_NOTIFICATIONS_KEY = "med-organizer:tracked-notifications:v1";
const NOTIFICATION_SIGNATURE_VERSION = 2;
export const MEDICATION_REMINDER_CHANNEL_ID = "medication-reminders";

if (isMedicationNotificationPlatform()) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      priority: Notifications.AndroidNotificationPriority.DEFAULT,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export function isMedicationNotificationPlatform() {
  return Platform.OS === "android" || Platform.OS === "ios";
}

export function describeNotificationError(error, action = "Scheduling reminders") {
  const code = error?.code || "";
  const message = error?.message || String(error || "Something went wrong.");

  if (code === "notifications/unsupported-platform") {
    return `${action} is only available in the installed mobile app.`;
  }

  if (code === "notifications/permission-denied") {
    return `${action} needs notification permission. ${message}`;
  }

  return `${action} failed: ${message}${code ? ` (${code})` : ""}`;
}

export async function initializeMedicationNotifications({ requestPermissions = false } = {}) {
  if (!isMedicationNotificationPlatform()) {
    return { granted: false, status: "unsupported", supported: false };
  }

  await configureAndroidReminderChannel();

  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && requestPermissions && permission.canAskAgain !== false) {
    permission = await Notifications.requestPermissionsAsync();
  }

  return {
    granted: Boolean(permission.granted),
    status: permission.status || "unknown",
    supported: true,
    canAskAgain: permission.canAskAgain !== false,
  };
}

export async function syncMedicationNotifications(medications, { requestPermissions = false } = {}) {
  if (!isMedicationNotificationPlatform()) {
    return { scheduled: 0, status: "unsupported" };
  }

  const tracked = await readTrackedNotifications();
  const medicationById = new Map((medications || []).filter((medication) => medication.id).map((medication) => [medication.id, medication]));
  const enabledMedications = (medications || []).filter(shouldScheduleMedication);

  for (const [medicationId, record] of Object.entries(tracked)) {
    const medication = medicationById.get(medicationId);
    if (!medication || !shouldScheduleMedication(medication)) {
      await cancelTrackedEntries(record.notifications || []);
      delete tracked[medicationId];
    }
  }
  await writeTrackedNotifications(tracked);

  if (!enabledMedications.length) {
    return { scheduled: 0, status: "none" };
  }

  const permissions = await initializeMedicationNotifications({ requestPermissions });
  if (!permissions.granted) {
    return { scheduled: 0, status: permissions.status };
  }

  let scheduled = 0;
  for (const medication of enabledMedications) {
    const signature = notificationSignature(medication);
    if (tracked[medication.id]?.signature === signature) {
      scheduled += tracked[medication.id]?.notifications?.length || 0;
      continue;
    }
    const result = await rescheduleMedicationNotifications(medication, { requestPermissions: false });
    scheduled += result.scheduled || 0;
  }

  return { scheduled, status: "scheduled" };
}

export async function rescheduleMedicationNotifications(medication, { requestPermissions = true } = {}) {
  if (!medication?.id) {
    return { scheduled: 0, status: "missing-id" };
  }

  await cancelMedicationNotifications(medication.id);

  if (!shouldScheduleMedication(medication)) {
    return { scheduled: 0, status: "disabled" };
  }

  const permissions = await initializeMedicationNotifications({ requestPermissions });
  if (!permissions.granted) {
    throw permissionError(permissions);
  }

  const notifications = [];
  try {
    if (medication.reminder?.enabled) {
      for (const slot of normalizedSchedule(medication)) {
        notifications.push(...(await scheduleMedicationSlotNotifications(medication, slot)));
      }
    }
    if (getRefillInfo(medication).reminderEligible) {
      notifications.push(await scheduleMedicationRefillNotification(medication));
    }
  } catch (error) {
    await cancelTrackedEntries(notifications);
    throw error;
  }

  try {
    const tracked = await readTrackedNotifications();
    tracked[medication.id] = {
      notifications,
      signature: notificationSignature(medication),
      updatedAt: new Date().toISOString(),
    };
    await writeTrackedNotifications(tracked);
  } catch (error) {
    await cancelTrackedEntries(notifications);
    throw error;
  }

  return { scheduled: notifications.length, status: "scheduled" };
}

export async function cancelMedicationNotifications(medicationOrId) {
  const medicationId = typeof medicationOrId === "string" ? medicationOrId : medicationOrId?.id;
  if (!medicationId || !isMedicationNotificationPlatform()) {
    return;
  }

  const tracked = await readTrackedNotifications();
  await cancelTrackedEntries(tracked[medicationId]?.notifications || []);
  delete tracked[medicationId];
  await writeTrackedNotifications(tracked);
}

export async function cancelAllMedicationNotifications() {
  if (!isMedicationNotificationPlatform()) {
    return;
  }

  const tracked = await readTrackedNotifications();
  await cancelTrackedEntries(Object.values(tracked).flatMap((record) => record.notifications || []));
  await AsyncStorage.removeItem(TRACKED_NOTIFICATIONS_KEY);
}

async function configureAndroidReminderChannel() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(MEDICATION_REMINDER_CHANNEL_ID, {
    description: "Calm medication reminders scheduled on this device.",
    enableLights: false,
    enableVibrate: false,
    importance: Notifications.AndroidImportance.DEFAULT,
    name: "Medication reminders",
    showBadge: false,
    sound: null,
    vibrationPattern: [0],
  });
}

async function scheduleMedicationSlotNotifications(medication, slot) {
  const leadMinutes = normalizedLeadMinutes(medication.reminder?.leadMinutes);
  const slotMinutes = minutesFromTime(slot.time);
  const notifications = [];

  if (leadMinutes > 0) {
    notifications.push(await scheduleDoseNotification(medication, slot, slotMinutes - leadMinutes, "lead", leadMinutes));
  }

  notifications.push(await scheduleDoseNotification(medication, slot, slotMinutes, "dose"));
  return notifications;
}

async function scheduleDoseNotification(medication, slot, triggerMinutes, reminderType, leadMinutes = 0) {
  const reminderTime = clockParts(triggerMinutes);
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      autoDismiss: true,
      body: notificationBody(medication, slot, reminderType, leadMinutes),
      color: "#0080FF",
      data: {
        kind: "medication-reminder",
        medicationId: medication.id,
        reminderType,
        scheduledTime: slot.time,
        slotId: slot.id,
      },
      priority: Notifications.AndroidNotificationPriority.DEFAULT,
      sound: false,
      subtitle: slot.label,
      title: "Medication reminder",
    },
    trigger: {
      channelId: MEDICATION_REMINDER_CHANNEL_ID,
      hour: reminderTime.hour,
      minute: reminderTime.minute,
      type: "daily",
    },
  });

  return {
    identifier,
    reminderTime: formatMinutes(triggerMinutes),
    scheduledTime: slot.time,
    slotId: slot.id,
    type: reminderType,
  };
}

function shouldScheduleMedication(medication) {
  return Boolean(
    medication?.id &&
      ((medication?.reminder?.enabled && normalizedSchedule(medication).length) ||
        getRefillInfo(medication).reminderEligible),
  );
}

function notificationBody(medication, slot, reminderType, leadMinutes = 0) {
  const doseTime = formatClock(slot.time);
  const dosage = medication.dosage ? ` ${medication.dosage}` : "";
  if (reminderType === "lead") {
    return `${medication.name}${dosage} in ${leadMinutes} ${leadMinutes === 1 ? "minute" : "minutes"}. ${slot.label} dose at ${doseTime}.`;
  }
  return `Time to take ${medication.name}${dosage}. ${slot.label} dose at ${doseTime}.`;
}

function notificationSignature(medication) {
  const refillInfo = getRefillInfo(medication);
  return JSON.stringify({
    dosage: medication.dosage || "",
    leadMinutes: normalizedLeadMinutes(medication.reminder?.leadMinutes),
    name: medication.name || "",
    notificationVersion: NOTIFICATION_SIGNATURE_VERSION,
    quantityPerDose: refillInfo.quantityPerDose,
    quantityRemaining: refillInfo.quantityRemaining,
    refillReminderEnabled: refillInfo.refillReminderEnabled,
    refillThreshold: refillInfo.refillThreshold,
    reminderEnabled: Boolean(medication.reminder?.enabled),
    schedule: normalizedSchedule(medication).map((slot) => ({
      id: slot.id,
      label: slot.label,
      time: slot.time,
    })),
  });
}

async function scheduleMedicationRefillNotification(medication) {
  const refillInfo = getRefillInfo(medication);
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      autoDismiss: true,
      body: refillNotificationBody(medication, refillInfo),
      color: "#0080FF",
      data: {
        kind: "medication-refill-reminder",
        medicationId: medication.id,
      },
      priority: Notifications.AndroidNotificationPriority.DEFAULT,
      sound: false,
      title: "Refill reminder",
    },
    trigger: refillNotificationTrigger(refillInfo),
  });

  return {
    identifier,
    reminderTime: refillInfo.isLowSupply ? "Daily at 9:00 AM" : refillReminderDate(refillInfo).toISOString(),
    type: "refill",
  };
}

function refillNotificationBody(medication, refillInfo) {
  if (refillInfo.isLowSupply) {
    return `${medication.name} is at ${formatRefillNumber(refillInfo.quantityRemaining)} remaining. Refill soon so you do not run out.`;
  }
  return `${medication.name} may reach ${formatRefillNumber(refillInfo.refillThreshold)} remaining soon. Check your supply and refill if needed.`;
}

function refillNotificationTrigger(refillInfo) {
  if (refillInfo.isLowSupply) {
    return {
      channelId: MEDICATION_REMINDER_CHANNEL_ID,
      hour: 9,
      minute: 0,
      type: "daily",
    };
  }

  return {
    channelId: MEDICATION_REMINDER_CHANNEL_ID,
    date: refillReminderDate(refillInfo),
    type: "date",
  };
}

function refillReminderDate(refillInfo) {
  const date = new Date();
  date.setDate(date.getDate() + Math.max(1, refillInfo.daysUntilThreshold || 1));
  date.setHours(9, 0, 0, 0);
  return date;
}

function normalizedLeadMinutes(value) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes)) {
    return 15;
  }
  return Math.min(240, Math.max(0, Math.round(minutes)));
}

function clockParts(totalMinutes) {
  const minutes = ((totalMinutes % 1440) + 1440) % 1440;
  return {
    hour: Math.floor(minutes / 60),
    minute: minutes % 60,
  };
}

async function cancelTrackedEntries(entries) {
  for (const entry of entries || []) {
    if (!entry?.identifier) {
      continue;
    }
    try {
      await Notifications.cancelScheduledNotificationAsync(entry.identifier);
    } catch (error) {
    console.warn("[Azur Well mobile] Notification cancel failed", {
        identifier: entry.identifier,
        message: error?.message || String(error || ""),
      });
    }
  }
}

async function readTrackedNotifications() {
  try {
    const raw = await AsyncStorage.getItem(TRACKED_NOTIFICATIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn("[Azur Well mobile] Notification tracking read failed", {
      message: error?.message || String(error || ""),
    });
    return {};
  }
}

async function writeTrackedNotifications(tracked) {
  try {
    await AsyncStorage.setItem(TRACKED_NOTIFICATIONS_KEY, JSON.stringify(tracked || {}));
  } catch (error) {
    const wrapped = new Error("Reminder tracking could not be saved on this device. The app canceled the newly scheduled reminders so they do not become orphaned.");
    wrapped.code = "notifications/tracking-write-failed";
    wrapped.cause = error;
    throw wrapped;
  }
}

function permissionError(permission) {
  const error = new Error(
    permission.canAskAgain
      ? "Notifications were not allowed, so the medication was saved without phone reminders."
      : "Notifications are turned off for this app. Turn them on in system settings to receive medication reminders.",
  );
  error.code = "notifications/permission-denied";
  error.status = permission.status;
  return error;
}
