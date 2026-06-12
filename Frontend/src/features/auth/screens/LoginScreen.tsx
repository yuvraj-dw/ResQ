import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../../../config/theme';
import Button from '../../../components/Button';
import { COUNTRIES, type Country } from '../../../constants/countries';
import { useAuth } from '../hooks/useAuth';

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { sendOtp, isLoading } = useAuth();

  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [error, setError] = useState('');

  const filteredCountries = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.dialCode.includes(countrySearch),
  );

  const validate = (): boolean => {
    if (!phone.trim()) {
      setError('Phone number is required');
      return false;
    }
    if (!/^\d{4,15}$/.test(phone.replace(/[\s\-]/g, ''))) {
      setError('Enter a valid phone number');
      return false;
    }
    return true;
  };

  const handleSendOtp = async () => {
    if (!validate()) return;
    setError('');

    const fullPhone = `${selectedCountry.dialCode}${phone.trim()}`;
    const result = await sendOtp(fullPhone);

    if (result.success) {
      navigation.navigate('OtpVerification', { phone: fullPhone, mode: 'login' });
    } else {
      setError(result.error || 'Failed to send OTP');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Login</Text>
          <Text style={styles.subtitle}>
            Enter your phone number to receive a one-time password
          </Text>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Phone Number</Text>
          <View style={styles.phoneRow}>
            <TouchableOpacity
              style={styles.countryPicker}
              onPress={() => setShowCountryPicker(true)}
            >
              <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
              <Text style={styles.countryCode}>{selectedCountry.dialCode}</Text>
              <Text style={styles.countryArrow}>▼</Text>
            </TouchableOpacity>
            <View style={styles.phoneInputWrapper}>
              <TextInput
                style={[styles.phoneInput, error ? styles.phoneInputError : null]}
                placeholder="9876543210"
                placeholderTextColor={colors.textSecondary}
                value={phone}
                onChangeText={(v) => { setPhone(v); setError(''); }}
                keyboardType="phone-pad"
              />
            </View>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <Button
          title="Send OTP"
          onPress={handleSendOtp}
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
          style={styles.sendButton}
        />
      </View>

      <Modal visible={showCountryPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => { setShowCountryPicker(false); setCountrySearch(''); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search country or code..."
              placeholderTextColor={colors.textSecondary}
              value={countrySearch}
              onChangeText={setCountrySearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    item.code === selectedCountry.code && styles.countryItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedCountry(item);
                    setShowCountryPicker(false);
                    setCountrySearch('');
                  }}
                >
                  <Text style={styles.countryItemFlag}>{item.flag}</Text>
                  <Text style={styles.countryItemName}>{item.name}</Text>
                  <Text style={styles.countryItemCode}>{item.dialCode}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  header: { marginBottom: spacing.xxl },
  title: { fontSize: fontSize.xxxl, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 22 },
  fieldContainer: { marginBottom: spacing.lg },
  fieldLabel: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  phoneRow: { flexDirection: 'row', gap: spacing.sm },
  countryPicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBackground, borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, minHeight: 52, gap: spacing.xs },
  countryFlag: { fontSize: 22 },
  countryCode: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  countryArrow: { fontSize: 10, color: colors.textSecondary },
  phoneInputWrapper: { flex: 1 },
  phoneInput: { flex: 1, backgroundColor: colors.inputBackground, borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, fontSize: fontSize.lg, color: colors.text, minHeight: 52 },
  phoneInputError: { borderColor: colors.error },
  sendButton: { marginTop: spacing.md },
  errorText: { fontSize: fontSize.sm, color: colors.error, marginTop: spacing.xs },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, maxHeight: '80%', paddingBottom: spacing.xxl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  modalClose: { fontSize: fontSize.xl, color: colors.textSecondary, padding: spacing.xs },
  searchInput: { margin: spacing.lg, backgroundColor: colors.inputBackground, borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, fontSize: fontSize.md, color: colors.text, minHeight: 44 },
  countryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.md },
  countryItemSelected: { backgroundColor: colors.surface },
  countryItemFlag: { fontSize: 22 },
  countryItemName: { flex: 1, fontSize: fontSize.md, color: colors.text },
  countryItemCode: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '600' },
});

export default LoginScreen;
