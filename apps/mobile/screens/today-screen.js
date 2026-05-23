import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { fullDateLabel, formatClock } from "../../../shared/dateTime.js";
import { DisclaimerCard } from "../components/disclaimer-card.js";
import { DoseCard } from "../components/dose-card.js";
import { SummaryCard } from "../components/summary-card.js";
import { useTodayDoses } from "../hooks/use-today-doses.js";
import { colors, spacing, typography } from "../theme/tokens.js";

export function TodayScreen({ medications, statuses, onMarkDose, useSampleFallback }) {
  const { doses, medications: visibleMedications, summary, markDose } = useTodayDoses({
    medications,
    statuses,
    onMarkDose,
    useSampleFallback,
  });
  const reminderCards = visibleMedications.filter((medication) => medication.reminder?.enabled);

  return (
    <View style={styles.screen}>
      <View style={styles.titleBlock}>
        <Text selectable style={styles.eyebrow}>
          {fullDateLabel().toUpperCase()}
        </Text>
        <Text selectable style={styles.title}>
          Today's schedule
        </Text>
      </View>

      <View style={styles.summaryGrid}>
        <SummaryCard label="Total doses" value={String(summary.totalDoses)} />
        <SummaryCard label="Marked taken" value={String(summary.markedTaken)} />
        <SummaryCard label="Next dose" value={summary.nextDose ? formatClock(summary.nextDose.time) : "Done"} />
      </View>

      <View style={styles.section}>
        {doses.length ? (
          doses.map((dose) => <DoseCard key={dose.key} dose={dose} onStatusChange={markDose} />)
        ) : (
          <View style={styles.empty}>
            <Text selectable style={styles.emptyTitle}>
              No doses scheduled today
            </Text>
            <Text selectable style={styles.emptyText}>
              Add a medication with a time of day to build this schedule.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text selectable style={styles.sectionTitle}>
          Reminders
        </Text>
        {reminderCards.length ? (
          reminderCards.map((medication) => (
            <View key={medication.name} style={styles.reminderCard}>
              <Text selectable style={styles.reminderText}>
                {formatClock(medication.schedule?.[0]?.time || "09:00")} dose
              </Text>
              <Text selectable style={styles.reminderTitle}>
                {medication.name} - {medication.reminder.leadMinutes} min before
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.empty}>
            <Text selectable style={styles.emptyTitle}>
              No reminder cards turned on
            </Text>
            <Text selectable style={styles.emptyText}>
              Turn on reminder-style cards while adding or editing a medication.
            </Text>
          </View>
        )}
      </View>

      <DisclaimerCard />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    backgroundColor: colors.light,
    borderCurve: "continuous",
    borderRadius: 14,
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
    letterSpacing: 0,
  },
  reminderCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  reminderText: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "900",
  },
  reminderTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
  },
  screen: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "900",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
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
});
