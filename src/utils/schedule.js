import { minutesFromTime } from "./dateTime.js";
import { slug, titleCase } from "./text.js";

export const slotDefinitions = [
  { id: "morning", label: "Morning", time: "08:00" },
  { id: "lunch", label: "Lunch", time: "12:30" },
  { id: "evening", label: "Evening", time: "18:00" },
  { id: "bedtime", label: "Bedtime", time: "21:30" },
];

export function normalizedSchedule(med) {
  if (Array.isArray(med?.schedule) && med.schedule.length) {
    return med.schedule
      .map((slot) => ({
        id: slot.id || slug(slot.label || slot.time || "dose"),
        label: slot.label || titleCase(slot.id || "Dose"),
        time: slot.time || slotDefinitions.find((entry) => entry.id === slot.id)?.time || "09:00",
      }))
      .sort((a, b) => minutesFromTime(a.time) - minutesFromTime(b.time));
  }

  return [{ id: "morning", label: "Morning", time: "08:00" }];
}

export function scheduleMapForForm(med) {
  const schedule = {};
  slotDefinitions.forEach((slot) => {
    schedule[slot.id] = { checked: !med && slot.id === "morning", time: slot.time };
  });
  if (med) {
    normalizedSchedule(med).forEach((slot) => {
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

export function statusLabel(status) {
  if (status === "auto-missed") {
    return "Past due";
  }
  if (status === "due") {
    return "Due";
  }
  return titleCase(status);
}
