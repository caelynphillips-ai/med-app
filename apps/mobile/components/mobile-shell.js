import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppHeader } from "./app-header.js";
import { navItems } from "../navigation/routes.js";
import { colors, radius, spacing, typography } from "../theme/tokens.js";

export function MobileShell({ activeRoute, children, error, onNavigate, user, onGoogleSignIn, onPreviewSignIn, onSignOut, busy }) {
  const isPreviewSession = Boolean(user?.isAnonymous);
  const authTitle = user ? (isPreviewSession ? "Preview mode active" : user.displayName || "Signed in") : "Organize your daily care.";
  const authSubtitle = user
    ? isPreviewSession
      ? "Temporary device session for testing. It is not connected to Google."
      : user.email || "Firebase session active"
    : "Keep track of medications, vitamins, supplements, reminders, and refills in one organized place. Preview mode is a temporary device session for testing.";

  return (
    <View style={styles.shell}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <AppHeader />

        <View style={styles.authRow}>
          <View style={styles.authText}>
            <Text selectable style={styles.authTitle}>
              {authTitle}
            </Text>
            <Text selectable style={styles.authSubtitle}>
              {authSubtitle}
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
              <Pressable
                accessibilityLabel="Start preview mode with a temporary Firebase account"
                accessibilityRole="button"
                onPress={onPreviewSignIn}
                disabled={busy}
                style={styles.authButton}
              >
                <Text style={styles.authButtonText}>Preview mode</Text>
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
                <Text style={[styles.navIcon, active && styles.navIconActive]}>{item.icon}</Text>
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
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
    flexWrap: "wrap",
    flexDirection: "row",
    gap: spacing.sm,
  },
  authButton: {
    backgroundColor: colors.primary,
    borderCurve: "continuous",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  authButtonText: {
    color: colors.onPrimary,
    fontSize: typography.small,
    fontWeight: "900",
  },
  authRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
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
    minWidth: 220,
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
    backgroundColor: colors.alertSoft,
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
    borderColor: colors.border,
    borderWidth: 1,
    borderCurve: "continuous",
    borderRadius: radius.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  navIcon: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    color: colors.darkPrimary,
    fontSize: typography.small,
    fontWeight: "900",
    height: 28,
    lineHeight: 28,
    overflow: "hidden",
    textAlign: "center",
    width: 28,
  },
  navIconActive: {
    backgroundColor: colors.onPrimary,
    color: colors.darkPrimary,
  },
  navItem: {
    alignItems: "center",
    borderColor: "transparent",
    borderWidth: 1,
    borderCurve: "continuous",
    borderRadius: radius.pill,
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minWidth: 96,
    minHeight: 48,
  },
  navItemActive: {
    backgroundColor: colors.cardEmphasis,
    borderColor: colors.darkPrimary,
    borderWidth: 1,
  },
  navLabel: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "900",
  },
  navLabelActive: {
    color: colors.onPrimary,
  },
  shell: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
