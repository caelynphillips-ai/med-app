import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchRxTermsSuggestions, mergeMedicationEntries, normalizeMedicationEntry } from "../src/rxterms.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const medicationFile = resolve(projectRoot, "src", "medications.json");

// Update this list, or pass search terms as CLI args, to refresh the local RxTerms seed data.
// This keeps the app fast because the UI searches local JSON first and only uses live RxTerms as a fallback.
const defaultQueries = [
  "acetaminophen",
  "amlodipine",
  "amoxicillin",
  "aspirin",
  "atorvastatin",
  "cetirizine",
  "ibuprofen",
  "levothyroxine",
  "lisinopril",
  "loratadine",
  "metformin",
  "omeprazole",
];

const queries = process.argv.slice(2);
const searchTerms = queries.length ? queries : defaultQueries;
const existing = JSON.parse(await readFile(medicationFile, "utf8")).map(normalizeMedicationEntry);
const fetchedGroups = [];

for (const term of searchTerms) {
  const results = await fetchRxTermsSuggestions(term);
  fetchedGroups.push(results);
  console.log(`Fetched ${results.length} RxTerms suggestion(s) for "${term}"`);
}

const merged = mergeMedicationEntries(existing, ...fetchedGroups).sort((a, b) => a.name.localeCompare(b.name));
await writeFile(`${medicationFile}`, `${JSON.stringify(merged, null, 2)}\n`);
console.log(`Saved ${merged.length} medication suggestion(s) to ${medicationFile}`);
