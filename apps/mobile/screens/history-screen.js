import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  buildAdherenceSummary,
  formatHistoryDateLabel,
  getRecentDateKeys,
} from "../../../shared/adherence.js";
import { formatClock } from "../../../shared/dateTime.js";
import { SummaryCard } from "../components/summary-card.js";
import { colors, radius, shadows, spacing, typography } from "../theme/tokens.js";

export function HistoryScreen({ medications, historyLoading, historyStatuses }) {
  const dateKeys = getRecentDateKeys(7);
  const summary = buildAdherenceSummary(dateKeys, historyStatuses, medications);
  const adherenceValue = summary.adherencePercentage === null ? "No data" : `${summary.adherencePercentage}%`;

  return (
    <View style={styles.screen}>
      <View style={styles.titleBlock}>
        <Text selectable style={styles.eyebrow}>
          LAST 7 DAYS
        </Text>
        <Text selectable style={styles.title}>
          History
        </Text>
      </View>

      {historyLoading ? (
        <View style={styles.notice}>
          <Text selectable style={styles.noticeTitle}>
            Loading dose history
          </Text>
          <Text selectable style={styles.noticeText}>
            Checking your saved taken, skipped, and missed dose records.
          </Text>
        </View>
      ) : null}

      <View style={styles.summaryGrid}>
        <SummaryCard label="Adherence" value={adherenceValue} />
        <SummaryCard label="Taken" value={String(summary.totals.taken)} />
        <SummaryCard label="Missed/skipped" value={String(summary.totals.missed + summary.totals.skipped)} />
      </View>

      {summary.hasHistory ? (
        <>
          <View style={styles.section}>
            <Text selectable style={styles.sectionTitle}>
              Day-by-day
            </Text>
            {[...summary.days].reverse().map((day) => (
              <View key={day.dateKey} style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <Text selectable style={styles.dayTitle}>
                    {formatHistoryDateLabel(day.dateKey)}
                  </Text>
                  <Text selectable style={styles.dayPercent}>
                    {day.adherencePercentage === null ? "No data" : `${day.adherencePercentage}%`}
                  </Text>
                </View>
                <View style={styles.countRow}>
                  <StatusPill label={`${day.counts.taken} taken`} tone="taken" />
                  <StatusPill label={`${day.counts.skipped} skipped`} tone="skipped" />
                  <StatusPill label={`${day.counts.missed} missed`} tone="missed" />
                </View>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text selectable style={styles.sectionTitle}>
              Recent missed doses
            </Text>
            {summary.missedDoses.length ? (
              summary.missedDoses.map((dose) => (
                <View key={`${dose.dateKey}-${dose.key}`} style={styles.missedCard}>
                  <Text selectable style={styles.missedMeta}>
                    {formatHistoryDateLabel(dose.dateKey)}
                    {dose.time ? ` at ${formatClock(dose.time)}` : ""}
                  </Text>
                  <Text selectable style={styles.missedTitle}>
                    {dose.medicationName} - {dose.slotLabel}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.empty}>
                <Text selectable style={styles.emptyTitle}>
                  No missed doses recorded
                </Text>
                <Text selectable style={styles.emptyText}>
                  Missed dose entries from the last 7 days will appear here.
                </Text>
              </View>
            )}
          </View>
        </>
      ) : (
        <View style={styles.empty}>
          <Text selectable style={styles.emptyTitle}>
            No dose history yet
          </Text>
          <Text selectable style={styles.emptyText}>
            Mark doses as taken, skipped, or missed to build your history.
          </Text>
        </View>
      )}

      <View style={styles.notice}>
        <Text selectable style={styles.noticeTitle}>
          How this is calculated
        </Text>
        <Text selectable style={styles.noticeText}>
          Adherence is taken doses divided by doses you marked taken, skipped, or missed.
        </Text>
      </View>
    </View>
  );
}

function StatusPill({ label, tone }) {
  return (
    <View style={[styles.statusPill, styles[tone]]}>
      <Text selectable style={styles.statusPillText}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  countRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  dayCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  dayHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  dayPercent: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900",
  },
  dayTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900",
  },
  empty: {
    backgroundColor: colors.light,
    borderCurve: "continuous",
    borderRadius: radius.lg,
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
  missed: {
    backgroundColor: "rgba(201, 123, 99, 0.34)",
  },
  missedCard: {
    backgroundColor: colors.light,
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  missedMeta: {
    color: colors.mutedText,
    fontSize: typography.small,
    fontWeight: "800",
  },
  missedTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900",
  },
  notice: {
    backgroundColor: colors.light,
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  noticeText: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
  },
  noticeTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900",
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
  skipped: {
    backgroundColor: "rgba(201, 166, 107, 0.42)",
  },
  statusPill: {
    borderCurve: "continuous",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statusPillText: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "900",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  taken: {
    backgroundColor: colors.light,
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
