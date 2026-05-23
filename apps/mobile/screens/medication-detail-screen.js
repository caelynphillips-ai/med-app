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

  if (!medication) {
    return (
      <View style={styles.screen}>
        <Text selectable style={styles.title}>
          Medication not found
        </Text>
        <ActionButton tone="quiet" onPress={() => onNavigate({ route: routes.medications })}>
          Back to list
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

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <ActionButton disabled={deleting} tone="quiet" onPress={() => onNavigate({ route: routes.medications })}>
          Back
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

      <View>
        <Text selectable style={styles.eyebrow}>
          {(categoryLabels[medication.category] || medication.category || "Medication").toUpperCase()}
        </Text>
        <Text selectable style={styles.title}>
          {medication.name}
        </Text>
      </View>

      <View style={styles.card}>
        <InfoBlock label="Purpose" value={medication.purpose || "No purpose yet"} />
        <InfoBlock label="Dosage" value={medication.dosage || "No dosage"} />
        <InfoBlock label="Category" value={categoryLabels[medication.category] || medication.category || "Medication"} />
        <InfoBlock label="Instructions" value={medication.foodInstructions || intakeLabels[medication.intake] || "Not specified"} />
        <InfoBlock label="Notes" value={medication.notes || "No notes yet"} wide />
      </View>

      <View style={styles.card}>
        <Text selectable style={styles.cardTitle}>
          Schedule
        </Text>
        {normalizedSchedule(medication).map((slot) => (
          <View key={slot.id} style={styles.scheduleRow}>
            <Text selectable style={styles.scheduleLabel}>
              {slot.label}
            </Text>
            <Text selectable style={styles.scheduleTime}>
              {formatClock(slot.time)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <InfoBlock
          label="Reminder"
          value={medication.reminder?.enabled ? `${medication.reminder.leadMinutes || 15} minutes before` : "Off"}
        />
        <InfoBlock label="Attachment" value={medication.attachment?.name || "No label photo or instruction file uploaded yet."} />
      </View>

      <View style={styles.card}>
        <Text selectable style={styles.cardTitle}>
          Refill tracking
        </Text>
        <InfoBlock label="Estimated supply" value={refillStatusLabel(medication)} />
        <InfoBlock label="Quantity remaining" value={refillQuantityLabel(refillInfo.quantityRemaining)} />
        <InfoBlock label="Low supply threshold" value={refillThresholdLabel(refillInfo.refillThreshold)} />
        <InfoBlock label="Refill reminder" value={refillInfo.refillReminderEnabled ? "On" : "Off"} />
        <InfoBlock label="Last refill" value={refillInfo.lastRefillDate || "Not set"} wide />
      </View>
    </View>
  );
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
    borderCurve: "continuous",
    borderRadius: radius.md,
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
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoBlock: {
    backgroundColor: "rgba(204, 240, 237, 0.28)",
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
  scheduleLabel: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "900",
  },
  scheduleRow: {
    backgroundColor: "rgba(204, 240, 237, 0.28)",
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
});
