import React from "react";
import { StatusBar, View } from "react-native";
import { TodayScreen } from "../screens/today-screen.js";
import { colors } from "../theme/tokens.js";

export function MobileApp() {
  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <TodayScreen />
    </View>
  );
}
