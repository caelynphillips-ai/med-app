export type MedicationCategory = "prescription" | "over-the-counter" | "vitamin" | "supplement";
export type IntakeInstruction = "food" | "water" | "empty";
export type PersistedDoseStatus = "taken" | "skipped" | "missed";
export type ClientName = "web" | "desktop" | "ios";

export interface MedicationScheduleSlot {
  id: string;
  label: string;
  time: string;
}

export interface MedicationReminder {
  enabled: boolean;
  leadMinutes: number;
}

export interface MedicationAttachment {
  name: string;
  path: string;
  url: string;
  contentType: string;
  uploadedAt: string;
}

export interface Medication {
  id?: string;
  schemaVersion: 1;
  ownerId: string;
  name: string;
  genericName?: string | null;
  category: MedicationCategory;
  purpose: string;
  dosage: string;
  timesPerDay: number;
  schedule: MedicationScheduleSlot[];
  intake: IntakeInstruction;
  foodInstructions?: string | null;
  notes?: string | null;
  quantityRemaining?: number | null;
  quantityPerDose?: number | null;
  refillThreshold?: number | null;
  refillReminderEnabled?: boolean | null;
  lastRefillDate?: string | null;
  reminder: MedicationReminder;
  attachment?: MedicationAttachment | null;
  updatedBy?: string | null;
  updatedFrom?: ClientName | null;
}

export interface DoseStatusEntry {
  status: PersistedDoseStatus;
  updatedAt: string;
  updatedBy?: string | null;
  updatedFrom?: ClientName | null;
}

export interface DoseStatusDocument {
  statuses: Record<string, DoseStatusEntry>;
  updatedBy?: string | null;
  updatedFrom?: ClientName | null;
}

export interface MedicationSuggestion {
  name: string;
  genericName?: string | null;
  brandNames: string[];
  category: string;
  rxTermsName?: string | null;
  strengthsAndForms: string[];
  commonUses: string[];
  foodInstructions: string;
  source: string;
  lastUpdated: string;
}
