import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radius, spacing, typography } from "../theme/tokens.js";

export function ActionButton({ children, disabled, tone = "primary", onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === "danger" && styles.danger,
        tone === "quiet" && styles.quiet,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.text, tone === "quiet" && styles.quietText]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderCurve: "continuous",
    borderRadius: radius.pill,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  danger: {
    backgroundColor: colors.alert,
  },
  disabled: {
    opacity: 0.52,
  },
  pressed: {
    opacity: 0.78,
  },
  quiet: {
    backgroundColor: colors.light,
  },
  quietText: {
    color: colors.text,
  },
  text: {
    color: colors.onPrimary,
    fontSize: typography.body,
    fontWeight: "900",
  },
});
