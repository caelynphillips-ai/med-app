import { normalizedSchedule } from "./schedule.js";

export function normalizeRefillNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return null;
  }
  return Math.max(0, number);
}

export function getDailyDoseCount(medication) {
  const explicit = Number(medication?.timesPerDay);
  if (Number.isFinite(explicit) && explicit > 0) {
    return explicit;
  }
  return Math.max(1, normalizedSchedule(medication).length);
}

export function getRefillInfo(medication) {
  const quantityRemaining = normalizeRefillNumber(medication?.quantityRemaining);
  const refillThreshold = normalizeRefillNumber(medication?.refillThreshold);
  const refillReminderEnabled = Boolean(medication?.refillReminderEnabled);
  const lastRefillDate = medication?.lastRefillDate || "";
  const dailyDoseCount = getDailyDoseCount(medication);
  const estimatedDaysRemaining = quantityRemaining === null ? null : Math.floor(quantityRemaining / dailyDoseCount);
  const daysUntilThreshold =
    quantityRemaining === null || refillThreshold === null
      ? null
      : Math.max(0, Math.ceil((quantityRemaining - refillThreshold) / dailyDoseCount));
  const isLowSupply = quantityRemaining !== null && refillThreshold !== null && quantityRemaining <= refillThreshold;

  return {
    dailyDoseCount,
    daysUntilThreshold,
    estimatedDaysRemaining,
    isLowSupply,
    isTracking: quantityRemaining !== null || refillThreshold !== null || refillReminderEnabled || Boolean(lastRefillDate),
    lastRefillDate,
    quantityRemaining,
    refillReminderEnabled,
    refillThreshold,
    reminderEligible: refillReminderEnabled && quantityRemaining !== null && refillThreshold !== null,
  };
}

export function refillStatusLabel(medication) {
  const info = getRefillInfo(medication);
  if (!info.isTracking) {
    return "Not tracking refills";
  }
  if (info.isLowSupply) {
    return "Low supply";
  }
  if (info.estimatedDaysRemaining !== null) {
    return `About ${info.estimatedDaysRemaining} day${info.estimatedDaysRemaining === 1 ? "" : "s"} left`;
  }
  return "Refill tracking on";
}

export function refillQuantityLabel(value, fallback = "Not set") {
  const quantity = normalizeRefillNumber(value);
  if (quantity === null) {
    return fallback;
  }
  return `${formatRefillNumber(quantity)} remaining`;
}

export function refillThresholdLabel(value, fallback = "Not set") {
  const threshold = normalizeRefillNumber(value);
  if (threshold === null) {
    return fallback;
  }
  return `${formatRefillNumber(threshold)} or less`;
}

export function formatRefillNumber(value) {
  const number = normalizeRefillNumber(value);
  if (number === null) {
    return "";
  }
  return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/, "");
}
