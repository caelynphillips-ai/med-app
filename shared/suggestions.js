import { mergeMedicationEntries } from "./rxterms.js";
import { cleanText, normalizeSearch } from "./commonUses.js";

export function medicationSearchText(record) {
  return normalizeSearch(
    [
      record.name,
      record.genericName,
      ...(record.brandNames || []),
      ...(record.strengthsAndForms || []),
      ...(record.commonUses || []),
    ].join(" "),
  );
}

export function medicationSearchRank(record, search) {
  const fields = [
    record.name,
    record.genericName,
    ...(record.brandNames || []),
    ...(record.strengthsAndForms || []),
  ].map(normalizeSearch);

  if (fields.some((field) => field === search)) {
    return 0;
  }
  if (fields.some((field) => field.startsWith(search))) {
    return 1;
  }
  if (fields.some((field) => field.includes(search))) {
    return 2;
  }
  return 3;
}

export function getMedicationSuggestions(medicationDatabase, query) {
  const search = normalizeSearch(query);
  if (!search || search.length < 1) {
    return [];
  }

  return medicationDatabase
    .filter((record) => medicationSearchText(record).includes(search))
    .sort((a, b) => medicationSearchRank(a, search) - medicationSearchRank(b, search) || a.name.localeCompare(b.name))
    .slice(0, 7);
}

export function findMedicationRecordByName(name, medicationDatabase, liveSuggestions = []) {
  const search = normalizeSearch(name);
  if (!search) {
    return null;
  }
  return mergeMedicationEntries(medicationDatabase, liveSuggestions).find((record) => normalizeSearch(record.name) === search) || null;
}

export function intakeFromFoodInstructions(instructions) {
  const value = normalizeSearch(instructions);
  if (/empty stomach|before a meal|before meal/.test(value)) {
    return "empty";
  }
  if (/with food|with meals|with meal|milk|stomach upset/.test(value)) {
    return "food";
  }
  if (/water/.test(value)) {
    return "water";
  }
  return "";
}

export function normalizeMedicationPurpose(value) {
  return cleanText(value);
}
