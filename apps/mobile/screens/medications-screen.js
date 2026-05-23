import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { categoryLabels } from "../../../shared/medicationSchema.js";
import { getRefillInfo, refillStatusLabel } from "../../../shared/refill.js";
import { normalizedSchedule } from "../../../shared/schedule.js";
import { formatClock } from "../../../shared/dateTime.js";
import { ActionButton } from "../components/action-button.js";
import { colors, radius, shadows, spacing, typography } from "../theme/tokens.js";
import { routes } from "../navigation/routes.js";

export function MedicationsScreen({ medications, onNavigate }) {
  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <View>
          <Text selectable style={styles.eyebrow}>
            MEDICATIONS
          </Text>
          <Text selectable style={styles.title}>
            Medication list
          </Text>
        </View>
        <ActionButton onPress={() => onNavigate({ route: routes.medicationForm })}>Add</ActionButton>
      </View>

      {medications.length ? (
        medications.map((medication) => (
          <MedicationCard
            key={medication.id}
            medication={medication}
            onPress={() => onNavigate({ route: routes.medicationDetail, medicationId: medication.id })}
          />
        ))
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
