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

export function normalizeRefillDateInput(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return normalizeDateParts(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const friendlyMatch = text.match(/^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})$/);
  if (!friendlyMatch) {
    return null;
  }

  const first = Number(friendlyMatch[1]);
  const second = Number(friendlyMatch[2]);
  const year = normalizeYear(friendlyMatch[3]);
  const month = first > 12 ? second : first;
  const day = first > 12 ? first : second;

  return normalizeDateParts(year, month, day);
}

export function getDailyDoseCount(medication) {
  const explicit = Number(medication?.timesPerDay);
  if (Number.isFinite(explicit) && explicit > 0) {
    return explicit;
  }
  return Math.max(1, normalizedSchedule(medication).length);
}

export function normalizeQuantityPerDose(value) {
  const quantity = normalizeRefillNumber(value);
  return quantity !== null && quantity > 0 ? quantity : null;
}

function normalizeDateParts(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeYear(value) {
  const year = Number(value);
  if (String(value).length === 2) {
    return 2000 + year;
  }
  return year;
}

export function getRefillInfo(medication) {
  const quantityRemaining = normalizeRefillNumber(medication?.quantityRemaining);
  const quantityPerDose = normalizeQuantityPerDose(medication?.quantityPerDose);
  const refillThreshold = normalizeRefillNumber(medication?.refillThreshold);
  const refillReminderEnabled = Boolean(medication?.refillReminderEnabled);
  const lastRefillDate = medication?.lastRefillDate || "";
  const dailyDoseCount = getDailyDoseCount(medication);
  const dailyQuantityUse = dailyDoseCount * (quantityPerDose || 1);
  const estimatedDaysRemaining = quantityRemaining === null ? null : quantityRemaining / dailyQuantityUse;
  const daysUntilThreshold =
    quantityRemaining === null || refillThreshold === null
      ? null
      : Math.max(0, Math.ceil((quantityRemaining - refillThreshold) / dailyQuantityUse));
  const isLowSupply = quantityRemaining !== null && refillThreshold !== null && quantityRemaining <= refillThreshold;

  return {
    dailyQuantityUse,
    dailyDoseCount,
    daysUntilThreshold,
    estimatedDaysRemaining,
    isLowSupply,
    isTracking:
      quantityRemaining !== null ||
      quantityPerDose !== null ||
      refillThreshold !== null ||
      refillReminderEnabled ||
      Boolean(lastRefillDate),
    lastRefillDate,
    quantityPerDose,
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
    return `About ${formatRefillNumber(info.estimatedDaysRemaining)} day${info.estimatedDaysRemaining === 1 ? "" : "s"} left`;
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

export function refillQuantityPerDoseLabel(value, fallback = "Not set") {
  const quantity = normalizeQuantityPerDose(value);
  if (quantity === null) {
    return fallback;
  }
  return `${formatRefillNumber(quantity)} per dose`;
}

export function formatRefillNumber(value) {
  const number = normalizeRefillNumber(value);
  if (number === null) {
    return "";
  }
  return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/, "");
}
