import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { fullDateLabel, formatClock } from "../../../shared/dateTime.js";
import { AppHeader } from "../components/app-header.js";
import { DisclaimerCard } from "../components/disclaimer-card.js";
import { DoseCard } from "../components/dose-card.js";
import { SummaryCard } from "../components/summary-card.js";
import { useTodayDoses } from "../hooks/use-today-doses.js";
import { colors, spacing, typography } from "../theme/tokens.js";

export function TodayScreen() {
  const { doses, medications, summary, markDose } = useTodayDoses();
  const reminderCards = medications.filter((medication) => medication.reminder?.enabled);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <AppHeader />

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
        {doses.map((dose) => (
          <DoseCard key={dose.key} dose={dose} onStatusChange={markDose} />
        ))}
      </View>

      <View style={styles.section}>
        <Text selectable style={styles.sectionTitle}>
          Reminders
        </Text>
        {reminderCards.map((medication) => (
          <View key={medication.name} style={styles.reminderCard}>
            <Text selectable style={styles.reminderText}>
              {formatClock(medication.schedule?.[0]?.time || "09:00")} dose
            </Text>
            <Text selectable style={styles.reminderTitle}>
              {medication.name} - {medication.reminder.leadMinutes} min before
            </Text>
          </View>
        ))}
      </View>

      <DisclaimerCard />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xl * 2,
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
    backgroundColor: colors.background,
    flex: 1,
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
