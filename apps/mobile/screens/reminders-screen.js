import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
        <View style={styles.titleBlock}>
          <Text selectable style={styles.eyebrow}>
            REMINDERS
          </Text>
          <Text selectable style={styles.title}>
            Reminder cards
          </Text>
          <Text selectable style={styles.subtitle}>
            Cards follow saved schedules. Local phone reminders also require notification permission.
          </Text>
        </View>
        <ActionButton onPress={() => onNavigate({ route: routes.medicationForm })}>Add medication</ActionButton>
      </View>

      {reminders.length ? (
        reminders.map((medication) => (
          <Pressable
            accessibilityLabel={`Open details for ${medication.name}`}
            accessibilityRole="button"
            key={medication.id}
            onPress={() => onNavigate({ route: routes.medicationDetail, medicationId: medication.id })}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
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
          </Pressable>
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
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  cardPressed: {
    opacity: 0.78,
  },
  detail: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "900",
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
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
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
