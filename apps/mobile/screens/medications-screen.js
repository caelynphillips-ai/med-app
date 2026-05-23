import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
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

export function MedicationsScreen({ medications, onNavigate }) {
  const [controls, setControls] = React.useState(defaultMedicationListControls);
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

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <View>
          <Text selectable style={styles.eyebrow}>
            {countLabel.toUpperCase()}
          </Text>
          <Text selectable style={styles.title}>
            Medication list
          </Text>
        </View>
        <ActionButton onPress={() => onNavigate({ route: routes.medicationForm })}>Add</ActionButton>
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
            key={medication.id}
            medication={medication}
            onPress={() => onNavigate({ route: routes.medicationDetail, medicationId: medication.id })}
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
      <FilterGroup
        label="Sort"
        options={medicationSortOptions}
        selectedValue={controls.sort}
        onSelect={(value) => onUpdate("sort", value)}
      />

      {filtersActive ? (
        <ActionButton tone="quiet" onPress={onClear}>
          Clear filters
        </ActionButton>
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

function MedicationCard({ medication, onPress }) {
  const schedule = normalizedSchedule(medication)
    .map((slot) => `${slot.label} ${formatClock(slot.time)}`)
    .join(", ");
  const refillInfo = getRefillInfo(medication);

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.cardTop}>
        <View style={styles.cardTitleColumn}>
          <Text selectable style={styles.name}>
            {medication.name}
          </Text>
          <Text selectable style={styles.detail}>
            {medication.dosage || "No dosage"} - {medication.purpose || "No purpose"}
          </Text>
        </View>
        <View style={styles.category}>
          <Text style={styles.categoryText}>{categoryLabels[medication.category] || medication.category || "Medication"}</Text>
        </View>
      </View>
      <Text selectable style={styles.schedule}>
        {schedule}
      </Text>
      {refillInfo.isTracking ? (
        <View style={[styles.refillPill, refillInfo.isLowSupply && styles.refillPillLow]}>
          <Text style={styles.refillPillText}>{refillStatusLabel(medication)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderCurve: "continuous",
    borderRadius: radius.md,
    gap: spacing.md,
    padding: spacing.lg,
  },
  cardTitleColumn: {
    flex: 1,
    gap: 4,
  },
  cardTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
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
    color: colors.text,
    fontSize: typography.small,
    lineHeight: 19,
    opacity: 0.76,
  },
  empty: {
    backgroundColor: colors.light,
    borderCurve: "continuous",
    borderRadius: radius.lg,
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
  controlsCard: {
    backgroundColor: colors.light,
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  filterChip: {
    backgroundColor: "rgba(63, 70, 63, 0.08)",
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
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
    gap: spacing.md,
    justifyContent: "space-between",
  },
  name: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.78,
  },
  refillPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.light,
    borderCurve: "continuous",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  refillPillLow: {
    backgroundColor: colors.alert,
  },
  refillPillText: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "900",
  },
  searchInput: {
    backgroundColor: colors.background,
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
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "800",
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
});
