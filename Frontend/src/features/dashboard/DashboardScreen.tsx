import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { colors, fontSize, spacing, borderRadius, shadows } from '../../config/theme';
import Card from '../../components/Card';
import Badge, { getEmergencyTypeVariant, getStatusVariant } from '../../components/Badge';
import { useEmergency } from '../emergency/hooks/useEmergency';
import { useNotificationStore } from '../../store/notificationStore';
import { useConnectivity } from '../../hooks/useConnectivity';
import { formatDistance } from '../../utils/distance';

interface DashboardScreenProps {
  navigation: any;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const { emergencies, isLoading, fetchEmergencies, syncStatus } = useEmergency();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  const { isOnline } = useConnectivity();

  useEffect(() => {
    fetchEmergencies();
    fetchNotifications();
  }, [fetchEmergencies, fetchNotifications]);

  const onRefresh = () => {
    fetchEmergencies();
    fetchNotifications();
  };

  const quickActions = [
    {
      title: 'New Emergency',
      icon: '🚨',
      color: colors.emergency,
      onPress: () => navigation.navigate('EmergencyForm'),
    },
    {
      title: 'My Requests',
      icon: '📋',
      color: colors.info,
      onPress: () => navigation.navigate('MyEmergencies'),
    },
    {
      title: 'Notifications',
      icon: '🔔',
      color: colors.warning,
      badge: unreadCount > 0 ? unreadCount : undefined,
      onPress: () => navigation.navigate('Notifications'),
    },
    {
      title: 'Map View',
      icon: '🗺️',
      color: colors.helpAvailable,
      onPress: () => navigation.navigate('Map'),
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          tintColor={colors.emergency}
          colors={[colors.emergency]}
        />
      }
    >
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            📡 You are offline. Emergency requests will be sent when connected.
          </Text>
        </View>
      )}

      {syncStatus.pending > 0 && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncText}>
            🔄 {syncStatus.pending} pending request{syncStatus.pending > 1 ? 's' : ''} waiting to sync
          </Text>
        </View>
      )}

      <View style={styles.greeting}>
        <Text style={styles.greetingTitle}>ResQ</Text>
        <Text style={styles.greetingSubtitle}>
          {emergencies.length} active emergency{emergencies.length !== 1 ? 'ies' : ''} near you
        </Text>
      </View>

      <View style={styles.quickActions}>
        {quickActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.quickActionCard, { backgroundColor: action.color + '12' }]}
            onPress={action.onPress}
            activeOpacity={0.7}
          >
            <Text style={styles.quickActionIcon}>{action.icon}</Text>
            <Text style={[styles.quickActionTitle, { color: action.color }]}>
              {action.title}
            </Text>
            {action.badge && (
              <View style={styles.badgeDot}>
                <Text style={styles.badgeText}>{action.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Emergencies</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Emergencies')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {emergencies.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>All Clear</Text>
            <Text style={styles.emptyMessage}>
              No active emergencies in your area
            </Text>
          </Card>
        ) : (
          emergencies.slice(0, 3).map((emergency) => (
            <TouchableOpacity
              key={emergency._id}
              style={styles.emergencyCard}
              onPress={() =>
                navigation.navigate('EmergencyDetail', {
                  emergencyId: emergency._id,
                })
              }
              activeOpacity={0.7}
            >
              <View style={styles.emergencyCardHeader}>
                <Badge
                  label={emergency.resource}
                  variant={getEmergencyTypeVariant(emergency.resource)}
                  size="sm"
                />
                <Badge
                  label={emergency.status}
                  variant={getStatusVariant(emergency.status)}
                  size="sm"
                />
              </View>
              <Text style={styles.emergencyCardTitle}>{emergency.location_name}</Text>
              <View style={styles.emergencyCardFooter}>
                <Text style={styles.emergencyDistance}>
                  📍 {formatDistance(emergency.distance_km)}
                </Text>
                <Text style={styles.emergencyTime}>⏱️ {emergency.time_ago}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: spacing.xxl },
  offlineBanner: { backgroundColor: colors.warning + '20', padding: spacing.md, marginHorizontal: spacing.md, marginTop: spacing.md, borderRadius: borderRadius.md },
  offlineText: { fontSize: fontSize.sm, color: colors.warning, fontWeight: '600', textAlign: 'center' },
  syncBanner: { backgroundColor: colors.info + '15', padding: spacing.md, marginHorizontal: spacing.md, marginTop: spacing.sm, borderRadius: borderRadius.md },
  syncText: { fontSize: fontSize.sm, color: colors.info, fontWeight: '600', textAlign: 'center' },
  greeting: { padding: spacing.lg, paddingBottom: spacing.sm },
  greetingTitle: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
  greetingSubtitle: { fontSize: fontSize.md, color: colors.textSecondary },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.sm, gap: spacing.sm },
  quickActionCard: { width: '47%', padding: spacing.lg, borderRadius: borderRadius.lg, minHeight: 100, justifyContent: 'center', alignItems: 'center', ...shadows.sm },
  quickActionIcon: { fontSize: 28, marginBottom: spacing.sm },
  quickActionTitle: { fontSize: fontSize.sm, fontWeight: '700', textAlign: 'center' },
  badgeDot: { position: 'absolute', top: spacing.sm, right: spacing.sm, backgroundColor: colors.emergency, borderRadius: 11, width: 22, height: 22, justifyContent: 'center', alignItems: 'center' },
  badgeText: { fontSize: fontSize.xs, color: colors.white, fontWeight: '700' },
  section: { padding: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  seeAll: { fontSize: fontSize.sm, color: colors.emergency, fontWeight: '600' },
  emptyCard: { padding: spacing.xxl, alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: spacing.md },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  emptyMessage: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center' },
  emergencyCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadows.sm },
  emergencyCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  emergencyCardTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  emergencyCardFooter: { flexDirection: 'row', gap: spacing.md },
  emergencyDistance: { fontSize: fontSize.sm, color: colors.textSecondary },
  emergencyTime: { fontSize: fontSize.sm, color: colors.textSecondary },
});

export default DashboardScreen;
