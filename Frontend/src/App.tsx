import React, { useEffect } from "react";
import { StatusBar, LogBox } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "@/navigation/AppNavigator";
import syncManager from "@/services/sync/SyncManager";
import connectivityService from "@/services/connectivity/ConnectivityService";
import { colors } from "@/config/theme";

LogBox.ignoreLogs(["Reanimated 2", "[Reanimated]"]);

const App: React.FC = () => {
  useEffect(() => {
    syncManager.startAutoSync();

    const unsubConnectivity = connectivityService.subscribe((status) => {
      syncManager.onConnectivityChange(status);
    });

    return () => {
      syncManager.stopAutoSync();
      unsubConnectivity();
    };
  }, []);

  const linking = {
    prefixes: ["emergencyconnect://", "https://emergencyconnect.dev"],
    config: {
      screens: {
        EmergencyDetail: "emergency/:emergencyId",
        MainTabs: {
          screens: {
            Dashboard: "home",
            Emergencies: "alerts",
            Notifications: "notifications",
            Map: "map",
            Profile: "profile",
          },
        },
      } as any,
    },
  };

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.white}
        translucent={false}
      />
      <NavigationContainer linking={linking}>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;
