import { cleanText, normalizeSearch, titleCase } from "./text.js";

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
  return "water";
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
