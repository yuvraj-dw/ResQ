import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { colors, fontSize, spacing, borderRadius, shadows } from '../../../config/theme';
import EmergencyMap from '../../emergency/components/EmergencyMap';
import Card from '../../../components/Card';
import Badge, { getEmergencyTypeVariant } from '../../../components/Badge';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { useEmergency } from '../../emergency/hooks/useEmergency';
import { useLocation } from '../../../hooks/useLocation';
import { calculateDistance, formatDistance } from '../../../utils/distance';
import type { EmergencyCardData } from '../../../types/emergency';

const { width } = Dimensions.get('window');

interface MapScreenProps {
  navigation: any;
}

const MapScreen: React.FC<MapScreenProps> = ({ navigation }) => {
  const { emergencies, isLoading, fetchEmergencies } = useEmergency();
  const { coordinates: userLocation } = useLocation();
  const [selectedEmergency, setSelectedEmergency] = useState<EmergencyCardData | null>(null);

  useEffect(() => {
    fetchEmergencies();
  }, [fetchEmergencies]);

  const handleEmergencyPress = useCallback(
    (emergency: EmergencyCardData) => {
      setSelectedEmergency(emergency);
    },
    [],
  );

  const handleViewDetails = useCallback(
    (id: string) => {
      navigation.navigate('EmergencyDetail', { emergencyId: id });
    },
    [navigation],
  );

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading map..." />;
  }

  return (
    <View style={styles.container}>
      <EmergencyMap
        userLocation={userLocation}
        emergencyLocation={
          selectedEmergency && selectedEmergency.latitude
            ? {
                latitude: selectedEmergency.latitude,
                longitude: selectedEmergency.longitude!,
              }
            : null
        }
        height={selectedEmergency ? 250 : 350}
      />

      <View style={styles.emergenciesPanel}>
        <Text style={styles.panelTitle}>
          Emergencies Near You ({emergencies.length})
        </Text>

        {emergencies.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No emergencies in your area</Text>
          </View>
        ) : (
          emergencies.slice(0, 5).map((emergency) => {
            const distance = userLocation
              ? formatDistance(emergency.distance_km)
              : 'Unknown';
            const typeVariant = getEmergencyTypeVariant(emergency.resource);

            return (
              <TouchableOpacity
                key={emergency._id}
                style={[
                  styles.emergencyRow,
                  selectedEmergency?._id === emergency._id && styles.selectedRow,
                ]}
                onPress={() => handleEmergencyPress(emergency)}
                activeOpacity={0.7}
              >
                <View style={styles.rowLeft}>
                  <Badge label={emergency.resource} variant={typeVariant} size="sm" />
                  <Text style={styles.emergencyTitle} numberOfLines={1}>
                    {emergency.location_name}
                  </Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.distanceText}>{distance}</Text>
                  <TouchableOpacity onPress={() => handleViewDetails(emergency._id)}>
                    <Text style={styles.viewLink}>View</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  emergenciesPanel: { flex: 1, padding: spacing.md },
  panelTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  emergencyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.sm, ...shadows.sm },
  selectedRow: { borderColor: colors.emergency, borderWidth: 2 },
  rowLeft: { flex: 1, gap: spacing.xs },
  emergencyTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  rowRight: { alignItems: 'flex-end', gap: spacing.xs },
  distanceText: { fontSize: fontSize.sm, color: colors.textSecondary },
  viewLink: { fontSize: fontSize.sm, color: colors.emergency, fontWeight: '600' },
  emptyContainer: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary },
});

export default MapScreen;
