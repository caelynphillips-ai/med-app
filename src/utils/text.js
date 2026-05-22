export function cleanText(value) {
  return String(value || "").trim();
}

export function normalizeSearch(value) {
  return cleanText(value).toLowerCase();
}

export function titleCase(value) {
  return String(value || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function initialsForUser(user) {
  const source = user.displayName || user.email || "M";
  return source
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function slug(value) {
  return String(value || "dose").replace(/[^a-z0-9_-]/gi, "_");
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
