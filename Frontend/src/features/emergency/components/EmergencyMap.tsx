import React from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../../../config/theme';
import type { Coordinates } from '../../../types/common';
import type { EmergencyResource } from '../../../types/emergency';

interface EmergencyMapProps {
  userLocation: Coordinates | null;
  emergencyLocation: Coordinates | null;
  helperLocation?: Coordinates | null;
  emergencyType?: EmergencyResource;
  emergencyTitle?: string;
  height?: number;
}

const EmergencyMap: React.FC<EmergencyMapProps> = ({
  userLocation,
  emergencyLocation,
  emergencyType,
  emergencyTitle,
  height = 250,
}) => (
  <View style={[styles.container, { height }]}>
    <View style={styles.mapPlaceholder}>
      <Text style={styles.mapIcon}>🗺️</Text>
      <Text style={styles.mapTitle}>Map View</Text>
      <Text style={styles.mapSubtitle}>Open on web for interactive map</Text>

      <View style={styles.coordinatesContainer}>
        {userLocation && (
          <View style={styles.coordRow}>
            <Text style={styles.coordLabel}>📍 You:</Text>
            <Text style={styles.coordValue}>
              {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
            </Text>
          </View>
        )}
        {emergencyLocation && (
          <View style={styles.coordRow}>
            <Text style={styles.coordLabel}>🚨 Emergency:</Text>
            <Text style={styles.coordValue}>
              {emergencyLocation.latitude.toFixed(4)}, {emergencyLocation.longitude.toFixed(4)}
            </Text>
          </View>
        )}
      </View>

      {emergencyType && (
        <Text style={styles.emergencyTypeText}>
          {emergencyType}: {emergencyTitle || ''}
        </Text>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { width: '100%', borderRadius: borderRadius.lg, overflow: 'hidden', ...shadows.md },
  mapPlaceholder: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing.md, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', borderRadius: borderRadius.lg },
  mapIcon: { fontSize: 40, marginBottom: spacing.sm },
  mapTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  mapSubtitle: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.md },
  coordinatesContainer: { width: '100%', gap: spacing.xs, marginBottom: spacing.sm },
  coordRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  coordLabel: { fontSize: 12, fontWeight: '600', color: colors.text },
  coordValue: { fontSize: 12, color: colors.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  emergencyTypeText: { fontSize: 12, color: colors.emergency, fontWeight: '600', textAlign: 'center' },
});

export default EmergencyMap;
