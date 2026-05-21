import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

const palette = {
  primary: "#7A9D8E",
  secondary: "#5F7D73",
  background: "#EAF7F6",
  surface: "#6CA692",
  accent: "#C9A66B",
  alert: "#C97B63",
  text: "#3F463F",
  light: "#CCF0ED"
};

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>M</Text>
          </View>
          <View>
            <Text style={styles.title}>Med Organizer</Text>
            <Text style={styles.subtitle}>Medication and vitamin schedule</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.eyebrow}>EAS mobile build shell</Text>
          <Text style={styles.heading}>Ready for Expo builds</Text>
          <Text style={styles.copy}>
            This native Expo entry point is configured for EAS so the connected
            GitHub repository can produce iOS and Android builds from the Expo
            dashboard.
          </Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.tile}>
            <Text style={styles.tileLabel}>Backend</Text>
            <Text style={styles.tileValue}>Firebase</Text>
            <Text style={styles.tileText}>Project med-test-7a252</Text>
          </View>
          <View style={styles.tile}>
            <Text style={styles.tileLabel}>Platforms</Text>
            <Text style={styles.tileValue}>Web, desktop, mobile</Text>
            <Text style={styles.tileText}>Same product workspace</Text>
          </View>
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>Medical disclaimer</Text>
          <Text style={styles.copy}>
            This app is for personal organization only and does not provide
            medical advice. Confirm medication details with the prescription
            label, doctor, or pharmacist.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background
  },
  page: {
    padding: 24,
    gap: 18
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.primary
  },
  logoText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "800"
  },
  title: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "800"
  },
  subtitle: {
    color: palette.secondary,
    fontSize: 14,
    marginTop: 2
  },
  card: {
    padding: 22,
    borderRadius: 18,
    backgroundColor: palette.surface,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  eyebrow: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  heading: {
    color: palette.text,
    fontSize: 32,
    fontWeight: "900",
    marginTop: 8
  },
  copy: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10
  },
  grid: {
    gap: 14
  },
  tile: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: palette.light,
    borderWidth: 1,
    borderColor: palette.primary
  },
  tileLabel: {
    color: palette.secondary,
    fontSize: 13,
    fontWeight: "800"
  },
  tileValue: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 6
  },
  tileText: {
    color: palette.text,
    fontSize: 14,
    marginTop: 4
  },
  disclaimer: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: palette.accent
  },
  disclaimerTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "900"
  }
});
