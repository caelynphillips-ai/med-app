export const RXTERMS_SEARCH_URL = "https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search";

const DEFAULT_CATEGORY = "Prescription";

export async function fetchRxTermsSuggestions(query, fetchImpl = fetch) {
  const terms = cleanText(query);
  if (terms.length < 2) {
    return [];
  }

  const url = `${RXTERMS_SEARCH_URL}?terms=${encodeURIComponent(terms)}&ef=STRENGTHS_AND_FORMS`;
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`RxTerms request failed with ${response.status}`);
  }

  const data = await response.json();
  return transformRxTermsResponse(data);
}

export function transformRxTermsResponse(data, lastUpdated = new Date().toISOString().slice(0, 10)) {
  if (!Array.isArray(data)) {
    return [];
  }

  const extraFields = data.find((item) => item && typeof item === "object" && !Array.isArray(item)) || {};
  const strengthsByRow = Array.isArray(extraFields.STRENGTHS_AND_FORMS) ? extraFields.STRENGTHS_AND_FORMS : [];
  const displayRows = findDisplayRows(data);
  const fallbackNames = Array.isArray(data[1]) ? data[1].filter((item) => typeof item === "string") : [];
  const rows = displayRows.length ? displayRows : fallbackNames.map((name) => [name]);

  return dedupeMedicationEntries(
    rows
      .map((row, index) => {
        const rawName = Array.isArray(row) ? row.find((value) => typeof value === "string") : row;
        const rxTermsName = normalizeMedicationName(rawName);
        if (!rxTermsName) {
          return null;
        }

        return normalizeMedicationEntry({
          name: rxTermsName,
          genericName: rxTermsName,
          brandNames: [],
          category: DEFAULT_CATEGORY,
          rxTermsName,
          strengthsAndForms: normalizeStringList(strengthsByRow[index]),
          commonUses: [],
          foodInstructions: "",
          source: "RxTerms",
          lastUpdated,
        });
      })
      .filter(Boolean),
  );
}

export function normalizeMedicationEntry(entry) {
  const name = normalizeMedicationName(entry.name || entry.rxTermsName || entry.genericName);
  const genericName = normalizeMedicationName(entry.genericName || name);
  const rxTermsName = normalizeMedicationName(entry.rxTermsName || name);

  return {
    name,
    genericName,
    brandNames: normalizeStringList(entry.brandNames).map(normalizeMedicationName).filter(Boolean),
    category: normalizeCategory(entry.category),
    rxTermsName,
    strengthsAndForms: normalizeStringList(entry.strengthsAndForms || entry.commonDosages),
    commonUses: normalizeStringList(entry.commonUses),
    foodInstructions: cleanText(entry.foodInstructions),
    source: cleanText(entry.source || "Local"),
    lastUpdated: cleanText(entry.lastUpdated),
  };
}

export function mergeMedicationEntries(...entryGroups) {
  return dedupeMedicationEntries(entryGroups.flat().filter(Boolean).map(normalizeMedicationEntry));
}

export function normalizeCategory(category) {
  const value = cleanText(category).toLowerCase();
  if (value.includes("over") || value.includes("otc")) {
    return "over-the-counter";
  }
  if (value.includes("vitamin")) {
    return "vitamin";
  }
  if (value.includes("supplement")) {
    return "supplement";
  }
  return "prescription";
}

export function displayCategory(category) {
  const value = normalizeCategory(category);
  if (value === "over-the-counter") {
    return "Over-the-counter";
  }
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function findDisplayRows(data) {
  const arrays = data.filter(Array.isArray);
  return arrays.find((item) => item.some(Array.isArray)) || [];
}

function dedupeMedicationEntries(entries) {
  const seen = new Set();
  const merged = [];

  entries.forEach((entry) => {
    const key = normalizeSearch(entry.name || entry.rxTermsName);
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    merged.push(entry);
  });

  return merged;
}

function normalizeMedicationName(value) {
  return cleanText(value)
    .replace(/\s+/g, " ")
    .replace(/\b(mg|mcg|ml|oral|tablet|capsule|solution|injection)\b/gi, (match) => match.toUpperCase())
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeStringList(value) {
  const list = Array.isArray(value) ? value.flat(Infinity) : cleanText(value) ? [value] : [];
  return [...new Set(list.map(cleanText).filter(Boolean))];
}

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeSearch(value) {
  return cleanText(value).toLowerCase();
}
