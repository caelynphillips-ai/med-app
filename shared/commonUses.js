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

export function commonUseValue(value) {
  return cleanText(value)
    .replace(/^for\s+/i, "")
    .replace(/\s+/g, " ");
}

export function commonUseLabel(value) {
  return titleCase(commonUseValue(value));
}

export function parseCommonUses(value) {
  const seen = new Set();
  return String(value || "")
    .split(",")
    .map(cleanText)
    .filter(Boolean)
    .filter((use) => {
      const key = normalizeSearch(use);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}
