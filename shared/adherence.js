import { todayKey } from "./dateTime.js";
import { persistedDoseStatuses } from "./medicationSchema.js";
import { doseKey, normalizedSchedule } from "./schedule.js";

export function parseDateKey(dateKey) {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);
  return new Date(year || 1970, (month || 1) - 1, day || 1, 12, 0, 0, 0);
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getRecentDateKeys(days = 7, endDate = new Date()) {
  return Array.from({ length: days }, (_, index) => todayKey(addDays(endDate, index - days + 1)));
}

export function formatHistoryDateLabel(dateKey, locale = undefined) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(parseDateKey(dateKey));
}

export function countDoseStatuses(statuses = {}) {
  const counts = { taken: 0, skipped: 0, missed: 0, total: 0 };
  Object.values(statuses || {}).forEach((entry) => {
    const status = entry?.status;
    if (!persistedDoseStatuses.includes(status)) {
      return;
    }
    counts[status] += 1;
    counts.total += 1;
  });
  return counts;
}

export function adherencePercentage(counts) {
  if (!counts?.total) {
    return null;
  }
  return Math.round((counts.taken / counts.total) * 100);
}

export function buildAdherenceSummary(dateKeys, statusRecordsByDate = {}, medications = []) {
  const days = dateKeys.map((dateKey) => {
    const statuses = statusRecordsByDate[dateKey] || {};
    const counts = countDoseStatuses(statuses);
    return {
      dateKey,
      counts,
      adherencePercentage: adherencePercentage(counts),
    };
  });

  const totals = days.reduce(
    (current, day) => ({
      taken: current.taken + day.counts.taken,
      skipped: current.skipped + day.counts.skipped,
      missed: current.missed + day.counts.missed,
      total: current.total + day.counts.total,
    }),
    { taken: 0, skipped: 0, missed: 0, total: 0 },
  );

  return {
    days,
    dateKeys,
    hasHistory: totals.total > 0,
    missedDoses: getRecentMissedDoses(dateKeys, statusRecordsByDate, medications),
    totals,
    adherencePercentage: adherencePercentage(totals),
  };
}

export function getRecentMissedDoses(dateKeys, statusRecordsByDate = {}, medications = [], limit = 5) {
  const lookup = buildDoseLookup(medications);
  return [...dateKeys]
    .reverse()
    .flatMap((dateKey) =>
      Object.entries(statusRecordsByDate[dateKey] || {})
        .filter(([, entry]) => entry?.status === "missed")
        .map(([key, entry]) => ({
          dateKey,
          key,
          medicationName: lookup[key]?.medicationName || "Unknown medication",
          slotLabel: lookup[key]?.slotLabel || "Dose",
          time: lookup[key]?.time || "",
          updatedAt: entry?.updatedAt || "",
        })),
    )
    .slice(0, limit);
}

function buildDoseLookup(medications) {
  const lookup = {};
  (medications || []).forEach((medication) => {
    normalizedSchedule(medication).forEach((slot) => {
      lookup[doseKey(medication.id, slot.id)] = {
        medicationName: medication.name || "Medication",
        slotLabel: slot.label || "Dose",
        time: slot.time || "",
      };
    });
  });
  return lookup;
}
