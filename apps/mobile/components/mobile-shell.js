import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppHeader } from "./app-header.js";
import { navItems } from "../navigation/routes.js";
import { colors, radius, spacing, typography } from "../theme/tokens.js";

export function MobileShell({ activeRoute, children, error, onNavigate, user, onGoogleSignIn, onPreviewSignIn, onSignOut, busy }) {
  return (
    <View style={styles.shell}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <AppHeader />

        <View style={styles.authRow}>
          <View style={styles.authText}>
            <Text selectable style={styles.authTitle}>
              {user ? user.displayName || "Signed in" : "Mobile organizer"}
            </Text>
            <Text selectable style={styles.authSubtitle}>
              {user ? user.email || "Firebase session active" : "Sign in to sync with Firebase"}
            </Text>
          </View>
          {user ? (
            <Pressable accessibilityRole="button" onPress={onSignOut} disabled={busy} style={styles.authButton}>
              <Text style={styles.authButtonText}>Sign out</Text>
            </Pressable>
          ) : (
            <View style={styles.authActions}>
              <Pressable accessibilityRole="button" onPress={onGoogleSignIn} disabled={busy} style={styles.authButton}>
                <Text style={styles.authButtonText}>Google</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={onPreviewSignIn} disabled={busy} style={styles.authButton}>
                <Text style={styles.authButtonText}>Preview</Text>
              </Pressable>
            </View>
          )}
        </View>

        {error ? (
          <View style={styles.error}>
            <Text selectable style={styles.errorText}>
              {error}
            </Text>
          </View>
        ) : null}

        <View style={styles.nav}>
          {navItems.map((item) => {
            const active = item.route === activeRoute;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                key={item.route}
                onPress={() => onNavigate({ route: item.route })}
                style={[styles.navItem, active && styles.navItemActive]}
              >
                <Text style={styles.navIcon}>{item.icon}</Text>
                <Text style={styles.navLabel}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  authActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  authButton: {
    backgroundColor: colors.accent,
    borderCurve: "continuous",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  authButtonText: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "900",
  },
  authRow: {
    alignItems: "center",
    backgroundColor: colors.light,
    borderCurve: "continuous",
    borderRadius: radius.lg,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  authSubtitle: {
    color: colors.mutedText,
    fontSize: typography.small,
    marginTop: 2,
  },
  authText: {
    flex: 1,
  },
  authTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900",
  },
  content: {
    gap: spacing.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xl * 2,
  },
  error: {
    backgroundColor: "rgba(201, 123, 99, 0.22)",
    borderColor: colors.alert,
    borderCurve: "continuous",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  errorText: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "800",
  },
  nav: {
    backgroundColor: colors.surface,
    borderCurve: "continuous",
    borderRadius: radius.lg,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  navIcon: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "900",
  },
  navItem: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: radius.pill,
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 48,
  },
  navItemActive: {
    backgroundColor: colors.light,
  },
  navLabel: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "900",
  },
  shell: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
