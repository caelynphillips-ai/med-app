import React from "react";
import { StyleSheet, Text } from "react-native";
import { colors, typography } from "../theme/tokens.js";

export function FieldLabel({ children, required }) {
  return (
    <Text style={styles.label}>
      {children}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "900",
  },
  required: {
    color: colors.alert,
  },
});
