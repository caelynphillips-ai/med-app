import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../theme/tokens.js";

const azurWellMark = require("../../../assets/brand/azur-well-mark.png");

export function AppHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.logo} accessible accessibilityLabel="Azur Well logo">
        <Image source={azurWellMark} resizeMode="contain" style={styles.logoImage} />
      </View>
      <View style={styles.headerText}>
        <Text selectable style={styles.title}>
          Azur Well
        </Text>
        <Text selectable style={styles.subtitle}>
          Medication and supplement tracker
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
    backgroundColor: colors.light,
    borderCurve: "continuous",
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    height: 54,
    justifyContent: "center",
    padding: 8,
    width: 54,
  },
  logoImage: {
    height: "100%",
    width: "100%",
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
