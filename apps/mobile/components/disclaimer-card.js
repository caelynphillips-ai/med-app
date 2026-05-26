import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { medicalDisclaimer } from "../../../shared/medicationSchema.js";
import { colors, radius, spacing, typography } from "../theme/tokens.js";

export function DisclaimerCard() {
  return (
    <View style={styles.card}>
      <Text selectable style={styles.title}>
        Medical disclaimer
      </Text>
      <Text selectable style={styles.copy}>
        {medicalDisclaimer} Confirm medication details with the prescription label, doctor, or pharmacist.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.accent,
    borderColor: "rgba(36, 52, 71, 0.12)",
    borderCurve: "continuous",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  copy: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
});
