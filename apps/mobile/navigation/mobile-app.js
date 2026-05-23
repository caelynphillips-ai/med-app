import React from "react";
import { StatusBar, Text, View } from "react-native";
import { MobileShell } from "../components/mobile-shell.js";
import { useMobileMedications } from "../hooks/use-mobile-medications.js";
import { routes } from "./routes.js";
import { HistoryScreen } from "../screens/history-screen.js";
import { MedicationDetailScreen } from "../screens/medication-detail-screen.js";
import { MedicationFormScreen } from "../screens/medication-form-screen.js";
import { MedicationsScreen } from "../screens/medications-screen.js";
import { RemindersScreen } from "../screens/reminders-screen.js";
import { TodayScreen } from "../screens/today-screen.js";
import { colors } from "../theme/tokens.js";

export function MobileApp() {
  const mobile = useMobileMedications();
  const [route, setRoute] = React.useState({ route: routes.today });

  function navigate(nextRoute) {
    setRoute(nextRoute);
  }

  const selectedMedication = route.medicationId
    ? mobile.medications.find((medication) => medication.id === route.medicationId)
    : null;

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <MobileShell
        activeRoute={route.route}
        busy={mobile.busy}
        error={mobile.error}
        onGoogleSignIn={mobile.continueWithGoogle}
        onNavigate={navigate}
        onPreviewSignIn={mobile.continueWithFirebasePreview}
        onSignOut={mobile.signOut}
        user={mobile.user}
      >
        {mobile.loading ? (
          <View
            style={{
              backgroundColor: colors.light,
              borderRadius: 18,
              gap: 6,
              padding: 18,
            }}
          >
            <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>
              Loading your organizer
            </Text>
            <Text selectable style={{ color: colors.mutedText, fontSize: 13, fontWeight: "700", lineHeight: 18 }}>
              Getting your medications and today's schedule ready.
            </Text>
          </View>
        ) : (
          renderRoute(route, mobile, selectedMedication, navigate)
        )}
      </MobileShell>
    </View>
  );
}

function renderRoute(route, mobile, selectedMedication, navigate) {
  if (route.route === routes.medications) {
    return <MedicationsScreen medications={mobile.medications} onNavigate={navigate} />;
  }

  if (route.route === routes.medicationDetail) {
    return <MedicationDetailScreen medication={selectedMedication} onDelete={mobile.deleteMedication} onNavigate={navigate} />;
  }

  if (route.route === routes.medicationForm) {
    return <MedicationFormScreen medication={selectedMedication} onNavigate={navigate} onSave={mobile.saveMedication} />;
  }

  if (route.route === routes.reminders) {
    return <RemindersScreen medications={mobile.medications} onNavigate={navigate} />;
  }

  if (route.route === routes.history) {
    return (
      <HistoryScreen
        historyLoading={mobile.historyLoading}
        historyStatuses={mobile.historyStatuses}
        medications={mobile.medications}
      />
    );
  }

  return (
    <TodayScreen
      medications={mobile.medications}
      statuses={mobile.statuses}
      onMarkDose={mobile.markDose}
      useSampleFallback={!mobile.user}
    />
  );
}
