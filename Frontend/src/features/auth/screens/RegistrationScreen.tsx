import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../../../config/theme';
import Input from '../../../components/Input';
import Button from '../../../components/Button';
import Badge from '../../../components/Badge';
import { BLOOD_GROUPS } from '../../../utils/constants';
import { useAuth } from '../hooks/useAuth';
import { useConnectivity } from '../../../hooks/useConnectivity';
import { useLocation } from '../../../hooks/useLocation';
import { COUNTRIES, type Country } from '../../../constants/countries';
import type { AppRegisterRequest } from '../../../types/auth';

const RESOURCES = ['blood', 'transport', 'medicines', 'food', 'shelter'] as const;

interface RegistrationScreenProps {
  navigation: any;
}

const RegistrationScreen: React.FC<RegistrationScreenProps> = ({ navigation }) => {
  const { registerApp, isLoading, setRegistrationData } = useAuth();
  const { isOnline } = useConnectivity();
  const { coordinates, error: locError, getLocation, isLoading: locLoading } = useLocation();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [locationName, setLocationName] = useState('');
  const [pincode, setPincode] = useState('');
  const [selectedResources, setSelectedResources] = useState<string[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredCountries = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.dialCode.includes(countrySearch),
  );

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  const toggleResource = (r: string) => {
    setSelectedResources((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
    );
    if (errors.resources) setErrors((prev) => ({ ...prev, resources: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!phone.trim()) newErrors.phone = 'Phone number is required';
    else if (!/^\d{4,15}$/.test(phone.replace(/[\s\-]/g, ''))) {
      newErrors.phone = 'Enter a valid phone number';
    }
    if (!bloodGroup) newErrors.bloodGroup = 'Blood group is required';
    if (!locationName.trim()) newErrors.locationName = 'Location is required';
    if (!pincode.trim()) newErrors.pincode = 'Pincode is required';
    else if (!/^\d{5,6}$/.test(pincode.trim())) newErrors.pincode = 'Enter a valid pincode';
    if (selectedResources.length === 0) newErrors.resources = 'Select at least one resource';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    if (!coordinates) {
      const coords = await getLocation();
      if (!coords) {
        setErrors({ submit: 'Unable to get your location. Please enable GPS and try again.' });
        return;
      }
    }

    const fullPhone = `${selectedCountry.dialCode}${phone.trim()}`;

    const data: AppRegisterRequest = {
      phone: fullPhone,
      name: name.trim(),
      resources: selectedResources,
      blood_group: bloodGroup,
      location_name: `${locationName.trim()}, ${pincode.trim()}`,
      latitude: coordinates!.latitude,
      longitude: coordinates!.longitude,
    };

    setRegistrationData(data);
    const result = await registerApp(data);
    if (result.success) {
      if (result.info) {
        Alert.alert('Registration Submitted', result.info, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        navigation.navigate('OtpVerification', { phone: data.phone });
      }
    } else {
      setErrors({ submit: result.error || 'Registration failed' });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Register to start receiving and providing emergency assistance
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Full Name"
            placeholder="Enter your full name"
            value={name}
            onChangeText={(v) => { setName(v); if (errors.name) setErrors((p) => ({ ...p, name: '' })); }}
            error={errors.name}
            autoCapitalize="words"
            required
          />

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              Phone Number <Text style={styles.required}>*</Text>
            </Text>
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
                  style={[styles.phoneInput, errors.phone ? styles.phoneInputError : null]}
                  placeholder="9876543210"
                  placeholderTextColor={colors.textSecondary}
                  value={phone}
                  onChangeText={(v) => { setPhone(v); if (errors.phone) setErrors((p) => ({ ...p, phone: '' })); }}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
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

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              Blood Group <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.pickerRow}>
              {BLOOD_GROUPS.map((bg) => (
                <TouchableOpacity key={bg} onPress={() => { setBloodGroup(bg); if (errors.bloodGroup) setErrors((p) => ({ ...p, bloodGroup: '' })); }}>
                  <Badge
                    label={bg}
                    variant={bloodGroup === bg ? 'emergency' : 'default'}
                    size="md"
                    style={styles.option}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {errors.bloodGroup && <Text style={styles.errorText}>{errors.bloodGroup}</Text>}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              I can help with <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.pickerRow}>
              {RESOURCES.map((r) => (
                <TouchableOpacity key={r} onPress={() => toggleResource(r)}>
                  <Badge
                    label={r}
                    variant={selectedResources.includes(r) ? 'info' : 'default'}
                    size="md"
                    style={styles.option}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {errors.resources && <Text style={styles.errorText}>{errors.resources}</Text>}
          </View>

          <Input
            label="Location"
            placeholder="e.g., AIIMS Bhopal"
            value={locationName}
            onChangeText={(v) => { setLocationName(v); if (errors.locationName) setErrors((p) => ({ ...p, locationName: '' })); }}
            error={errors.locationName}
            required
          />

          <Input
            label="Pincode"
            placeholder="e.g., 462001"
            value={pincode}
            onChangeText={(v) => { setPincode(v); if (errors.pincode) setErrors((p) => ({ ...p, pincode: '' })); }}
            error={errors.pincode}
            keyboardType="number-pad"
            maxLength={6}
            required
          />

          <View style={styles.locationBox}>
            <Text style={styles.locationLabel}>
              {locLoading ? 'Getting your location...' : coordinates ? 'GPS location captured' : locError || 'Unable to get GPS location'}
            </Text>
            {coordinates && (
              <Text style={styles.locationCoords}>
                {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}
              </Text>
            )}
            {!coordinates && !locLoading && (
              <Button title="Retry Location" onPress={getLocation} variant="ghost" size="sm" />
            )}
          </View>

          {errors.submit && (
            <Text style={styles.errorText}>{errors.submit}</Text>
          )}

          <Button
            title="Register"
            onPress={handleSubmit}
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.xxl },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, paddingBottom: spacing.lg },
  title: { fontSize: fontSize.xxxl, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 22 },
  form: { paddingHorizontal: spacing.xl },
  fieldContainer: { marginBottom: spacing.md },
  fieldLabel: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  required: { color: colors.error },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  option: { marginBottom: spacing.xs },
  errorText: { fontSize: fontSize.sm, color: colors.error, marginTop: spacing.xs },
  submitButton: { marginTop: spacing.lg },
  locationBox: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  locationLabel: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  locationCoords: { fontSize: fontSize.sm, color: colors.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  phoneRow: { flexDirection: 'row', gap: spacing.sm },
  countryPicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBackground, borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, minHeight: 52, gap: spacing.xs },
  countryFlag: { fontSize: 22 },
  countryCode: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  countryArrow: { fontSize: 10, color: colors.textSecondary },
  phoneInputWrapper: { flex: 1 },
  phoneInput: { flex: 1, backgroundColor: colors.inputBackground, borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, fontSize: fontSize.lg, color: colors.text, minHeight: 52 },
  phoneInputError: { borderColor: colors.error },
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

export default RegistrationScreen;
