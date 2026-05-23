import React from "react";
import { Alert, Share, StyleSheet, Text, View } from "react-native";
import { medicalDisclaimer } from "../../../shared/medicationSchema.js";
import {
  buildMedicationDataExport,
  buildMedicationExportJson,
  buildMedicationListTextExport,
} from "../../../shared/dataExport.js";
import { ActionButton } from "../components/action-button.js";
import { describeMobileError, logMobileError } from "../services/mobile-error.js";
import { colors, radius, shadows, spacing, typography } from "../theme/tokens.js";

export function PrivacyScreen({ busy, historyStatuses, medications, onSignOut, user }) {
  const [exporting, setExporting] = React.useState(false);
  const [exportError, setExportError] = React.useState("");
  const isPreviewSession = Boolean(user?.isAnonymous);
  const disabled = busy || exporting;

  async function shareExport(format) {
    setExporting(true);
    setExportError("");
    try {
      const generatedAt = new Date().toISOString();
      const message =
        format === "text"
          ? buildMedicationListTextExport({ generatedAt, medications })
          : buildMedicationExportJson(
              buildMedicationDataExport({
                doseStatusHistory: historyStatuses,
                generatedAt,
                medications,
                source: "expo-mobile",
                user,
              }),
            );

      await Share.share({
        message,
        title: format === "text" ? "Med Organizer medication list" : "Med Organizer data export",
      });
    } catch (error) {
      logMobileError("Data export share failed", error);
      const messageText = describeMobileError(error, "Exporting data");
      setExportError(messageText);
      Alert.alert("Export data", messageText);
    } finally {
      setExporting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.titleBlock}>
        <Text selectable style={styles.eyebrow}>
          ACCOUNT AND PRIVACY
        </Text>
        <Text selectable style={styles.title}>
          Privacy
        </Text>
        <Text selectable style={styles.subtitle}>
          Export data and review how your organizer stores information.
        </Text>
      </View>

      <InfoCard title="Medical disclaimer" body={medicalDisclaimer} />

      <View style={styles.card}>
        <Text selectable style={styles.cardTitle}>
          Data storage
        </Text>
        <InfoRow label="Account" value={user?.email || user?.displayName || (isPreviewSession ? "Preview mode" : "Not signed in")} />
        <InfoRow
          label="Storage"
          value="Medication records and dose statuses are saved in Firebase for the current account."
        />
        <InfoRow
          label="Attachments"
          value="Exports include attachment metadata, but not uploaded label photos or files."
        />
      </View>

      <View style={styles.card}>
        <Text selectable style={styles.cardTitle}>
          Export data
        </Text>
        <Text selectable style={styles.body}>
          Export medications, schedules, notes, instructions, refill tracking, reminder settings, attachment metadata, and recent dose status history.
        </Text>
        <View style={styles.buttonRow}>
          <ActionButton disabled={disabled} onPress={() => shareExport("json")}>
            {exporting ? "Preparing..." : "Export JSON"}
          </ActionButton>
          <ActionButton disabled={disabled} tone="quiet" onPress={() => shareExport("text")}>
            Readable list
          </ActionButton>
        </View>
        {exportError ? (
          <Text selectable style={styles.errorText}>
            {exportError}
          </Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text selectable style={styles.cardTitle}>
          Preview mode
        </Text>
        <Text selectable style={styles.body}>
          Preview mode uses a temporary anonymous Firebase account on this device. It does not sync with a real Google account until native Google sign-in is configured.
        </Text>
      </View>

      {/* TODO: Replace this copy with a reauthenticated, irreversible account deletion flow before public launch. */}
      <View style={styles.card}>
        <Text selectable style={styles.cardTitle}>
          Account deletion
        </Text>
        <Text selectable style={styles.body}>
          Secure account deletion is not active yet. Before public launch, this flow should remove the signed-in user's medications, dose statuses, app settings, and Storage attachments after a clear confirmation step.
        </Text>
      </View>

      <ActionButton disabled={disabled} tone="quiet" onPress={onSignOut}>
        Sign out
      </ActionButton>
    </View>
  );
}

function InfoCard({ body, title }) {
  return (
    <View style={styles.card}>
      <Text selectable style={styles.cardTitle}>
        {title}
      </Text>
      <Text selectable style={styles.body}>
        {body}
      </Text>
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text selectable style={styles.infoLabel}>
        {label}
      </Text>
      <Text selectable style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderCurve: "continuous",
    borderRadius: radius.md,
    gap: spacing.md,
    padding: spacing.lg,
  },
  cardTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "900",
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: "900",
    letterSpacing: 0,
  },
  errorText: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "800",
    lineHeight: 18,
  },
  infoLabel: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "900",
  },
  infoRow: {
    backgroundColor: "rgba(204, 240, 237, 0.28)",
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: radius.sm,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  infoValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
    lineHeight: 22,
  },
  screen: {
    gap: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "900",
    lineHeight: 40,
  },
  titleBlock: {
    gap: spacing.xs,
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: typography.body,
    lineHeight: 22,
  },
});
