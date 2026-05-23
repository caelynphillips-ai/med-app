import React, { useEffect, useMemo, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import {
  categoryLabels,
  defaultScheduleSlots,
  intakeLabels,
  MEDICATION_SCHEMA_VERSION,
  medicationCategories,
} from "../../../shared/medicationSchema.js";
import { commonUseLabel, commonUseValue, parseCommonUses } from "../../../shared/commonUses.js";
import { normalizedSchedule } from "../../../shared/schedule.js";
import { normalizeCategory } from "../../../shared/rxterms.js";
import { ActionButton } from "../components/action-button.js";
import { Chip } from "../components/chip.js";
import { FieldLabel } from "../components/field-label.js";
import { routes } from "../navigation/routes.js";
import {
  findSelectedMedication,
  intakeFromFoodInstructions,
  mergeSuggestions,
  searchLiveMedicationSuggestions,
  searchLocalMedicationSuggestions,
} from "../services/suggestion-service.js";
import { colors, radius, spacing, typography } from "../theme/tokens.js";

export function MedicationFormScreen({ medication, onNavigate, onSave }) {
  const editing = Boolean(medication?.id);
  const [form, setForm] = useState(() => formFromMedication(medication));
  const [schedule, setSchedule] = useState(() => scheduleFromMedication(medication));
  const [localSuggestions, setLocalSuggestions] = useState([]);
  const [liveSuggestions, setLiveSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const suggestions = useMemo(
    () => (suggestionsOpen ? mergeSuggestions(localSuggestions, liveSuggestions).slice(0, 8) : []),
    [liveSuggestions, localSuggestions, suggestionsOpen],
  );
  const dosageOptions = selectedSuggestion?.strengthsAndForms || [];
  const commonUseOptions = selectedSuggestion?.commonUses || [];
  const selectedUses = parseCommonUses(form.purpose);

  useEffect(() => {
    const query = form.name.trim();
    if (!suggestionsOpen) {
      return undefined;
    }
    if (!query) {
      setLocalSuggestions([]);
      setLiveSuggestions([]);
      setSelectedSuggestion(null);
      return undefined;
    }

    const local = searchLocalMedicationSuggestions(query);
    setLocalSuggestions(local);
    const exact = findSelectedMedication(query, []);
    if (exact) {
      setSelectedSuggestion(exact);
    } else {
      setSelectedSuggestion(null);
    }

    if (query.length < 2 || local.length >= 3) {
      setLiveSuggestions([]);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const live = await searchLiveMedicationSuggestions(query);
        if (cancelled) {
          return;
        }
        setLiveSuggestions(live);
        const liveExact = findSelectedMedication(query, live);
        if (liveExact) {
          setSelectedSuggestion(liveExact);
        }
      } catch {
        if (!cancelled) {
          setLiveSuggestions([]);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [form.name, suggestionsOpen]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateName(value) {
    setSuggestionsOpen(true);
    updateField("name", value);
  }

  function selectSuggestion(record) {
    setSelectedSuggestion(record);
    setForm((current) => ({
      ...current,
      name: record.name || current.name,
      genericName: record.genericName || current.genericName || "",
      category: normalizeCategory(record.category || current.category),
      purpose: record.commonUses?.length && !current.purpose ? commonUseValue(record.commonUses[0]) : current.purpose,
      foodInstructions: record.foodInstructions || current.foodInstructions,
      intake: record.foodInstructions ? intakeFromFoodInstructions(record.foodInstructions) : current.intake,
    }));
    setLocalSuggestions([]);
    setLiveSuggestions([]);
    setSuggestionsOpen(false);
    Keyboard.dismiss();
  }

  function addCommonUse(value) {
    const nextUse = commonUseValue(value);
    const currentUses = parseCommonUses(form.purpose);
    const exists = currentUses.some((use) => use.toLowerCase() === nextUse.toLowerCase());
    if (!nextUse || exists) {
      return;
    }
    updateField("purpose", [...currentUses, nextUse].join(", "));
  }

  function removeCommonUse(value) {
    const nextUses = parseCommonUses(form.purpose).filter((use) => use.toLowerCase() !== value.toLowerCase());
    updateField("purpose", nextUses.join(", "));
  }

  function toggleSlot(slotId) {
    setSchedule((current) => ({
      ...current,
      [slotId]: {
        ...current[slotId],
        checked: !current[slotId]?.checked,
      },
    }));
  }

  function updateSlotTime(slotId, time) {
    setSchedule((current) => ({
      ...current,
      [slotId]: {
        ...(current[slotId] || {}),
        checked: true,
        time,
      },
    }));
  }

  async function submit() {
    const name = form.name.trim();
    if (!name) {
      setError("Medication name is required.");
      return;
    }
    if (!form.purpose.trim()) {
      setError("Add a purpose so the medication is easier to recognize later.");
      return;
    }
    if (!form.dosage.trim()) {
      setError("Add a dosage from the label or type your own.");
      return;
    }

    const selectedSchedule = defaultScheduleSlots
      .filter((slot) => schedule[slot.id]?.checked)
      .map((slot) => ({
        id: slot.id,
        label: slot.label,
        time: schedule[slot.id]?.time || slot.time,
      }));

    setSaving(true);
    setError("");
    try {
      const medicationPayload = {
        schemaVersion: medication?.schemaVersion || MEDICATION_SCHEMA_VERSION,
        name,
        genericName: form.genericName?.trim() || "",
        category: form.category,
        purpose: form.purpose.trim(),
        dosage: form.dosage.trim(),
        timesPerDay: Number(form.timesPerDay) || selectedSchedule.length || 1,
        schedule: selectedSchedule.length ? selectedSchedule : [{ id: "morning", label: "Morning", time: "08:00" }],
        intake: form.intake,
        foodInstructions: form.foodInstructions.trim(),
        notes: form.notes.trim(),
        reminder: {
          enabled: form.reminderEnabled,
          leadMinutes: Number(form.reminderLeadMinutes) || 15,
        },
      };
      if (medication?.attachment) {
        medicationPayload.attachment = medication.attachment;
      }
      const savedId = await onSave(
        medicationPayload,
        medication?.id || "",
      );
      onNavigate({ route: medication?.id ? routes.medicationDetail : routes.medications, medicationId: medication?.id || savedId });
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <View>
          <Text selectable style={styles.eyebrow}>
            {editing ? "EDIT" : "ADD"}
          </Text>
          <Text selectable style={styles.title}>
            {editing ? "Edit medication" : "Add medication"}
          </Text>
        </View>
        <ActionButton disabled={saving} tone="quiet" onPress={() => onNavigate({ route: medication?.id ? routes.medicationDetail : routes.medications, medicationId: medication?.id })}>
          Cancel
        </ActionButton>
      </View>

      {error ? (
        <View style={styles.error}>
          <Text selectable style={styles.errorText}>
            {error}
          </Text>
        </View>
      ) : null}

      <View style={styles.formCard}>
        <Field label="Name">
          <TextInput
            autoCapitalize="words"
            onChangeText={updateName}
            onFocus={() => {
              if (form.name.trim()) {
                setSuggestionsOpen(true);
              }
            }}
            placeholder="Start typing a medication name"
            placeholderTextColor={colors.mutedText}
            style={styles.input}
            value={form.name}
          />
          {suggestions.length ? (
            <View style={styles.suggestionList}>
              {suggestions.map((record) => (
                <Pressable key={`${record.name}-${record.rxTermsName}`} onPress={() => selectSuggestion(record)} style={styles.suggestion}>
                  <Text style={styles.suggestionName}>{record.name}</Text>
                  <Text style={styles.suggestionMeta}>{record.strengthsAndForms?.slice(0, 2).join(", ") || categoryLabels[normalizeCategory(record.category)]}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Field>

        <Field label="Common uses / purpose">
          <TextInput
            onChangeText={(value) => updateField("purpose", value)}
            placeholder="Add a purpose or select common uses, e.g. blood pressure"
            placeholderTextColor={colors.mutedText}
            style={styles.input}
            value={form.purpose}
          />
          {selectedUses.length ? (
            <View style={styles.chipRow}>
              {selectedUses.map((use) => (
                <Chip key={use} removable selected onRemove={() => removeCommonUse(use)}>
                  {commonUseLabel(use)}
                </Chip>
              ))}
            </View>
          ) : null}
          {commonUseOptions.length ? (
            <View style={styles.chipRow}>
              {commonUseOptions.map((use) => (
                <Chip key={use} onPress={() => addCommonUse(use)}>
                  {commonUseLabel(use)}
                </Chip>
              ))}
            </View>
          ) : null}
        </Field>

        <Field label="Category">
          <View style={styles.chipRow}>
            {medicationCategories.map((category) => (
              <Chip key={category} selected={form.category === category} onPress={() => updateField("category", category)}>
                {categoryLabels[category]}
              </Chip>
            ))}
          </View>
        </Field>

        <Field label="Dosage">
          <TextInput
            onChangeText={(value) => updateField("dosage", value)}
            placeholder="eg. 10 mg Tab"
            placeholderTextColor={colors.mutedText}
            style={styles.input}
            value={form.dosage}
          />
          {dosageOptions.length ? (
            <View style={styles.chipRow}>
              {dosageOptions.map((dosage) => (
                <Chip key={dosage} selected={form.dosage === dosage} onPress={() => updateField("dosage", dosage)}>
                  {dosage}
                </Chip>
              ))}
            </View>
          ) : null}
        </Field>

        <View style={styles.row}>
          <Field label="Times per day" style={styles.rowField}>
            <TextInput
              keyboardType="number-pad"
              onChangeText={(value) => updateField("timesPerDay", value)}
              placeholder="1"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
              value={String(form.timesPerDay)}
            />
          </Field>
          <Field label="Reminder lead time" style={styles.rowField}>
            <TextInput
              keyboardType="number-pad"
              onChangeText={(value) => updateField("reminderLeadMinutes", value)}
              placeholder="15"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
              value={String(form.reminderLeadMinutes)}
            />
          </Field>
        </View>

        <Field label="Specific times of day">
          <View style={styles.scheduleGrid}>
            {defaultScheduleSlots.map((slot) => (
              <View key={slot.id} style={styles.scheduleItem}>
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: schedule[slot.id]?.checked }} onPress={() => toggleSlot(slot.id)} style={styles.scheduleCheck}>
                  <Text style={styles.scheduleCheckText}>{schedule[slot.id]?.checked ? "On" : "Off"}</Text>
                </Pressable>
                <Text style={styles.scheduleLabel}>{slot.label}</Text>
                <TextInput
                  onChangeText={(value) => updateSlotTime(slot.id, value)}
                  placeholder={slot.time}
                  placeholderTextColor={colors.mutedText}
                  style={styles.timeInput}
                  value={schedule[slot.id]?.time || slot.time}
                />
              </View>
            ))}
          </View>
        </Field>

        <Field label="How it should be taken">
          <View style={styles.chipRow}>
            {Object.entries(intakeLabels).map(([key, label]) => (
              <Chip key={key} selected={form.intake === key} onPress={() => updateField("intake", key)}>
                {label}
              </Chip>
            ))}
          </View>
        </Field>

        <Field label="Instructions">
          <TextInput
            onChangeText={(value) => updateField("foodInstructions", value)}
            placeholder="Add instructions, e.g. take with food, before bed, avoid alcohol"
            placeholderTextColor={colors.mutedText}
            style={styles.input}
            value={form.foodInstructions}
          />
        </Field>

        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchTitle}>Turn on dose reminders</Text>
            <Text style={styles.switchCopy}>This shows reminder cards and, with permission, schedules calm phone reminders.</Text>
          </View>
          <Switch
            onValueChange={(value) => updateField("reminderEnabled", value)}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.white}
            value={form.reminderEnabled}
          />
        </View>

        <Field label="Additional notes">
          <TextInput
            multiline
            onChangeText={(value) => updateField("notes", value)}
            placeholder="Side effects, doctor instructions, refill info, or reminders"
            placeholderTextColor={colors.mutedText}
            style={[styles.input, styles.textArea]}
            textAlignVertical="top"
            value={form.notes}
          />
        </Field>

        <View style={styles.footer}>
          <ActionButton disabled={saving} tone="quiet" onPress={() => onNavigate({ route: medication?.id ? routes.medicationDetail : routes.medications, medicationId: medication?.id })}>
            Cancel
          </ActionButton>
          <ActionButton disabled={saving} onPress={submit}>
            {saving ? "Saving..." : "Save medication"}
          </ActionButton>
        </View>
      </View>
    </View>
  );
}

function Field({ children, label, style }) {
  return (
    <View style={[styles.field, style]}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </View>
  );
}

function formFromMedication(medication) {
  return {
    name: medication?.name || "",
    genericName: medication?.genericName || "",
    category: medication?.category || "prescription",
    purpose: medication?.purpose || "",
    dosage: medication?.dosage || "",
    timesPerDay: String(medication?.timesPerDay || 1),
    intake: medication?.intake || "water",
    foodInstructions: medication?.foodInstructions || "",
    notes: medication?.notes || "",
    reminderEnabled: Boolean(medication?.reminder?.enabled),
    reminderLeadMinutes: String(medication?.reminder?.leadMinutes || 15),
  };
}

function scheduleFromMedication(medication) {
  const schedule = {};
  defaultScheduleSlots.forEach((slot) => {
    schedule[slot.id] = { checked: !medication && slot.id === "morning", time: slot.time };
  });
  if (medication) {
    normalizedSchedule(medication).forEach((slot) => {
      if (schedule[slot.id]) {
        schedule[slot.id] = { checked: true, time: slot.time };
      }
    });
  }
  return schedule;
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  error: {
    backgroundColor: "rgba(201, 123, 99, 0.22)",
    borderColor: colors.alert,
    borderCurve: "continuous",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  errorText: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "800",
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: "900",
  },
  field: {
    gap: spacing.sm,
  },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "flex-end",
  },
  formCard: {
    backgroundColor: colors.surface,
    borderCurve: "continuous",
    borderRadius: radius.lg,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  rowField: {
    flex: 1,
    minWidth: 150,
  },
  scheduleCheck: {
    backgroundColor: colors.light,
    borderCurve: "continuous",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  scheduleCheckText: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "900",
  },
  scheduleGrid: {
    gap: spacing.sm,
  },
  scheduleItem: {
    alignItems: "center",
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  scheduleLabel: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    fontWeight: "900",
  },
  screen: {
    gap: spacing.lg,
  },
  suggestion: {
    backgroundColor: colors.light,
    borderCurve: "continuous",
    borderRadius: radius.sm,
    gap: 2,
    padding: spacing.md,
  },
  suggestionList: {
    gap: spacing.sm,
  },
  suggestionMeta: {
    color: colors.mutedText,
    fontSize: typography.small,
  },
  suggestionName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900",
  },
  switchCopy: {
    color: colors.mutedText,
    fontSize: typography.small,
    lineHeight: 18,
  },
  switchRow: {
    alignItems: "center",
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  switchText: {
    flex: 1,
    gap: spacing.xs,
  },
  switchTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900",
  },
  textArea: {
    minHeight: 110,
  },
  timeInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    width: 104,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "900",
    lineHeight: 40,
  },
});
