import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { normalizedSchedule } from "../../../shared/schedule.js";
import { formatClock } from "../../../shared/dateTime.js";
import { ActionButton } from "../components/action-button.js";
import { colors, radius, shadows, spacing, typography } from "../theme/tokens.js";
import { routes } from "../navigation/routes.js";

export function RemindersScreen({ medications, onNavigate }) {
  const reminders = medications.filter((medication) => medication.reminder?.enabled);

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <View>
          <Text selectable style={styles.eyebrow}>
            REMINDERS
          </Text>
          <Text selectable style={styles.title}>
            Reminder cards
          </Text>
        </View>
        <ActionButton onPress={() => onNavigate({ route: routes.medicationForm })}>Add</ActionButton>
      </View>

      {reminders.length ? (
        reminders.map((medication) => (
          <View key={medication.id} style={styles.card}>
            <Text selectable style={styles.name}>
              {medication.name}
            </Text>
            <Text selectable style={styles.detail}>
              {medication.reminder.leadMinutes || 15} minutes before
            </Text>
            <Text selectable style={styles.schedule}>
              {normalizedSchedule(medication)
                .map((slot) => `${slot.label} ${formatClock(slot.time)}`)
                .join(", ")}
            </Text>
          </View>
        ))
      ) : (
        <View style={styles.empty}>
          <Text selectable style={styles.emptyTitle}>
            No reminder cards yet
          </Text>
          <Text selectable style={styles.emptyText}>
            Turn on reminder-style cards while adding or editing a medication.
          </Text>
          <ActionButton onPress={() => onNavigate({ route: routes.medicationForm })}>Add medication</ActionButton>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderCurve: "continuous",
    borderRadius: radius.md,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  detail: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "900",
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
  schedule: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
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
