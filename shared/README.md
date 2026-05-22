# Shared App Contract

This folder is the agreement between the web, desktop, and iOS apps.

All clients use the same Firebase project, the same Firestore paths, the same Storage paths, and the same field names. When one app adds or updates a medication, the other clients should be able to read it without migrations or special cases.

## Shared Backend Paths

- Medications: `users/{uid}/medications/{medicationId}`
- Dose statuses: `users/{uid}/doseStatus/{yyyy-mm-dd}`
- Attachments: `users/{uid}/medications/{medicationId}/{timestamp}-{filename}`

## Required Disclaimer

This app is for personal organization only and does not provide medical advice. Confirm medication details with the prescription label, doctor, or pharmacist.

## Source Data

Medication suggestions are local-first. Shared cross-platform data lives in `shared/medication-data/medications.json`; the web app still serves its browser copy from `src/medications.json` until the next web data-loading cleanup.

The data shape allows RxTerms today and can later be expanded with RxNorm, DailyMed, openFDA, or a private formulary file.
