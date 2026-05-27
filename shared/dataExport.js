export const DATA_EXPORT_VERSION = 1;

export function buildMedicationDataExport({
  doseStatusHistory = {},
  generatedAt = new Date().toISOString(),
  medications = [],
  source = "med-organizer",
  user = null,
} = {}) {
  return {
    exportVersion: DATA_EXPORT_VERSION,
    generatedAt,
    source,
    account: {
      displayName: user?.displayName || "",
      email: user?.email || "",
      isPreviewSession: Boolean(user?.isAnonymous),
    },
    medications: medications.map(cleanMedicationForExport),
    recentDoseStatusHistory: cleanDoseStatusHistory(doseStatusHistory),
    notes: [
      "Attachment metadata is included, but uploaded files are not included in this export.",
      "This export is for personal organization only and does not provide medical advice.",
    ],
  };
}

export function buildMedicationExportJson(exportData) {
  return JSON.stringify(exportData, null, 2);
}

export function buildMedicationListTextExport({
  generatedAt = new Date().toISOString(),
  medications = [],
} = {}) {
  const lines = [
    "Azur Well Medication List",
    `Generated: ${generatedAt}`,
    "",
  ];

  if (!medications.length) {
    lines.push("No medications saved.");
    return lines.join("\n");
  }

  medications.forEach((medication, index) => {
    const schedule = Array.isArray(medication.schedule)
      ? medication.schedule.map((slot) => `${slot.label || slot.id || "Dose"} ${slot.time || ""}`.trim()).join(", ")
      : "";
    lines.push(`${index + 1}. ${medication.name || "Medication"}`);
    lines.push(`   Category: ${medication.category || "Not set"}`);
    lines.push(`   Purpose: ${medication.purpose || "Not set"}`);
    lines.push(`   Dosage: ${medication.dosage || "Not set"}`);
    lines.push(`   Schedule: ${schedule || "Not set"}`);
    lines.push(`   Instructions: ${medication.foodInstructions || "Not set"}`);
    lines.push("");
  });

  return lines.join("\n").trimEnd();
}

export function exportFileName(prefix = "med-organizer-export", extension = "json", date = new Date()) {
  const dateStamp = date.toISOString().slice(0, 10);
  return `${prefix}-${dateStamp}.${extension}`;
}

function cleanMedicationForExport(medication) {
  return removeEmptyValues({
    id: medication?.id || "",
    schemaVersion: medication?.schemaVersion || 1,
    name: medication?.name || "",
    genericName: medication?.genericName || "",
    category: medication?.category || "",
    purpose: medication?.purpose || "",
    dosage: medication?.dosage || "",
    timesPerDay: Number(medication?.timesPerDay) || null,
    schedule: cleanSchedule(medication?.schedule),
    intake: medication?.intake || "",
    foodInstructions: medication?.foodInstructions || "",
    notes: medication?.notes || "",
    reminder: cleanReminder(medication?.reminder),
    refillTracking: cleanRefillTracking(medication),
    attachment: cleanAttachmentMetadata(medication?.attachment),
  });
}

function cleanSchedule(schedule = []) {
  if (!Array.isArray(schedule)) {
    return [];
  }
  return schedule.map((slot) =>
    removeEmptyValues({
      id: slot?.id || "",
      label: slot?.label || "",
      time: slot?.time || "",
    }),
  );
}

function cleanReminder(reminder = {}) {
  return {
    enabled: Boolean(reminder?.enabled),
    leadMinutes: Number(reminder?.leadMinutes) || 15,
  };
}

function cleanRefillTracking(medication) {
  return removeEmptyValues({
    quantityRemaining: medication?.quantityRemaining ?? null,
    refillThreshold: medication?.refillThreshold ?? null,
    refillReminderEnabled: Boolean(medication?.refillReminderEnabled),
    lastRefillDate: medication?.lastRefillDate || "",
  });
}

function cleanAttachmentMetadata(attachment) {
  if (!attachment) {
    return null;
  }
  return removeEmptyValues({
    name: attachment.name || "",
    path: attachment.path || "",
    url: attachment.url || "",
    contentType: attachment.contentType || "",
    uploadedAt: attachment.uploadedAt || "",
  });
}

function cleanDoseStatusHistory(doseStatusHistory = {}) {
  return Object.fromEntries(
    Object.entries(doseStatusHistory).map(([dateKey, statuses]) => [
      dateKey,
      Object.fromEntries(
        Object.entries(statuses || {}).map(([doseKey, entry]) => [
          doseKey,
          removeEmptyValues({
            status: entry?.status || "",
            updatedAt: entry?.updatedAt || "",
            updatedFrom: entry?.updatedFrom || "",
          }),
        ]),
      ),
    ]),
  );
}

function removeEmptyValues(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => {
      if (value === null || value === undefined) {
        return false;
      }
      if (typeof value === "string" && value.trim() === "") {
        return false;
      }
      if (Array.isArray(value) && value.length === 0) {
        return false;
      }
      return true;
    }),
  );
}
