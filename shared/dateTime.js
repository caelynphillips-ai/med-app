export function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fullDateLabel(date = new Date(), locale = undefined) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function minutesFromTime(time = "00:00") {
  const normalized = normalizeTimeInput(time) || "00:00";
  const [hours, minutes] = normalized.split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

export function currentMinutes(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}

export function formatClock(time, locale = undefined) {
  return formatMinutes(minutesFromTime(time), locale);
}

export function formatMinutes(totalMinutes, locale = undefined) {
  const minutes = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2024, 0, 1, hours, mins));
}

export function normalizeTimeInput(value) {
  const parsed = parseTimeInput(value);
  return parsed.valid ? parsed.normalized : "";
}

export function parseTimeInput(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return { valid: false, normalized: "", reason: "empty" };
  }

  const military = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (military) {
    return {
      valid: true,
      normalized: `${military[1].padStart(2, "0")}:${military[2]}`,
      reason: "",
    };
  }

  const compact = raw.replace(/\s+/g, "").toLowerCase();
  const twelveHour = compact.match(/^(\d{1,2})(?::([0-5]\d))?([ap])\.?m\.?$/);
  if (!twelveHour) {
    return { valid: false, normalized: "", reason: "format" };
  }

  const hour = Number(twelveHour[1]);
  const minute = Number(twelveHour[2] || "00");
  const meridiem = twelveHour[3];
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
    return { valid: false, normalized: "", reason: "range" };
  }

  const normalizedHour = meridiem === "a" ? hour % 12 : (hour % 12) + 12;
  return {
    valid: true,
    normalized: `${String(normalizedHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    reason: "",
  };
}
