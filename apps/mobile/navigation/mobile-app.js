import React from "react";
import { BackHandler, StatusBar, Text, View } from "react-native";
import { MobileShell } from "../components/mobile-shell.js";
import { useMobileMedications } from "../hooks/use-mobile-medications.js";
import { routes } from "./routes.js";
import { HistoryScreen } from "../screens/history-screen.js";
import { MedicationDetailScreen } from "../screens/medication-detail-screen.js";
import { MedicationFormScreen } from "../screens/medication-form-screen.js";
import { MedicationsScreen } from "../screens/medications-screen.js";
import { PrivacyScreen } from "../screens/privacy-screen.js";
import { RemindersScreen } from "../screens/reminders-screen.js";
import { TodayScreen } from "../screens/today-screen.js";
import { colors } from "../theme/tokens.js";

export function MobileApp() {
  const mobile = useMobileMedications();
  const [routeStack, setRouteStack] = React.useState([{ route: routes.today }]);
  const route = routeStack[routeStack.length - 1] || { route: routes.today };
  const canGoBackRef = React.useRef(false);

  React.useEffect(() => {
    canGoBackRef.current = routeStack.length > 1;
  }, [routeStack.length]);

  const goBack = React.useCallback(() => {
    if (!canGoBackRef.current) {
      return false;
    }
    setRouteStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
    return true;
  }, []);

  React.useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", goBack);
    return () => subscription.remove();
  }, [goBack]);

  function navigate(nextRoute) {
    const { replace, reset, ...targetRoute } = nextRoute || { route: routes.today };
    setRouteStack((current) => {
      const stack = current.length ? current : [{ route: routes.today }];
      if (reset) {
        return [targetRoute];
      }
      if (replace) {
        const previous = stack[stack.length - 2];
        if (previous && sameRoute(previous, targetRoute)) {
          return stack.slice(0, -1);
        }
        return [...stack.slice(0, -1), targetRoute];
      }
      if (sameRoute(stack[stack.length - 1], targetRoute)) {
        return stack;
      }
      return [...stack, targetRoute];
    });
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

function sameRoute(a, b) {
  return a?.route === b?.route && (a?.medicationId || "") === (b?.medicationId || "");
}

function renderRoute(route, mobile, selectedMedication, navigate) {
  if (route.route === routes.medications) {
    return <MedicationsScreen medications={mobile.medications} onDelete={mobile.deleteMedication} onNavigate={navigate} />;
  }

  if (route.route === routes.medicationDetail) {
    return <MedicationDetailScreen medication={selectedMedication} onDelete={mobile.deleteMedication} onNavigate={navigate} returnRoute={route.returnRoute} />;
  }

  if (route.route === routes.medicationForm) {
    return <MedicationFormScreen medication={selectedMedication} onNavigate={navigate} onSave={mobile.saveMedication} returnRoute={route.returnRoute} />;
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

  if (route.route === routes.privacy) {
    return (
      <PrivacyScreen
        busy={mobile.busy}
        onDeleteAccount={mobile.deleteAccount}
        medications={mobile.medications}
        onSignOut={mobile.signOut}
        user={mobile.user}
      />
    );
  }

  return (
    <TodayScreen
      medications={mobile.medications}
      statuses={mobile.statuses}
      onAddMedication={() => navigate({ route: routes.medicationForm, returnRoute: routes.today })}
      onEditMedication={(medicationId) => navigate({ route: routes.medicationForm, medicationId, returnRoute: routes.today })}
      onMarkDose={mobile.markDose}
      onOpenMedication={(medicationId) => navigate({ route: routes.medicationDetail, medicationId, returnRoute: routes.today })}
    />
  );
}
