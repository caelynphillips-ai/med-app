import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radius, spacing, typography } from "../theme/tokens.js";

const statusColors = {
  taken: colors.success,
  skipped: colors.accent,
  missed: colors.alert,
};

export function StatusButton({ label, selected, status, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: selected ? statusColors[status] : colors.white },
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderColor: colors.border,
    borderWidth: 1,
    borderCurve: "continuous",
    borderRadius: radius.pill,
    minHeight: 42,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.78,
  },
  selected: {
    borderColor: colors.darkPrimary,
  },
  text: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "900",
    textAlign: "center",
  },
});
