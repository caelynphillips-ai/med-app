export const MEDICATION_SCHEMA_VERSION = 1;

export const CLIENT_NAME =
  new URLSearchParams(window.location.search).get("client") === "desktop" || window.medOrganizerDesktop?.client === "desktop"
    ? "desktop"
    : "web";

export const slotDefinitions = [
  { id: "morning", label: "Morning", time: "08:00" },
  { id: "lunch", label: "Lunch", time: "12:30" },
  { id: "evening", label: "Evening", time: "18:00" },
  { id: "bedtime", label: "Bedtime", time: "21:30" },
];

export const categories = {
  prescription: "Prescription",
  "over-the-counter": "Over-the-counter",
  vitamin: "Vitamin",
  supplement: "Supplement",
};

export const intakeLabels = {
  food: "Take with food",
  water: "Take with water",
  empty: "Take on an empty stomach",
};
