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
} from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../../../config/theme';
import Input from '../../../components/Input';
import Button from '../../../components/Button';
import Badge from '../../../components/Badge';
import { BLOOD_GROUPS } from '../../../utils/constants';
import { useEmergency } from '../hooks/useEmergency';
import { useLocation } from '../../../hooks/useLocation';
import { useConnectivity } from '../../../hooks/useConnectivity';
import type { EmergencyResource, EmergencyUrgency, CreateEmergencyPayload } from '../../../types/emergency';

const RESOURCES: EmergencyResource[] = ['blood', 'transport', 'medicines', 'food', 'shelter'];
const URGENCIES: EmergencyUrgency[] = ['critical', 'high', 'medium', 'low'];

interface EmergencyFormScreenProps {
  navigation: any;
}

const EmergencyFormScreen: React.FC<EmergencyFormScreenProps> = ({ navigation }) => {
  const { createEmergency, isSubmitting } = useEmergency();
  const { coordinates, getLocation, isLoading: locLoading } = useLocation();
  const { isOnline } = useConnectivity();

  const [resource, setResource] = useState<EmergencyResource | null>(null);
  const [bloodGroup, setBloodGroup] = useState('');
  const [urgency, setUrgency] = useState<EmergencyUrgency>('medium');
  const [locationName, setLocationName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!resource) newErrors.resource = 'Select resource type';
    if (resource === 'blood' && !bloodGroup) newErrors.bloodGroup = 'Blood group required';
    if (!locationName.trim()) newErrors.locationName = 'Location is required';
    if (!coordinates) newErrors.location = 'Unable to get your location';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !resource || !coordinates) return;

    const payload: CreateEmergencyPayload = {
      resource,
      blood_group: resource === 'blood' ? bloodGroup : undefined,
      urgency,
      location_name: locationName.trim(),
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    };

    const result = await createEmergency(payload);

    if (result.success) {
      if (result.info) {
        Alert.alert('Emergency Sent', result.info, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        navigation.goBack();
      }
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
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>
              Offline mode - Emergency will be sent via SMS
            </Text>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Resource Needed</Text>
          <View style={styles.pickerRow}>
            {RESOURCES.map((r) => (
              <TouchableOpacity key={r} onPress={() => { setResource(r); if (errors.resource) setErrors((p) => ({ ...p, resource: '' })); }}>
                <Badge label={r} variant={resource === r ? 'emergency' : 'default'} size="md" style={styles.option} />
              </TouchableOpacity>
            ))}
          </View>
          {errors.resource && <Text style={styles.errorText}>{errors.resource}</Text>}

          {resource === 'blood' && (
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Blood Group <Text style={styles.required}>*</Text></Text>
              <View style={styles.pickerRow}>
                {BLOOD_GROUPS.map((bg) => (
                  <TouchableOpacity key={bg} onPress={() => { setBloodGroup(bg); if (errors.bloodGroup) setErrors((p) => ({ ...p, bloodGroup: '' })); }}>
                    <Badge label={bg} variant={bloodGroup === bg ? 'emergency' : 'default'} size="md" style={styles.option} />
                  </TouchableOpacity>
                ))}
              </View>
              {errors.bloodGroup && <Text style={styles.errorText}>{errors.bloodGroup}</Text>}
            </View>
          )}

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Urgency</Text>
            <View style={styles.pickerRow}>
              {URGENCIES.map((u) => (
                <TouchableOpacity key={u} onPress={() => setUrgency(u)}>
                  <Badge label={u} variant={urgency === u ? 'warning' : 'default'} size="md" style={styles.option} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Input
            label="Location Name"
            placeholder="e.g., AIIMS Bhopal"
            value={locationName}
            onChangeText={(v) => { setLocationName(v); if (errors.locationName) setErrors((p) => ({ ...p, locationName: '' })); }}
            error={errors.locationName}
            required
          />

          <View style={styles.locationBox}>
            <Text style={styles.locationLabel}>
              {locLoading ? 'Getting your location...' : 'Location captured'}
            </Text>
            {coordinates && (
              <Text style={styles.locationCoords}>
                {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}
              </Text>
            )}
            {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
            <Button title="Refresh Location" onPress={getLocation} variant="ghost" size="sm" />
          </View>

          <Button
            title="Submit Emergency Request"
            onPress={handleSubmit}
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.xxl },
  offlineBanner: { backgroundColor: colors.warning + '20', padding: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: borderRadius.md },
  offlineBannerText: { fontSize: fontSize.sm, color: colors.warning, fontWeight: '600', textAlign: 'center' },
  form: { padding: spacing.lg },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  fieldContainer: { marginBottom: spacing.md },
  fieldLabel: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  required: { color: colors.error },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  option: { marginBottom: spacing.xs },
  errorText: { fontSize: fontSize.sm, color: colors.error, marginTop: spacing.xs, marginBottom: spacing.sm },
  locationBox: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  locationLabel: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  locationCoords: { fontSize: fontSize.sm, color: colors.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  submitButton: { marginTop: spacing.md },
});

export default EmergencyFormScreen;
