import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { colors, fontSize, spacing } from '../../../config/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../../utils/constants';
import { useAuthStore } from '../../../store/authStore';

interface SplashScreenProps {
  navigation: any;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const init = async () => {
      await Location.requestForegroundPermissionsAsync();

      const authStore = useAuthStore.getState();
      await authStore.checkAuth();
      const isAuthenticated = useAuthStore.getState().isAuthenticated;

      const onboardingDone = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);

      setTimeout(() => {
        if (isAuthenticated) {
          navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
        } else if (onboardingDone === 'true') {
          navigation.reset({ index: 0, routes: [{ name: 'AuthOptions' }] });
        } else {
          navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
        }
      }, 1500);
    };

    init();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🚨</Text>
      <Text style={styles.title}>ResQ</Text>
      <Text style={styles.subtitle}>Community Response Network</Text>
      <ActivityIndicator color={colors.white} style={styles.loader} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.emergency, justifyContent: 'center', alignItems: 'center' },
  logo: { fontSize: 64, marginBottom: spacing.md },
  title: { fontSize: fontSize.xxxl, fontWeight: '800', color: colors.white, marginBottom: spacing.sm },
  subtitle: { fontSize: fontSize.md, color: colors.white + 'CC', marginBottom: spacing.xl },
  loader: { marginTop: spacing.lg },
});

export default SplashScreen;
