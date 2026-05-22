import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../theme/tokens.js";

export function AppHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.logo} accessible accessibilityLabel="Med Organizer logo">
        <Text style={styles.logoText}>M</Text>
      </View>
      <View style={styles.headerText}>
        <Text selectable style={styles.title}>
          Med Organizer
        </Text>
        <Text selectable style={styles.subtitle}>
          Medication and vitamin schedule
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  logo: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderCurve: "continuous",
    borderRadius: radius.md,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  logoText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.secondary,
    fontSize: typography.small,
    marginTop: 2,
  },
  title: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "900",
  },
});
