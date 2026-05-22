export const MEDICATION_SCHEMA_VERSION = 1;

export const medicationCategories = ["prescription", "over-the-counter", "vitamin", "supplement"];
export const intakeInstructions = ["food", "water", "empty"];
export const persistedDoseStatuses = ["taken", "skipped", "missed"];
export const computedDoseStatuses = ["due", "auto-missed"];

export const categoryLabels = {
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

export const defaultScheduleSlots = [
  { id: "morning", label: "Morning", time: "08:00" },
  { id: "lunch", label: "Lunch", time: "12:30" },
  { id: "evening", label: "Evening", time: "18:00" },
  { id: "bedtime", label: "Bedtime", time: "21:30" },
];

export const medicalDisclaimer =
  "This app is for personal organization only and does not provide medical advice. Confirm medication details with the prescription label, doctor, or pharmacist.";
