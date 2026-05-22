import { normalizeMedicationEntry } from "../rxterms.js";
import {
  findMedicationRecordByName as findSharedMedicationRecordByName,
  getMedicationSuggestions as getSharedMedicationSuggestions,
} from "../../shared/suggestions.js";

export async function loadMedicationDatabase(fetchImpl = fetch) {
  const response = await fetchImpl("./src/medications.json");
  if (!response.ok) {
    throw new Error("Medication database could not be loaded.");
  }
  const medications = await response.json();
  return Array.isArray(medications) ? medications.map(normalizeMedicationEntry) : [];
}

export function getMedicationSuggestions(medicationDatabase, query) {
  return getSharedMedicationSuggestions(medicationDatabase, query);
}

export function findMedicationRecordByName(name, medicationDatabase, liveSuggestions = []) {
  return findSharedMedicationRecordByName(name, medicationDatabase, liveSuggestions);
}
