import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { categoryLabels, intakeLabels } from "../../../shared/medicationSchema.js";
import { formatClock } from "../../../shared/dateTime.js";
import { statusLabel } from "../../../shared/doseStatus.js";
import { colors, radius, shadows, spacing, typography } from "../theme/tokens.js";
import { StatusButton } from "./status-button.js";

export function DoseCard({ dose, onStatusChange }) {
  const category = categoryLabels[dose.med.category] || dose.med.category || "Medication";
  const intake = intakeLabels[dose.med.intake] || "No intake note";

  return (
    <View style={styles.card}>
      <View style={styles.timeRail}>
        <Text selectable style={styles.time}>
          {formatClock(dose.time)}
        </Text>
        <Text selectable style={styles.slot}>
          {dose.label}
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={styles.titleColumn}>
            <Text selectable style={styles.name}>
              {dose.med.name}
            </Text>
            <Text selectable style={styles.detail}>
              {dose.med.dosage} - {dose.med.purpose}
            </Text>
          </View>
          <View style={styles.categoryChip}>
            <Text style={styles.categoryText}>{category}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.statusChip}>
            <Text style={styles.statusText}>{statusLabel(dose.status)}</Text>
          </View>
          <Text selectable style={styles.intake}>
            {intake}
          </Text>
        </View>

        <View style={styles.buttonRow}>
          <StatusButton
            label="Taken"
            selected={dose.status === "taken"}
            status="taken"
            onPress={() => onStatusChange(dose.key, "taken")}
          />
          <StatusButton
            label="Skipped"
            selected={dose.status === "skipped"}
            status="skipped"
            onPress={() => onStatusChange(dose.key, "skipped")}
          />
          <StatusButton
            label="Missed"
            selected={dose.status === "missed"}
            status="missed"
            onPress={() => onStatusChange(dose.key, "missed")}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderCurve: "continuous",
    borderRadius: radius.md,
    flexDirection: "row",
    overflow: "hidden",
  },
  categoryChip: {
    alignSelf: "flex-start",
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
    lineHeight: 18,
    opacity: 0.76,
  },
  intake: {
    color: colors.text,
    flexShrink: 1,
    fontSize: typography.small,
    fontWeight: "800",
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  slot: {
    color: colors.text,
    fontSize: typography.small,
    opacity: 0.78,
  },
  statusChip: {
    backgroundColor: colors.white,
    borderCurve: "continuous",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusText: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "900",
  },
  time: {
    color: colors.text,
    fontSize: typography.body,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
  },
  timeRail: {
    backgroundColor: "rgba(204, 240, 237, 0.56)",
    gap: spacing.xs,
    justifyContent: "center",
    padding: spacing.lg,
    width: 104,
  },
  titleColumn: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
  },
});
