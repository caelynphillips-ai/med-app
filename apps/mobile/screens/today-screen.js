import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fullDateLabel, formatClock } from "../../../shared/dateTime.js";
import { ActionButton } from "../components/action-button.js";
import { DisclaimerCard } from "../components/disclaimer-card.js";
import { DoseCard } from "../components/dose-card.js";
import { SummaryCard } from "../components/summary-card.js";
import { useTodayDoses } from "../hooks/use-today-doses.js";
import { colors, spacing, typography } from "../theme/tokens.js";

export function TodayScreen({ medications, statuses, onAddMedication, onEditMedication, onMarkDose, onOpenMedication }) {
  const { doses, medications: visibleMedications, summary, markDose } = useTodayDoses({
    medications,
    statuses,
    onMarkDose,
  });
  const reminderCards = visibleMedications.filter((medication) => medication.reminder?.enabled);
  const remainingDoses = Math.max(0, summary.totalDoses - summary.markedTaken);
  const nextDose = summary.nextDose;
  const hasDoses = summary.totalDoses > 0;
  const progressCopy = hasDoses ? `${summary.markedTaken} of ${summary.totalDoses} taken today` : "Add a medication to begin";
  const heroLabel = nextDose ? "Next dose" : hasDoses ? "Today's progress" : "Start today";
  const heroTime = nextDose ? formatClock(nextDose.time) : hasDoses ? "All set" : "No doses yet";
  const heroDetail = hasDoses ? "No open doses left for today." : "Add your first medication to build today's schedule.";
  const heroDosage = nextDose?.med.dosage?.trim();

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text selectable style={styles.eyebrow}>
            {fullDateLabel().toUpperCase()}
          </Text>
          <Text selectable style={styles.title}>
            Today's schedule
          </Text>
          <Text selectable style={styles.subtitle}>
            Review today's doses and mark each one as you go.
          </Text>
        </View>
        <ActionButton onPress={onAddMedication}>Add medication</ActionButton>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroText}>
          <Text selectable style={styles.heroLabel}>
            {heroLabel}
          </Text>
          <Text selectable style={styles.heroTime}>
            {heroTime}
          </Text>
          {nextDose ? (
            <View style={styles.heroDetailRow}>
              <Text selectable style={styles.heroDetail}>
                {nextDose.med.name}
                {heroDosage ? ` - ${heroDosage}` : ""}
              </Text>
              {!heroDosage ? (
                <PromptChip label="Add dosage" onPress={() => onEditMedication(nextDose.med.id)} />
              ) : null}
            </View>
          ) : (
            <Text selectable style={styles.heroDetail}>
              {heroDetail}
            </Text>
          )}
        </View>
        {hasDoses ? (
          <View style={styles.progressPill}>
            <Text selectable style={styles.progressText}>
              {progressCopy}
            </Text>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={onAddMedication}
            style={({ pressed }) => [styles.progressPill, pressed && styles.pressed]}
          >
            <Text style={styles.progressText}>{progressCopy}</Text>
          </Pressable>
        )}
      </View>

      {hasDoses ? (
        <View style={styles.summaryGrid}>
          <SummaryCard label="Total doses" value={String(summary.totalDoses)} />
          <SummaryCard label="Marked taken" value={String(summary.markedTaken)} />
          <SummaryCard label="Remaining" value={String(remainingDoses)} />
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text selectable style={styles.sectionTitle}>
            Dose schedule
          </Text>
          <Text selectable style={styles.sectionSubtitle}>
            Sorted by time for today.
          </Text>
        </View>
        {doses.length ? (
          doses.map((dose) => (
            <DoseCard
              key={dose.key}
              dose={dose}
              onEditMedication={() => onEditMedication(dose.med.id)}
              onOpenDetails={() => onOpenMedication(dose.med.id)}
              onStatusChange={markDose}
            />
          ))
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

      {reminderCards.length ? (
        <View style={styles.section}>
          <Text selectable style={styles.sectionTitle}>
            Reminders
          </Text>
          {reminderCards.map((medication) => (
            <Pressable
              accessibilityLabel={`Open details for ${medication.name}`}
              accessibilityRole="button"
              key={medication.id || medication.name}
              onPress={() => onOpenMedication(medication.id)}
              style={({ pressed }) => [styles.reminderCard, pressed && styles.pressed]}
            >
              <Text selectable style={styles.reminderText}>
                {formatClock(medication.schedule?.[0]?.time || "09:00")} dose
              </Text>
              <Text selectable style={styles.reminderTitle}>
                {medication.name} - {medication.reminder.leadMinutes} min before
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <DisclaimerCard />
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
  empty: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: 14,
    borderWidth: 1,
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
  heroCard: {
    backgroundColor: colors.cardEmphasis,
    borderColor: "rgba(0, 128, 255, 0.38)",
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  heroDetail: {
    color: colors.onEmphasisMuted,
    fontSize: typography.body,
    fontWeight: "800",
    lineHeight: 22,
  },
  heroDetailRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  heroLabel: {
    color: colors.onEmphasisMuted,
    fontSize: typography.label,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  heroText: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 190,
  },
  heroTime: {
    color: colors.onPrimary,
    fontSize: 34,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
    lineHeight: 38,
  },
  progressPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.onPrimary,
    borderCurve: "continuous",
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  pressed: {
    opacity: 0.78,
  },
  promptChip: {
    alignSelf: "flex-start",
    backgroundColor: colors.white,
    borderColor: "#B9D9FF",
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 30,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  promptChipText: {
    color: colors.darkPrimary,
    fontSize: typography.small,
    fontWeight: "900",
  },
  progressText: {
    color: colors.darkPrimary,
    fontSize: typography.small,
    fontWeight: "900",
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
  sectionHeader: {
    gap: spacing.xs,
  },
  sectionSubtitle: {
    color: colors.mutedText,
    fontSize: typography.small,
    lineHeight: 18,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: typography.body,
    lineHeight: 22,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
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
