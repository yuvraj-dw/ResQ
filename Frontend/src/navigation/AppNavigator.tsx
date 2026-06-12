import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View, StyleSheet } from "react-native";
import { colors, fontSize } from "../config/theme";

import SplashScreen from "../features/auth/screens/SplashScreen";
import OnboardingScreen from "../features/auth/screens/OnboardingScreen";
import AuthOptionsScreen from "../features/auth/screens/AuthOptionsScreen";
import LoginScreen from "../features/auth/screens/LoginScreen";
import RegistrationScreen from "../features/auth/screens/RegistrationScreen";
import OtpVerificationScreen from "../features/auth/screens/OtpVerificationScreen";
import DashboardScreen from "../features/dashboard/DashboardScreen";
import EmergencyListScreen from "../features/emergency/screens/EmergencyListScreen";
import EmergencyFormScreen from "../features/emergency/screens/EmergencyFormScreen";
import EmergencyDetailScreen from "../features/emergency/screens/EmergencyDetailScreen";
import MyEmergenciesScreen from "../features/emergency/screens/MyEmergenciesScreen";
import NotificationScreen from "../features/notifications/screens/NotificationScreen";
import MapScreen from "../features/maps/screens/MapScreen";
import ProfileScreen from "../features/profile/screens/ProfileScreen";
import EditProfileScreen from "../features/profile/screens/EditProfileScreen";
import { useNotificationStore } from "../store/notificationStore";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
	headerStyle: {
		backgroundColor: colors.white,
	},
	headerTintColor: colors.text,
	headerTitleStyle: {
		fontWeight: "700" as const,
		fontSize: fontSize.lg,
	},
	headerShadowVisible: false,
	contentStyle: {
		backgroundColor: colors.background,
	},
};

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
	const icons: Record<string, string> = {
		Dashboard: "🏠",
		Emergencies: "🚨",
		Notifications: "🔔",
		Map: "🗺️",
		Profile: "👤",
	};

	return (
		<View style={styles.tabIcon}>
			<Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>
				{icons[label] || "📱"}
			</Text>
		</View>
	);
}

function MainTabs() {
	const { unreadCount } = useNotificationStore();

	return (
		<Tab.Navigator
			screenOptions={({ route }) => ({
				...screenOptions,
				tabBarIcon: ({ focused }) => (
					<TabIcon label={route.name} focused={focused} />
				),
				tabBarActiveTintColor: colors.emergency,
				tabBarInactiveTintColor: colors.textSecondary,
				tabBarStyle: styles.tabBar,
				tabBarLabelStyle: styles.tabBarLabel,
				headerShown: false,
			})}
		>
			<Tab.Screen
				name="Dashboard"
				component={DashboardScreen}
				options={{ tabBarLabel: "Home" }}
			/>
			<Tab.Screen
				name="Emergencies"
				component={EmergencyListScreen}
				options={{
					tabBarLabel: "Alerts",
					headerTitle: "Active Emergencies",
					headerShown: true,
				}}
			/>
			<Tab.Screen
				name="Notifications"
				component={NotificationScreen}
				options={{
					tabBarLabel: "Alerts",
					headerTitle: "Notifications",
					headerShown: true,
					tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
					tabBarBadgeStyle: styles.tabBadge,
				}}
			/>
			<Tab.Screen
				name="Map"
				component={MapScreen}
				options={{
					tabBarLabel: "Map",
					headerTitle: "Emergency Map",
					headerShown: true,
				}}
			/>
			<Tab.Screen
				name="Profile"
				component={ProfileScreen}
				options={{
					tabBarLabel: "Profile",
					headerTitle: "My Profile",
					headerShown: true,
				}}
			/>
		</Tab.Navigator>
	);
}

const AppNavigator: React.FC = () => {
	return (
		<Stack.Navigator
			screenOptions={{
				...screenOptions,
				animation: "slide_from_right",
			}}
			initialRouteName="Splash"
		>
			<Stack.Screen
				name="Splash"
				component={SplashScreen}
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="Onboarding"
				component={OnboardingScreen}
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="AuthOptions"
				component={AuthOptionsScreen}
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="Login"
				component={LoginScreen}
				options={{ headerTitle: "Login" }}
			/>
			<Stack.Screen
				name="Registration"
				component={RegistrationScreen}
				options={{ headerTitle: "Create Account" }}
			/>
			<Stack.Screen
				name="OtpVerification"
				component={OtpVerificationScreen}
				options={{ headerTitle: "Verify OTP" }}
			/>
			<Stack.Screen
				name="MainTabs"
				component={MainTabs}
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="EmergencyForm"
				component={EmergencyFormScreen}
				options={{
					headerTitle: "New Emergency Request",
					presentation: "modal",
				}}
			/>
			<Stack.Screen
				name="EmergencyDetail"
				component={EmergencyDetailScreen}
				options={{ headerTitle: "Emergency Details" }}
			/>
			<Stack.Screen
				name="MyEmergencies"
				component={MyEmergenciesScreen}
				options={{ headerTitle: "My Requests" }}
			/>
			<Stack.Screen
				name="EditProfile"
				component={EditProfileScreen}
				options={{ headerTitle: "Edit Profile" }}
			/>
		</Stack.Navigator>
	);
};

const styles = StyleSheet.create({
	tabBar: {
		backgroundColor: colors.white,
		borderTopWidth: 1,
		borderTopColor: colors.border + "80",
		paddingTop: 4,
		height: 60,
	},
	tabBarLabel: {
		fontSize: fontSize.xs,
		fontWeight: "600",
		marginBottom: 4,
	},
	tabIcon: {
		alignItems: "center",
		justifyContent: "center",
	},
	tabEmoji: {
		fontSize: 22,
		opacity: 0.5,
	},
	tabEmojiActive: {
		opacity: 1,
	},
	tabBadge: {
		backgroundColor: colors.emergency,
		fontSize: 10,
		minWidth: 18,
		height: 18,
		borderRadius: 9,
	},
});

export default AppNavigator;
