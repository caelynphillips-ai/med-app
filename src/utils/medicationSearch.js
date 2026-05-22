import { normalizeSearch } from "./text.js";

export function medicationSearchText(record) {
  return normalizeSearch(
    [
      record.name,
      record.genericName,
      ...(record.brandNames || []),
      ...(record.strengthsAndForms || []),
      ...(record.commonUses || []),
    ].join(" "),
  );
}

export function medicationSearchRank(record, search) {
  const fields = [
    record.name,
    record.genericName,
    ...(record.brandNames || []),
    ...(record.strengthsAndForms || []),
  ].map(normalizeSearch);

  if (fields.some((field) => field === search)) {
    return 0;
  }
  if (fields.some((field) => field.startsWith(search))) {
    return 1;
  }
  if (fields.some((field) => field.includes(search))) {
    return 2;
  }
  return 3;
}
