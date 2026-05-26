import React from "react";
import { Alert, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { medicalDisclaimer } from "../../../shared/medicationSchema.js";
import { buildMedicationListTextExport } from "../../../shared/dataExport.js";
import { ActionButton } from "../components/action-button.js";
import { describeMobileError, logMobileError } from "../services/mobile-error.js";
import { colors, radius, shadows, spacing, typography } from "../theme/tokens.js";

export function PrivacyScreen({ busy, medications, onDeleteAccount, onSignOut, user }) {
  const [exporting, setExporting] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = React.useState("");
  const [deleteError, setDeleteError] = React.useState("");
  const [exportError, setExportError] = React.useState("");
  const [exportMessage, setExportMessage] = React.useState("");
  const isPreviewSession = Boolean(user?.isAnonymous);
  const disabled = busy || exporting || deleting;
  const deleteReady = deleteConfirmation === "DELETE";

  async function shareExport() {
    setExporting(true);
    setExportError("");
    setExportMessage("");
    try {
      const generatedAt = new Date().toISOString();
      const message = buildMedicationListTextExport({ generatedAt, medications });

      await Share.share({
        message,
        title: "Azur Well medication list",
      });
      setExportMessage("Readable medication list is ready to share.");
    } catch (error) {
      logMobileError("Data export share failed", error);
      const messageText = describeMobileError(error, "Exporting data");
      setExportError(messageText);
      Alert.alert("Export data", messageText);
    } finally {
      setExporting(false);
    }
  }

  function requestAccountDeletion() {
    if (!deleteReady) {
      setDeleteError("Type DELETE before deleting your account.");
      return;
    }

    Alert.alert(
      "Delete your account",
      "This permanently deletes your medications, dose history, settings, and uploaded attachments.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: deleteAccount,
        },
      ],
    );
  }

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError("");
    try {
      await onDeleteAccount();
      setDeleteConfirmation("");
    } catch (error) {
      const message = error?.message || describeMobileError(error, "Deleting account");
      setDeleteError(message);
      Alert.alert("Delete account", message);
    } finally {
      setDeleting(false);
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
          Download your medication list and review important privacy information.
        </Text>
      </View>

      <InfoCard title="Medical disclaimer" body={medicalDisclaimer} />

      <View style={styles.card}>
        <Text selectable style={styles.cardTitle}>
          Export readable list
        </Text>
        <Text selectable style={styles.body}>
          Download a readable copy of your medications, schedule, notes, and details.
        </Text>
        <View style={styles.checklist}>
          <Text selectable style={styles.checkItem}>Medication details, schedules, instructions, and notes</Text>
          <Text selectable style={styles.checkItem}>Reminder and refill tracking settings</Text>
          <Text selectable style={styles.checkItem}>Attachment metadata and recent dose history</Text>
        </View>
        <View style={styles.buttonRow}>
          <ActionButton disabled={disabled} onPress={shareExport}>
            {exporting ? "Preparing..." : "Export readable list"}
          </ActionButton>
        </View>
        {exportError ? (
          <Text selectable style={styles.errorText}>
            {exportError}
          </Text>
        ) : null}
        {exportMessage ? (
          <Text selectable style={styles.successText}>
            {exportMessage}
          </Text>
        ) : null}
      </View>

      {isPreviewSession ? (
        <View style={styles.card}>
          <Text selectable style={styles.cardTitle}>
            Preview mode
          </Text>
          <Text selectable style={styles.body}>
            Preview mode uses a temporary device session for testing. It is not connected to Google.
          </Text>
        </View>
      ) : null}

      <View style={[styles.card, styles.dangerCard]}>
        <Text selectable style={styles.cardTitle}>
          Delete your account
        </Text>
        <Text selectable style={styles.body}>
          This permanently deletes your medications, dose history, settings, and uploaded attachments.
        </Text>
        <Text selectable style={styles.confirmLabel}>
          Type DELETE to confirm
        </Text>
        <TextInput
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!disabled}
          onChangeText={setDeleteConfirmation}
          placeholder="DELETE"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          value={deleteConfirmation}
        />
        <ActionButton disabled={disabled || !deleteReady} tone="danger" onPress={requestAccountDeletion}>
          {deleting ? "Deleting..." : "Delete account"}
        </ActionButton>
        {deleteError ? (
          <Text selectable style={styles.errorText}>
            {deleteError}
          </Text>
        ) : null}
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
  confirmLabel: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "900",
  },
  dangerCard: {
    borderColor: colors.alert,
    borderWidth: 1,
  },
  checkItem: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "800",
    lineHeight: 19,
  },
  checklist: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: radius.sm,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
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
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderCurve: "continuous",
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  successText: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "900",
    lineHeight: 18,
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
