import React from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { categoryLabels } from "../../../shared/medicationSchema.js";
import { getRefillInfo, refillStatusLabel } from "../../../shared/refill.js";
import { normalizedSchedule } from "../../../shared/schedule.js";
import { formatClock } from "../../../shared/dateTime.js";
import {
  defaultMedicationListControls,
  filterAndSortMedications,
  hasActiveMedicationListControls,
  medicationCategoryFilterOptions,
  medicationSortOptions,
  medicationUtilityFilterOptions,
} from "../../../shared/medicationList.js";
import { ActionButton } from "../components/action-button.js";
import { colors, radius, shadows, spacing, typography } from "../theme/tokens.js";
import { routes } from "../navigation/routes.js";

export function MedicationsScreen({ medications, onDelete, onNavigate }) {
  const [controls, setControls] = React.useState(defaultMedicationListControls);
  const [deletingId, setDeletingId] = React.useState("");
  const visibleMedications = React.useMemo(() => filterAndSortMedications(medications, controls), [controls, medications]);
  const filtersActive = hasActiveMedicationListControls(controls);
  const countLabel = medications.length
    ? filtersActive
      ? `${visibleMedications.length} of ${medications.length} shown`
      : `${medications.length} saved`
    : "0 saved";

  function updateControl(key, value) {
    setControls((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function clearControls() {
    setControls(defaultMedicationListControls());
  }

  function confirmDelete(medication) {
    Alert.alert("Delete medication", `Delete ${medication.name}? This removes it from your organizer.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeletingId(medication.id);
          try {
            await onDelete(medication.id);
          } catch {
            // The shared mobile error banner is set by the data hook.
          } finally {
            setDeletingId("");
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text selectable style={styles.eyebrow}>
            {countLabel.toUpperCase()}
          </Text>
          <Text selectable style={styles.title}>
            Medication list
          </Text>
          <Text selectable style={styles.subtitle}>
            Search, filter, and manage each saved medication.
          </Text>
        </View>
        <ActionButton onPress={() => onNavigate({ route: routes.medicationForm })}>Add medication</ActionButton>
      </View>

      {medications.length ? (
        <MedicationListControls
          controls={controls}
          filtersActive={filtersActive}
          onClear={clearControls}
          onUpdate={updateControl}
        />
      ) : null}

      {medications.length && visibleMedications.length ? (
        visibleMedications.map((medication) => (
          <MedicationCard
            deleting={deletingId === medication.id}
            key={medication.id}
            medication={medication}
            onDelete={() => confirmDelete(medication)}
            onDetails={() => onNavigate({ route: routes.medicationDetail, medicationId: medication.id })}
            onEdit={() => onNavigate({ route: routes.medicationForm, medicationId: medication.id })}
          />
        ))
      ) : medications.length ? (
        <View style={styles.empty}>
          <Text selectable style={styles.emptyTitle}>
            No medications match
          </Text>
          <Text selectable style={styles.emptyText}>
            Try a different search, category, status, or sort option.
          </Text>
          <ActionButton onPress={clearControls}>Clear filters</ActionButton>
        </View>
      ) : (
        <View style={styles.empty}>
          <Text selectable style={styles.emptyTitle}>
            No saved medications yet
          </Text>
          <Text selectable style={styles.emptyText}>
            Add your first medication, vitamin, or supplement to start building today's schedule.
          </Text>
          <ActionButton onPress={() => onNavigate({ route: routes.medicationForm })}>Add medication</ActionButton>
        </View>
      )}
    </View>
  );
}

function MedicationListControls({ controls, filtersActive, onClear, onUpdate }) {
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [sortOpen, setSortOpen] = React.useState(false);
  const activeFilterCount = Number((controls.category || "all") !== "all") + Number((controls.utility || "all") !== "all");
  const selectedSort = medicationSortOptions.find((option) => option.value === controls.sort) || medicationSortOptions[0];

  return (
    <View style={styles.controlsCard}>
      <View style={styles.field}>
        <Text selectable style={styles.controlLabel}>
          Search medications
        </Text>
        <TextInput
          accessibilityLabel="Search medications"
          onChangeText={(value) => onUpdate("query", value)}
          placeholder="Search name, purpose, dosage, instructions, notes"
          placeholderTextColor={colors.mutedText}
          style={styles.searchInput}
          value={controls.query}
        />
      </View>

      <View style={styles.controlsToolbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: filtersOpen }}
          onPress={() => setFiltersOpen((open) => !open)}
          style={({ pressed }) => [styles.controlToggle, filtersOpen && styles.controlToggleActive, pressed && styles.pressed]}
        >
          <Text style={[styles.controlToggleText, filtersOpen && styles.controlToggleTextActive]}>
            {activeFilterCount ? `Filter (${activeFilterCount})` : "Filter"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: sortOpen }}
          onPress={() => setSortOpen((open) => !open)}
          style={({ pressed }) => [styles.controlToggle, sortOpen && styles.controlToggleActive, pressed && styles.pressed]}
        >
          <Text style={[styles.controlToggleText, sortOpen && styles.controlToggleTextActive]}>
            Sort: {selectedSort.label}
          </Text>
        </Pressable>
        {filtersActive ? (
          <Pressable accessibilityRole="button" onPress={onClear} style={({ pressed }) => [styles.clearInline, pressed && styles.pressed]}>
            <Text style={styles.clearInlineText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      {filtersOpen ? (
        <View style={styles.advancedPanel}>
          <FilterGroup
            label="Category"
            options={medicationCategoryFilterOptions}
            selectedValue={controls.category}
            onSelect={(value) => onUpdate("category", value)}
          />
          <FilterGroup
            label="Status"
            options={medicationUtilityFilterOptions}
            selectedValue={controls.utility}
            onSelect={(value) => onUpdate("utility", value)}
          />
        </View>
      ) : null}

      {sortOpen ? (
        <View style={styles.advancedPanel}>
          <FilterGroup
            label="Sort by"
            options={medicationSortOptions}
            selectedValue={controls.sort}
            onSelect={(value) => {
              onUpdate("sort", value);
              setSortOpen(false);
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

function FilterGroup({ label, onSelect, options, selectedValue }) {
  return (
    <View style={styles.field}>
      <Text selectable style={styles.controlLabel}>
        {label}
      </Text>
      <View style={styles.chipRow}>
        {options.map((option) => {
          const active = option.value === selectedValue;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function MedicationCard({ deleting, medication, onDelete, onDetails, onEdit }) {
  const scheduleSlots = normalizedSchedule(medication);
  const nextSlot = scheduleSlots[0];
  const schedule = scheduleSlots.map((slot) => `${slot.label} ${formatClock(slot.time)}`).join(", ");
  const refillInfo = getRefillInfo(medication);
  const purpose = medication.purpose?.trim() || "Add purpose";
  const dosage = medication.dosage?.trim() || "Add dosage";
  const purposeMissing = !medication.purpose?.trim();
  const dosageMissing = !medication.dosage?.trim();

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardTitleColumn}>
          <Text selectable style={styles.name}>
            {medication.name}
          </Text>
          {purposeMissing ? (
            <PromptChip label={purpose} onPress={onEdit} />
          ) : (
            <Text selectable style={styles.detail}>
              {purpose}
            </Text>
          )}
        </View>
        <View style={styles.category}>
          <Text style={styles.categoryText}>{categoryLabels[medication.category] || medication.category || "Medication"}</Text>
        </View>
      </View>
      <View style={styles.scanGrid}>
        <View style={styles.scanItem}>
          <Text selectable style={styles.scanLabel}>Dosage</Text>
          {dosageMissing ? (
            <PromptChip label={dosage} onPress={onEdit} />
          ) : (
            <Text selectable style={styles.scanValue}>{dosage}</Text>
          )}
        </View>
        <View style={styles.scanItem}>
          <Text selectable style={styles.scanLabel}>Next scheduled</Text>
          <Text selectable style={styles.scanValue}>{nextSlot ? `${nextSlot.label} ${formatClock(nextSlot.time)}` : "No schedule"}</Text>
        </View>
      </View>
      <View style={styles.badgeRow}>
        <View style={styles.refillPill}>
          <Text style={styles.refillPillText}>{medication.reminder?.enabled ? "Reminder on" : "Reminder off"}</Text>
        </View>
        {refillInfo.isTracking ? (
          <View style={[styles.refillPill, refillInfo.isLowSupply && styles.refillPillLow]}>
            <Text style={styles.refillPillText}>{refillStatusLabel(medication)}</Text>
          </View>
        ) : null}
      </View>
      {schedule ? (
        <Text numberOfLines={2} selectable style={styles.schedule}>
          {schedule}
        </Text>
      ) : null}
      {!medication.notes?.trim() ? (
        <View style={styles.notePromptRow}>
          <PromptChip label="Add notes" onPress={onEdit} />
        </View>
      ) : null}
      <View style={styles.cardActions}>
        <Pressable accessibilityRole="button" onPress={onDetails} style={({ pressed }) => [styles.quickActionPrimary, pressed && styles.pressed]}>
          <Text style={styles.quickActionPrimaryText}>Details</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onEdit} style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}>
          <Text style={styles.quickActionText}>Edit</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: deleting }}
          disabled={deleting}
          onPress={onDelete}
          style={({ pressed }) => [styles.quickActionDanger, deleting && styles.disabled, pressed && !deleting && styles.pressed]}
        >
          <Text style={styles.quickActionDangerText}>{deleting ? "Deleting..." : "Delete"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PromptChip({ label, onPress }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.promptChip, pressed && styles.pressed]}>
      <Text style={styles.promptChipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  advancedPanel: {
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  card: {
    ...shadows.card,
    backgroundColor: colors.cardEmphasis,
    borderColor: "rgba(0, 128, 255, 0.38)",
    borderWidth: 1,
    borderCurve: "continuous",
    borderRadius: radius.lg,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  cardTitleColumn: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 170,
  },
  cardTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  cardActions: {
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "flex-end",
    paddingTop: spacing.md,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  category: {
    backgroundColor: colors.accent,
    borderCurve: "continuous",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  categoryText: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "900",
  },
  detail: {
    color: colors.onEmphasisMuted,
    fontSize: typography.small,
    fontWeight: "800",
    lineHeight: 20,
  },
  disabled: {
    opacity: 0.52,
  },
  empty: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  emptyText: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "900",
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: "900",
  },
  controlLabel: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "900",
  },
  controlToggle: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: radius.pill,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  controlToggleActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.darkPrimary,
  },
  controlToggleText: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "900",
    textAlign: "center",
  },
  controlToggleTextActive: {
    color: colors.darkPrimary,
  },
  controlsToolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  controlsCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  clearInline: {
    alignItems: "center",
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  clearInlineText: {
    color: colors.darkPrimary,
    fontSize: typography.small,
    fontWeight: "900",
  },
  field: {
    gap: spacing.sm,
  },
  filterChip: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.darkPrimary,
  },
  filterChipText: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "900",
  },
  filterChipTextActive: {
    color: colors.text,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  name: {
    color: colors.onPrimary,
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 25,
  },
  pressed: {
    opacity: 0.78,
  },
  promptChip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderColor: "rgba(255, 255, 255, 0.36)",
    borderCurve: "continuous",
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 30,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  promptChipText: {
    color: colors.onPrimary,
    fontSize: typography.small,
    fontWeight: "900",
  },
  notePromptRow: {
    alignItems: "flex-start",
  },
  quickAction: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderColor: "rgba(255, 255, 255, 0.32)",
    borderCurve: "continuous",
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    minWidth: 76,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  quickActionDanger: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    borderColor: "rgba(255, 255, 255, 0.42)",
    borderCurve: "continuous",
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    minWidth: 76,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  quickActionDangerText: {
    color: "#8F3A26",
    fontSize: typography.small,
    fontWeight: "900",
  },
  quickActionPrimary: {
    alignItems: "center",
    backgroundColor: "rgba(253, 252, 248, 0.94)",
    borderCurve: "continuous",
    borderRadius: radius.pill,
    justifyContent: "center",
    minHeight: 36,
    minWidth: 82,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  quickActionPrimaryText: {
    color: colors.darkPrimary,
    fontSize: typography.small,
    fontWeight: "900",
  },
  quickActionText: {
    color: colors.onPrimary,
    fontSize: typography.small,
    fontWeight: "900",
  },
  refillPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.successSoft,
    borderCurve: "continuous",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  refillPillLow: {
    backgroundColor: colors.alertSoft,
  },
  refillPillText: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "900",
  },
  searchInput: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  schedule: {
    color: colors.onEmphasisMuted,
    fontSize: typography.small,
    fontWeight: "800",
    lineHeight: 19,
  },
  scanGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  scanItem: {
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderCurve: "continuous",
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    minWidth: 154,
    padding: spacing.md,
  },
  scanLabel: {
    color: colors.onEmphasisMuted,
    fontSize: typography.label,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  scanValue: {
    color: colors.onPrimary,
    fontSize: typography.body,
    fontWeight: "900",
    lineHeight: 21,
  },
  screen: {
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "900",
    lineHeight: 40,
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: typography.body,
    lineHeight: 22,
  },
});
