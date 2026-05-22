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
  const [hours, minutes] = String(time).split(":").map(Number);
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
