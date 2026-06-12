import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { colors, borderRadius, shadows } from '../../../config/theme';
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

const UserIcon = L.divIcon({
  html: '<div style="background:#2ECC71;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 4px rgba(0,0,0,0.5);"/>',
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const EmergencyIcon = L.divIcon({
  html: '<div style="background:#DC143C;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 4px rgba(0,0,0,0.5);"/>',
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const EmergencyMap: React.FC<EmergencyMapProps> = ({
  userLocation,
  emergencyLocation,
  emergencyType,
  emergencyTitle,
  height = 250,
}) => {
  const center = emergencyLocation || userLocation || { latitude: 20.5937, longitude: 78.9629 };
  const zoom = userLocation && emergencyLocation ? 13 : 10;

  return (
    <View style={[styles.container, { height }]}>
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {userLocation && (
          <Marker position={[userLocation.latitude, userLocation.longitude]} icon={UserIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}
        {emergencyLocation && (
          <Marker
            position={[emergencyLocation.latitude, emergencyLocation.longitude]}
            icon={EmergencyIcon}
          >
            <Popup>
              <strong>Emergency</strong>
              {emergencyType && <><br /><span>Type: {emergencyType}</span></>}
              {emergencyTitle && <><br /><span>{emergencyTitle}</span></>}
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', borderRadius: borderRadius.lg, overflow: 'hidden', ...shadows.md },
});

export default EmergencyMap;
