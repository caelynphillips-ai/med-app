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
    : "Keep medications, vitamins, supplements, reminders, and refills in one organized place.";

  return (
    <View style={styles.shell}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
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
            <View style={styles.authActionsStack}>
              <View style={styles.authActions}>
                <Pressable accessibilityRole="button" onPress={onGoogleSignIn} disabled={busy} style={styles.authButton}>
                  <Text style={styles.authButtonText}>Google sign-in</Text>
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
              <Text selectable style={styles.authHint}>
                Preview mode is temporary and not connected to Google.
              </Text>
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
                <NavIcon active={active} name={item.icon} />
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

function NavIcon({ active, name }) {
  const iconColor = active ? colors.onPrimary : colors.darkPrimary;

  if (name === "calendar") {
    return (
      <View style={styles.navIconBox}>
        <View style={[styles.calendarIcon, { borderColor: iconColor }]}>
          <View style={[styles.calendarTopLine, { backgroundColor: iconColor }]} />
          <View style={styles.calendarDotRow}>
            <View style={[styles.calendarDot, { backgroundColor: iconColor }]} />
            <View style={[styles.calendarDot, { backgroundColor: iconColor }]} />
          </View>
        </View>
      </View>
    );
  }

  if (name === "pill") {
    return (
      <View style={styles.navIconBox}>
        <View style={[styles.pillIcon, { borderColor: iconColor }]}>
          <View style={[styles.pillDivider, { backgroundColor: iconColor }]} />
        </View>
      </View>
    );
  }

  if (name === "clock") {
    return (
      <View style={styles.navIconBox}>
        <View style={[styles.clockIcon, { borderColor: iconColor }]}>
          <View style={[styles.clockHandTall, { backgroundColor: iconColor }]} />
          <View style={[styles.clockHandShort, { backgroundColor: iconColor }]} />
        </View>
      </View>
    );
  }

  if (name === "bell") {
    return (
      <View style={styles.navIconBox}>
        <View style={[styles.bellIcon, { borderColor: iconColor }]}>
          <View style={[styles.bellBase, { backgroundColor: iconColor }]} />
        </View>
        <View style={[styles.bellClapper, { backgroundColor: iconColor }]} />
      </View>
    );
  }

  return (
    <View style={styles.navIconBox}>
      <View style={[styles.lockShackle, { borderColor: iconColor }]} />
      <View style={[styles.lockBody, { borderColor: iconColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  authActions: {
    flexWrap: "wrap",
    flexDirection: "row",
    gap: spacing.sm,
  },
  authActionsStack: {
    alignItems: "flex-start",
    gap: spacing.xs,
    maxWidth: 310,
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
  authHint: {
    color: colors.mutedText,
    fontSize: typography.label,
    fontWeight: "800",
    lineHeight: 17,
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
  bellBase: {
    borderRadius: 3,
    bottom: -4,
    height: 2,
    left: 1,
    position: "absolute",
    right: 1,
  },
  bellClapper: {
    borderRadius: 999,
    height: 3,
    marginTop: -1,
    width: 3,
  },
  bellIcon: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 2,
    height: 13,
    width: 13,
  },
  calendarDot: {
    borderRadius: 999,
    height: 2,
    width: 2,
  },
  calendarDotRow: {
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    marginTop: 3,
  },
  calendarIcon: {
    borderRadius: 3,
    borderWidth: 2,
    height: 15,
    overflow: "hidden",
    width: 15,
  },
  calendarTopLine: {
    height: 3,
    width: "100%",
  },
  clockHandShort: {
    borderRadius: 999,
    height: 2,
    left: 7,
    position: "absolute",
    top: 7,
    width: 4,
  },
  clockHandTall: {
    borderRadius: 999,
    height: 6,
    left: 6,
    position: "absolute",
    top: 3,
    width: 2,
  },
  clockIcon: {
    borderRadius: 999,
    borderWidth: 2,
    height: 16,
    position: "relative",
    width: 16,
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
    columnGap: spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    padding: spacing.xs,
    rowGap: spacing.xs,
  },
  navIconBox: {
    alignItems: "center",
    height: 18,
    justifyContent: "center",
    width: 18,
  },
  navItem: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderCurve: "continuous",
    borderRadius: radius.pill,
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minWidth: 92,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
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
  lockBody: {
    borderRadius: 3,
    borderWidth: 2,
    height: 10,
    marginTop: -2,
    width: 14,
  },
  lockShackle: {
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderWidth: 2,
    borderBottomWidth: 0,
    height: 8,
    width: 10,
  },
  pillDivider: {
    height: 13,
    transform: [{ rotate: "28deg" }],
    width: 2,
  },
  pillIcon: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 2,
    height: 12,
    justifyContent: "center",
    transform: [{ rotate: "-28deg" }],
    width: 19,
  },
  shell: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
