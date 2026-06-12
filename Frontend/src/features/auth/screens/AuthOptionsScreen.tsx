import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../../../config/theme';
import Button from '../../../components/Button';

interface AuthOptionsScreenProps {
  navigation: any;
}

const AuthOptionsScreen: React.FC<AuthOptionsScreenProps> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🚨</Text>
        <Text style={styles.title}>Emergency Connect</Text>
        <Text style={styles.subtitle}>Community Response Network</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.heading}>Welcome</Text>
        <Text style={styles.description}>
          Register or log in to start receiving and providing emergency assistance in your community.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          title="Login"
          onPress={() => navigation.navigate('Login')}
          variant="primary"
          size="lg"
          fullWidth
        />
        <Button
          title="Create Account"
          onPress={() => navigation.navigate('Registration')}
          variant="outline"
          size="lg"
          fullWidth
          style={styles.signUpButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, justifyContent: 'center', paddingHorizontal: spacing.xl },
  header: { alignItems: 'center', marginBottom: spacing.xxl },
  logo: { fontSize: 64, marginBottom: spacing.md },
  title: { fontSize: fontSize.xxxl, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary },
  content: { marginBottom: spacing.xxl },
  heading: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  description: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 22 },
  actions: { gap: spacing.md },
  signUpButton: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.emergency },
});

export default AuthOptionsScreen;
