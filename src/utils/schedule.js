import {
  doseKey as sharedDoseKey,
  normalizedSchedule as sharedNormalizedSchedule,
  scheduleMapForForm as sharedScheduleMapForForm,
} from "../../shared/schedule.js";
import { statusLabel as sharedStatusLabel } from "../../shared/doseStatus.js";
import { slotDefinitions } from "../config/constants.js";

export function normalizedSchedule(med) {
  return sharedNormalizedSchedule(med, slotDefinitions);
}

export function scheduleMapForForm(med) {
  return sharedScheduleMapForForm(med, slotDefinitions);
}

export function doseKey(medId, slotId) {
  return sharedDoseKey(medId, slotId);
}

export function statusLabel(status) {
  return sharedStatusLabel(status);
}
