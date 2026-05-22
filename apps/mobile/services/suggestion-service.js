import medicationData from "../../../shared/medication-data/medications.json";
import { fetchRxTermsSuggestions, mergeMedicationEntries, normalizeMedicationEntry } from "../../../shared/rxterms.js";
import {
  findMedicationRecordByName,
  getMedicationSuggestions,
  intakeFromFoodInstructions,
} from "../../../shared/suggestions.js";

const localMedicationDatabase = Array.isArray(medicationData) ? medicationData.map(normalizeMedicationEntry) : [];
const liveCache = new Map();

export function searchLocalMedicationSuggestions(query) {
  return getMedicationSuggestions(localMedicationDatabase, query);
}

export async function searchLiveMedicationSuggestions(query) {
  const key = String(query || "").trim().toLowerCase();
  if (key.length < 2) {
    return [];
  }
  if (liveCache.has(key)) {
    return liveCache.get(key);
  }
  const results = await fetchRxTermsSuggestions(key);
  liveCache.set(key, results);
  return results;
}

export function mergeSuggestions(localSuggestions, liveSuggestions) {
  return mergeMedicationEntries(localSuggestions, liveSuggestions);
}

export function findSelectedMedication(name, liveSuggestions = []) {
  return findMedicationRecordByName(name, localMedicationDatabase, liveSuggestions);
}

export { intakeFromFoodInstructions };
