import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView
} from 'react-native';
import { DataBadge } from '../components/DataBadge';
import { DRIVER_PROFILE } from '../data/mockDriverData';

export const ProfileScreen: React.FC = () => {
  const [offlineSync, setOfflineSync] = useState<boolean>(true);
  const [hapticFeedback, setHapticFeedback] = useState<boolean>(true);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>04 · DRIVER DOSSIER</Text>
            <Text style={styles.title}>Operator Profile</Text>
          </View>
          <DataBadge label="Preview" tone="preview" />
        </View>

        {/* Profile Identity Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>RG</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.driverName}>{DRIVER_PROFILE.name}</Text>
              <Text style={styles.driverId}>{DRIVER_PROFILE.driverId} · Rating {DRIVER_PROFILE.rating} ★</Text>
              <Text style={styles.driverPhone}>{DRIVER_PROFILE.phone}</Text>
            </View>
          </View>
        </View>

        {/* Assigned Vehicle Dossier */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Assigned Electric Fleet Unit</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Callsign</Text>
            <Text style={styles.rowValueBold}>{DRIVER_PROFILE.vehicleCallsign}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Vehicle Model</Text>
            <Text style={styles.rowValue}>{DRIVER_PROFILE.vehicleModel}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Registration</Text>
            <Text style={styles.rowValueMono}>{DRIVER_PROFILE.licenseNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Payload Capacity</Text>
            <Text style={styles.rowValue}>{DRIVER_PROFILE.maxPayloadKg} kg Max Payload</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Battery State of Charge</Text>
            <Text style={[styles.rowValueBold, { color: '#205A46' }]}>{DRIVER_PROFILE.batteryPct}% Nominal</Text>
          </View>
        </View>

        {/* Honest System Governance Notice */}
        <View style={styles.noticeCard}>
          <Text style={styles.noticeHeading}>HONEST DATA STATES · AGENTS.md §7</Text>
          <Text style={styles.noticeBody}>
            Driver endpoints do not exist in current backend: driver screens operate in Preview mode with local fixtures. No device permissions (GPS, camera, notifications) are requested.
          </Text>
          <View style={styles.noticePills}>
            <Text style={styles.noticePill}>₹83/$ assumed rate</Text>
            <Text style={styles.noticePill}>Simulated ETAs</Text>
          </View>
        </View>

        {/* Device & Sync Settings */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Terminal Configuration</Text>

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchTitle}>Offline Manifest Cache</Text>
              <Text style={styles.switchSubtitle}>Local storage of stop waypoints</Text>
            </View>
            <Switch
              value={offlineSync}
              onValueChange={setOfflineSync}
              trackColor={{ false: '#EEF2ED', true: '#205A46' }}
            />
          </View>

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchTitle}>Haptic Feedback</Text>
              <Text style={styles.switchSubtitle}>Vibrate on stop approach</Text>
            </View>
            <Switch
              value={hapticFeedback}
              onValueChange={setHapticFeedback}
              trackColor={{ false: '#EEF2ED', true: '#205A46' }}
            />
          </View>
        </View>

        {/* Version Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>arQ Driver HUD · v1.4.0 (Expo Android Native)</Text>
          <Text style={styles.footerText}>QML-01 Dispatch Logistics OS · Bangalore</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8F5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: '#77736D',
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#15211D',
    marginTop: 2,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(21, 33, 29, 0.08)',
    marginBottom: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#17231F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#A8DBC9',
    fontSize: 18,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#15211D',
  },
  driverId: {
    fontSize: 11,
    color: '#77736D',
    marginTop: 1,
  },
  driverPhone: {
    fontSize: 11,
    fontWeight: '600',
    color: '#205A46',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(21, 33, 29, 0.08)',
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15211D',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(21, 33, 29, 0.04)',
  },
  rowLabel: {
    fontSize: 12,
    color: '#55534F',
  },
  rowValue: {
    fontSize: 12,
    color: '#15211D',
    fontWeight: '600',
  },
  rowValueBold: {
    fontSize: 12,
    color: '#15211D',
    fontWeight: '800',
  },
  rowValueMono: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#15211D',
  },
  noticeCard: {
    backgroundColor: '#F8F6F1',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2DEC9',
    borderLeftWidth: 4,
    borderLeftColor: '#205A46',
    marginBottom: 16,
  },
  noticeHeading: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#205A46',
  },
  noticeBody: {
    fontSize: 11,
    color: '#55534F',
    marginTop: 4,
    lineHeight: 16,
  },
  noticePills: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  noticePill: {
    fontSize: 9,
    fontWeight: '700',
    color: '#77736D',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(21, 33, 29, 0.04)',
  },
  switchTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15211D',
  },
  switchSubtitle: {
    fontSize: 10,
    color: '#77736D',
    marginTop: 1,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 2,
  },
  footerText: {
    fontSize: 10,
    color: '#929E99',
    fontFamily: 'monospace',
  },
});
