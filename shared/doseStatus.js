import { computedDoseStatuses, persistedDoseStatuses } from "./medicationSchema.js";
import { doseKey, minutesFromTime, normalizedSchedule } from "./schedule.js";

function titleCase(value) {
  return String(value || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export { computedDoseStatuses, persistedDoseStatuses };

export function statusLabel(status) {
  if (status === "auto-missed") {
    return "Past due";
  }
  if (status === "due") {
    return "Due";
  }
  return titleCase(status);
}

export function buildTodayDoses(medications, statuses, currentMinutes) {
  return medications
    .flatMap((med) =>
      normalizedSchedule(med).map((slot) => {
        const key = doseKey(med.id, slot.id);
        const savedStatus = statuses[key]?.status;
        const autoMissed = !savedStatus && minutesFromTime(slot.time) + 30 < currentMinutes;
        return {
          key,
          med,
          label: slot.label,
          time: slot.time,
          sortMinutes: minutesFromTime(slot.time),
          status: savedStatus || (autoMissed ? "auto-missed" : "due"),
        };
      }),
    )
    .sort((a, b) => a.sortMinutes - b.sortMinutes || a.med.name.localeCompare(b.med.name));
}
