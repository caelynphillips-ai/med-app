import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, shadows, spacing, typography } from "../theme/tokens.js";

export function SummaryCard({ label, value }) {
  return (
    <View style={styles.card}>
      <Text selectable style={styles.label}>
        {label}
      </Text>
      <Text selectable style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    backgroundColor: colors.cardEmphasis,
    borderColor: "rgba(0, 128, 255, 0.38)",
    borderWidth: 1,
    borderCurve: "continuous",
    borderRadius: radius.md,
    flex: 1,
    gap: spacing.xs,
    minWidth: 150,
    padding: spacing.lg,
  },
  label: {
    color: colors.onEmphasisMuted,
    fontSize: typography.label,
    fontWeight: "800",
  },
  value: {
    color: colors.onPrimary,
    fontSize: 24,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
  },
});
