import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../../../config/theme';
import Button from '../../../components/Button';
import { useAuth } from '../hooks/useAuth';

interface OtpVerificationScreenProps {
  navigation: any;
  route: any;
}

const OtpVerificationScreen: React.FC<OtpVerificationScreenProps> = ({
  navigation,
  route,
}) => {
  const { phone, mode } = route.params || {};
  const { verifyAppRegistration, verifyOtp, sendOtp, isLoading, registrationData } = useAuth();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState('');

  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleOtpChange = (text: string, index: number) => {
    if (text.length > 1) {
      const otpArray = text.split('').slice(0, 6);
      const newOtp = [...otp];
      otpArray.forEach((char, i) => {
        if (index + i < 6) newOtp[index + i] = char;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + otpArray.length, 5);
      if (nextIndex < 6) inputRefs.current[nextIndex]?.focus();
      else inputRefs.current[5]?.blur();
      return;
    }
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length < 6) {
      setError('Please enter the complete OTP');
      return;
    }
    setError('');

    const phoneNumber = phone || registrationData?.phone || '';
    let result;

    if (mode === 'login') {
      result = await verifyOtp(phoneNumber, otpString);
    } else {
      result = await verifyAppRegistration({ phone: phoneNumber, otp: otpString });
    }

    if (result.success) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } else {
      setError(result.error || 'Invalid OTP. Please try again.');
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setTimer(60);
    setCanResend(false);
    setOtp(['', '', '', '', '', '']);
    setError('');

    const phoneNumber = phone || registrationData?.phone || '';
    await sendOtp(phoneNumber);

    inputRefs.current[0]?.focus();
  };

  const maskedNumber = phone
    ? `${phone.slice(0, 2)}****${phone.slice(-4)}`
    : '';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to {maskedNumber}
          </Text>
        </View>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[
                styles.otpInput,
                digit ? styles.otpInputFilled : null,
                error ? styles.otpInputError : null,
              ]}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          title="Verify OTP"
          onPress={handleVerify}
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
          style={styles.verifyButton}
        />

        <View style={styles.resendContainer}>
          {canResend ? (
            <Button title="Resend OTP" onPress={handleResend} variant="ghost" size="sm" />
          ) : (
            <Text style={styles.timerText}>Resend code in {timer}s</Text>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'center' },
  header: { marginBottom: spacing.xxl },
  title: { fontSize: fontSize.xxxl, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 22 },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl, gap: spacing.sm },
  otpInput: { width: 52, height: 60, borderWidth: 2, borderColor: colors.border, borderRadius: borderRadius.lg, textAlign: 'center', fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, backgroundColor: colors.inputBackground },
  otpInputFilled: { borderColor: colors.emergency, backgroundColor: colors.white },
  otpInputError: { borderColor: colors.error },
  errorText: { fontSize: fontSize.sm, color: colors.error, textAlign: 'center', marginBottom: spacing.md },
  verifyButton: { marginBottom: spacing.lg },
  resendContainer: { alignItems: 'center' },
  timerText: { fontSize: fontSize.md, color: colors.textSecondary },
});

export default OtpVerificationScreen;
