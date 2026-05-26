import React from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { categoryLabels, intakeLabels } from "../../../shared/medicationSchema.js";
import { getRefillInfo, refillQuantityLabel, refillStatusLabel, refillThresholdLabel } from "../../../shared/refill.js";
import { normalizedSchedule } from "../../../shared/schedule.js";
import { formatClock } from "../../../shared/dateTime.js";
import { ActionButton } from "../components/action-button.js";
import { colors, radius, shadows, spacing, typography } from "../theme/tokens.js";
import { routes } from "../navigation/routes.js";

export function MedicationDetailScreen({ medication, onDelete, onNavigate }) {
  const [deleting, setDeleting] = React.useState(false);
  const refillInfo = getRefillInfo(medication);
  const schedule = medication ? normalizedSchedule(medication) : [];

  if (!medication) {
    return (
      <View style={styles.screen}>
        <Text selectable style={styles.title}>
          Medication not found
        </Text>
        <ActionButton tone="quiet" onPress={() => onNavigate({ route: routes.medications })}>
          Back to medications
        </ActionButton>
      </View>
    );
  }

  function confirmDelete() {
    Alert.alert("Delete medication", `Delete ${medication.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await onDelete(medication.id);
            onNavigate({ route: routes.medications });
          } catch {
            setDeleting(false);
          }
        },
      },
    ]);
  }

  const instructions = medication.foodInstructions || intakeLabels[medication.intake] || "";
  const detailBlocks = [
    { label: "Purpose", value: medication.purpose },
    { label: "Dosage", value: medication.dosage },
    { label: "Category", value: categoryLabels[medication.category] || medication.category || "Medication", always: true },
    { label: "Instructions", value: instructions },
  ].filter((block) => block.always || hasDetailValue(block.value));
  const utilityBlocks = [
    medication.reminder?.enabled
      ? { label: "Reminder", value: `${medication.reminder.leadMinutes || 15} minutes before` }
      : null,
    hasAttachment(medication) ? { label: "Attachment", value: medication.attachment?.name || "Uploaded file" } : null,
  ].filter(Boolean);
  const refillBlocks = [
    refillInfo.estimatedDaysRemaining !== null || refillInfo.isLowSupply
      ? { label: "Estimated supply", value: refillStatusLabel(medication) }
      : null,
    refillInfo.quantityRemaining !== null ? { label: "Quantity remaining", value: refillQuantityLabel(refillInfo.quantityRemaining) } : null,
    refillInfo.refillThreshold !== null ? { label: "Low supply threshold", value: refillThresholdLabel(refillInfo.refillThreshold) } : null,
    refillInfo.refillReminderEnabled ? { label: "Refill reminder", value: "On" } : null,
    hasDetailValue(refillInfo.lastRefillDate) ? { label: "Last refill", value: refillInfo.lastRefillDate, wide: true } : null,
  ].filter(Boolean);

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <ActionButton disabled={deleting} tone="quiet" onPress={() => onNavigate({ route: routes.medications })}>
          Back to medications
        </ActionButton>
        <View style={styles.headerActions}>
          <ActionButton disabled={deleting} tone="quiet" onPress={() => onNavigate({ route: routes.medicationForm, medicationId: medication.id })}>
            Edit
          </ActionButton>
          <ActionButton disabled={deleting} tone="danger" onPress={confirmDelete}>
            {deleting ? "Deleting..." : "Delete"}
          </ActionButton>
        </View>
      </View>

      <View style={styles.titleBlock}>
        <Text selectable style={styles.eyebrow}>
          {(categoryLabels[medication.category] || medication.category || "Medication").toUpperCase()}
        </Text>
        <Text selectable style={styles.title}>
          {medication.name}
        </Text>
        <Text selectable style={styles.subtitle}>
          Review the details saved for this medication.
        </Text>
      </View>

      <View style={styles.card}>
        {detailBlocks.map((block) => (
          <InfoBlock key={block.label} label={block.label} value={block.value} />
        ))}
        {hasDetailValue(medication.notes) ? (
          <InfoBlock label="Notes" value={medication.notes} wide />
        ) : (
          <View style={styles.noteAction}>
            <ActionButton tone="quiet" onPress={() => onNavigate({ route: routes.medicationForm, medicationId: medication.id })}>
              Add notes
            </ActionButton>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text selectable style={styles.cardTitle}>
          Schedule
        </Text>
        {schedule.length ? (
          schedule.map((slot) => (
            <View key={slot.id} style={styles.scheduleRow}>
              <Text selectable style={styles.scheduleLabel}>
                {slot.label}
              </Text>
              <Text selectable style={styles.scheduleTime}>
                {formatClock(slot.time)}
              </Text>
            </View>
          ))
        ) : (
          <Text selectable style={styles.emptyCopy}>
            No schedule times saved.
          </Text>
        )}
      </View>

      {utilityBlocks.length ? (
        <View style={styles.card}>
          {utilityBlocks.map((block) => (
            <InfoBlock key={block.label} label={block.label} value={block.value} />
          ))}
        </View>
      ) : null}

      {refillBlocks.length ? (
        <View style={styles.card}>
          <Text selectable style={styles.cardTitle}>
            Refill tracking
          </Text>
          {refillBlocks.map((block) => (
            <InfoBlock key={block.label} label={block.label} value={block.value} wide={block.wide} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function hasAttachment(medication) {
  return Boolean(medication?.attachment?.name || medication?.attachment?.path || medication?.attachment?.url);
}

function hasDetailValue(value) {
  return String(value ?? "").trim().length > 0;
}

function InfoBlock({ label, value, wide }) {
  return (
    <View style={[styles.infoBlock, wide && styles.infoBlockWide]}>
      <Text selectable style={styles.infoLabel}>
        {label}
      </Text>
      <Text selectable style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    padding: spacing.lg,
  },
  cardTitle: {
    color: colors.text,
    flexBasis: "100%",
    fontSize: typography.heading,
    fontWeight: "900",
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: "900",
  },
  emptyCopy: {
    color: colors.mutedText,
    flexBasis: "100%",
    fontSize: typography.body,
    lineHeight: 22,
  },
  headerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  infoBlock: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: radius.sm,
    borderWidth: 1,
    flexGrow: 1,
    flexShrink: 1,
    gap: spacing.xs,
    minWidth: 140,
    padding: spacing.md,
  },
  infoBlockWide: {
    flexBasis: "100%",
  },
  infoLabel: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "900",
  },
  infoValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
    lineHeight: 22,
  },
  noteAction: {
    alignItems: "flex-start",
    flexBasis: "100%",
  },
  scheduleLabel: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "900",
  },
  scheduleRow: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: radius.sm,
    borderWidth: 1,
    flexBasis: "100%",
    gap: spacing.xs,
    padding: spacing.md,
  },
  scheduleTime: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900",
  },
  screen: {
    gap: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "900",
    lineHeight: 40,
  },
  titleBlock: {
    gap: spacing.xs,
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: typography.body,
    lineHeight: 22,
  },
});
