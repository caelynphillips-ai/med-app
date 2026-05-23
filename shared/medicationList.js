import { categoryLabels, medicationCategories } from "./medicationSchema.js";
import { getRefillInfo } from "./refill.js";
import { minutesFromTime, normalizedSchedule } from "./schedule.js";

export const medicationCategoryFilterOptions = [
  { value: "all", label: "All" },
  ...medicationCategories.map((category) => ({
    value: category,
    label: categoryLabels[category] || category,
  })),
];

export const medicationUtilityFilterOptions = [
  { value: "all", label: "All status" },
  { value: "reminders-on", label: "Reminders on" },
  { value: "low-supply", label: "Low supply" },
  { value: "refill-tracking", label: "Refill tracking" },
];

export const medicationSortOptions = [
  { value: "name", label: "Name A-Z" },
  { value: "schedule", label: "Schedule/time" },
  { value: "category", label: "Category" },
  { value: "low-supply", label: "Low supply first" },
];

export function defaultMedicationListControls() {
  return {
    category: "all",
    query: "",
    sort: "name",
    utility: "all",
  };
}

export function hasActiveMedicationListControls(controls = {}) {
  const defaults = defaultMedicationListControls();
  return (
    normalizeSearchText(controls.query) !== "" ||
    (controls.category || defaults.category) !== defaults.category ||
    (controls.utility || defaults.utility) !== defaults.utility ||
    (controls.sort || defaults.sort) !== defaults.sort
  );
}

export function filterAndSortMedications(medications = [], controls = {}) {
  const normalizedControls = {
    ...defaultMedicationListControls(),
    ...controls,
  };

  return [...medications]
    .filter((medication) => medicationMatchesSearch(medication, normalizedControls.query))
    .filter((medication) => medicationMatchesCategory(medication, normalizedControls.category))
    .filter((medication) => medicationMatchesUtility(medication, normalizedControls.utility))
    .sort((left, right) => compareMedications(left, right, normalizedControls.sort));
}

export function medicationMatchesSearch(medication, query = "") {
  const search = normalizeSearchText(query);
  if (!search) {
    return true;
  }
  return medicationSearchText(medication).includes(search);
}

export function medicationMatchesCategory(medication, category = "all") {
  return category === "all" || medication?.category === category;
}

export function medicationMatchesUtility(medication, utility = "all") {
  const refillInfo = getRefillInfo(medication);
  if (utility === "reminders-on") {
    return Boolean(medication?.reminder?.enabled);
  }
  if (utility === "low-supply") {
    return refillInfo.isLowSupply;
  }
  if (utility === "refill-tracking") {
    return refillInfo.isTracking;
  }
  return true;
}

export function compareMedications(left, right, sort = "name") {
  if (sort === "schedule") {
    return compareNumbers(earliestScheduleMinutes(left), earliestScheduleMinutes(right)) || compareByName(left, right);
  }
  if (sort === "category") {
    return compareStrings(categoryLabels[left?.category] || left?.category, categoryLabels[right?.category] || right?.category) || compareByName(left, right);
  }
  if (sort === "low-supply") {
    return compareLowSupply(left, right) || compareByName(left, right);
  }
  return compareByName(left, right);
}

export function medicationSearchText(medication) {
  return normalizeSearchText(
    [
      medication?.name,
      medication?.purpose,
      medication?.dosage,
      medication?.foodInstructions,
      medication?.notes,
    ].join(" "),
  );
}

export function normalizeSearchText(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, " ");
}

function compareByName(left, right) {
  return compareStrings(left?.name, right?.name);
}

function compareLowSupply(left, right) {
  const leftInfo = getRefillInfo(left);
  const rightInfo = getRefillInfo(right);
  if (leftInfo.isLowSupply !== rightInfo.isLowSupply) {
    return leftInfo.isLowSupply ? -1 : 1;
  }
  return compareNullableNumbers(leftInfo.estimatedDaysRemaining, rightInfo.estimatedDaysRemaining);
}

function earliestScheduleMinutes(medication) {
  const schedule = normalizedSchedule(medication);
  if (!schedule.length) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.min(...schedule.map((slot) => minutesFromTime(slot.time)));
}

function compareStrings(left, right) {
  return String(left || "").localeCompare(String(right || ""), undefined, { sensitivity: "base" });
}

function compareNumbers(left, right) {
  return left - right;
}

function compareNullableNumbers(left, right) {
  if (left === null && right === null) {
    return 0;
  }
  if (left === null) {
    return 1;
  }
  if (right === null) {
    return -1;
  }
  return left - right;
}
