import { defaultScheduleSlots } from "./medicationSchema.js";
import { minutesFromTime } from "./dateTime.js";

function slug(value) {
  return String(value || "dose").replace(/[^a-z0-9_-]/gi, "_");
}

function titleCase(value) {
  return String(value || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export { minutesFromTime };

export function normalizedSchedule(med, slots = defaultScheduleSlots) {
  if (Array.isArray(med?.schedule) && med.schedule.length) {
    return med.schedule
      .map((slot) => ({
        id: slot.id || slug(slot.label || slot.time || "dose"),
        label: slot.label || titleCase(slot.id || "Dose"),
        time: slot.time || slots.find((entry) => entry.id === slot.id)?.time || "09:00",
      }))
      .sort((a, b) => minutesFromTime(a.time) - minutesFromTime(b.time));
  }

  return [{ id: "morning", label: "Morning", time: "08:00" }];
}

export function scheduleMapForForm(med, slots = defaultScheduleSlots) {
  const schedule = {};
  slots.forEach((slot) => {
    schedule[slot.id] = { checked: !med && slot.id === "morning", time: slot.time };
  });
  if (med) {
    normalizedSchedule(med, slots).forEach((slot) => {
      if (schedule[slot.id]) {
        schedule[slot.id] = { checked: true, time: slot.time };
      }
    });
  }
  return schedule;
}

export function doseKey(medId, slotId) {
  return `${slug(medId)}_${slug(slotId)}`;
}
