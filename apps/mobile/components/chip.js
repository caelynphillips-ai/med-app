import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../theme/tokens.js";

export function Chip({ children, selected, removable, onPress, onRemove }) {
  const content = (
    <>
      <Text style={styles.text}>{children}</Text>
      {removable ? (
        <Pressable accessibilityLabel={`Remove ${children}`} onPress={onRemove} hitSlop={8}>
          <Text style={styles.remove}>x</Text>
        </Pressable>
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={[styles.chip, selected && styles.selected]}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 38,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pressed: {
    opacity: 0.75,
  },
  remove: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "900",
  },
  selected: {
    backgroundColor: colors.accent,
  },
  text: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "800",
  },
});
