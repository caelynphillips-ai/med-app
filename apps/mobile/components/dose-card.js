import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { categoryLabels, intakeLabels } from "../../../shared/medicationSchema.js";
import { formatClock } from "../../../shared/dateTime.js";
import { statusLabel } from "../../../shared/doseStatus.js";
import { colors, radius, shadows, spacing, typography } from "../theme/tokens.js";
import { StatusButton } from "./status-button.js";

export function DoseCard({ dose, onEditMedication, onOpenDetails, onStatusChange }) {
  const category = categoryLabels[dose.med.category] || dose.med.category || "Medication";
  const dosage = dose.med.dosage?.trim() || "Add dosage";
  const purpose = dose.med.purpose?.trim() || "Add purpose";
  const intake = intakeLabels[dose.med.intake] || "Add intake note";
  const dosageMissing = !dose.med.dosage?.trim();
  const purposeMissing = !dose.med.purpose?.trim();
  const intakeMissing = !intakeLabels[dose.med.intake];
  const filledDetails = [dose.med.dosage?.trim(), dose.med.purpose?.trim()].filter(Boolean).join(" - ");

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
            {filledDetails ? (
              <Text selectable style={styles.detail}>
                {filledDetails}
              </Text>
            ) : null}
            {dosageMissing || purposeMissing ? (
              <View style={styles.promptRow}>
                {dosageMissing ? <PromptChip label={dosage} onPress={onEditMedication} /> : null}
                {purposeMissing ? <PromptChip label={purpose} onPress={onEditMedication} /> : null}
              </View>
            ) : null}
          </View>
          <View style={styles.categoryChip}>
            <Text style={styles.categoryText}>{category}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.statusChip}>
            <Text style={styles.statusText}>{statusLabel(dose.status)}</Text>
          </View>
          {intakeMissing ? (
            <PromptChip label={intake} onPress={onEditMedication} />
          ) : (
            <Text selectable style={styles.intake}>
              {intake}
            </Text>
          )}
        </View>

        <View style={styles.actionRow}>
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
          <Pressable accessibilityRole="button" onPress={onOpenDetails} style={({ pressed }) => [styles.detailButton, pressed && styles.pressed]}>
            <Text style={styles.detailButtonText}>Open details</Text>
          </Pressable>
        </View>
      </View>
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
  actionRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  body: {
    flex: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  buttonRow: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  card: {
    ...shadows.card,
    backgroundColor: colors.cardEmphasis,
    borderColor: "rgba(0, 128, 255, 0.38)",
    borderWidth: 1,
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
    color: colors.onEmphasisMuted,
    fontSize: typography.small,
    lineHeight: 18,
    opacity: 0.76,
  },
  detailButton: {
    alignItems: "center",
    alignSelf: "flex-end",
    minHeight: 34,
    justifyContent: "center",
    marginLeft: "auto",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  detailButtonText: {
    color: colors.onPrimary,
    fontSize: typography.small,
    fontWeight: "900",
  },
  intake: {
    color: colors.onEmphasisMuted,
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
    color: colors.onPrimary,
    fontSize: 17,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.78,
  },
  promptChip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderColor: "rgba(255, 255, 255, 0.36)",
    borderCurve: "continuous",
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 30,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  promptChipText: {
    color: colors.onPrimary,
    fontSize: typography.small,
    fontWeight: "900",
  },
  promptRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  slot: {
    color: colors.onEmphasisMuted,
    fontSize: typography.small,
    opacity: 0.78,
  },
  statusChip: {
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderCurve: "continuous",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusText: {
    color: colors.onPrimary,
    fontSize: typography.label,
    fontWeight: "900",
  },
  time: {
    color: colors.onPrimary,
    fontSize: typography.body,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
  },
  timeRail: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
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
