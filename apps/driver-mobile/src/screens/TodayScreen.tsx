import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { DataBadge } from '../components/DataBadge';
import { DRIVER_PROFILE, DRIVER_STOPS, DriverStop } from '../data/mockDriverData';

interface TodayScreenProps {
  onNavigateToLiveRoute: (stop: DriverStop) => void;
}

export const TodayScreen: React.FC<TodayScreenProps> = ({ onNavigateToLiveRoute }) => {
  const [selectedDate, setSelectedDate] = useState<string>('29 Oct');
  const [stops, setStops] = useState<DriverStop[]>(DRIVER_STOPS);
  const [shiftActive, setShiftActive] = useState<boolean>(true);

  const dates = [
    { day: 'Wed', date: '29 Oct', active: true },
    { day: 'Thu', date: '30 Oct', active: false },
    { day: 'Fri', date: '31 Oct', active: false },
    { day: 'Sat', date: '01 Nov', active: false }
  ];

  const handleToggleComplete = (stopId: string) => {
    setStops(prev =>
      prev.map(s => (s.id === stopId ? { ...s, status: s.status === 'completed' ? 'pending' : 'completed' } : s))
    );
  };

  const completedCount = stops.filter(s => s.status === 'completed').length;
  const progressPct = Math.round((completedCount / stops.length) * 100);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header & Source Badge */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>01 · DISPATCH MANIFEST</Text>
            <Text style={styles.greeting}>Namaste, {DRIVER_PROFILE.name.split(' ')[0]}</Text>
          </View>
          <DataBadge label="Preview" tone="preview" />
        </View>

        {/* Date Selector Carousel (Vanta Ride Style) */}
        <View style={styles.dateCarousel}>
          {dates.map(d => {
            const isSelected = selectedDate === d.date;
            return (
              <TouchableOpacity
                key={d.date}
                style={[styles.dateCard, isSelected && styles.dateCardActive]}
                onPress={() => setSelectedDate(d.date)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dateDay, isSelected && styles.dateDayActive]}>{d.day}</Text>
                <Text style={[styles.dateNum, isSelected && styles.dateNumActive]}>{d.date.split(' ')[0]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Daily Summary & Earnings Card (Atlas / Tactical HUD Style) */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryLabel}>TODAY'S SHIFT PAY</Text>
              <Text style={styles.summaryAmount}>₹{DRIVER_PROFILE.todayEarningsInr.toLocaleString('en-IN')}</Text>
              <Text style={styles.assumedRate}>{DRIVER_PROFILE.assumedRateLabel}</Text>
            </View>
            <View style={styles.shiftBadge}>
              <View style={[styles.statusDot, { backgroundColor: shiftActive ? '#205A46' : '#77736D' }]} />
              <Text style={styles.shiftBadgeText}>{shiftActive ? 'SHIFT ACTIVE' : 'STANDBY'}</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressText}>Stop Delivery Progress</Text>
              <Text style={styles.progressPctText}>{completedCount}/{stops.length} ({progressPct}%)</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
            </View>
          </View>

          {/* Vehicle Telemetry Strip */}
          <View style={styles.vehicleStrip}>
            <Text style={styles.vehicleInfoText}>🚚 {DRIVER_PROFILE.vehicleCallsign} · {DRIVER_PROFILE.vehicleModel}</Text>
            <Text style={styles.batteryText}>🔋 {DRIVER_PROFILE.batteryPct}% SoC</Text>
          </View>
        </View>

        {/* Ordered Stops Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Assigned Stops ({stops.length})</Text>
          <Text style={styles.sectionSub}>Tap for live turn-by-turn navigation</Text>
        </View>

        {/* Vertical Stop Itinerary Cards (Vanta Ride & Fieldnotes Style) */}
        <View style={styles.stopList}>
          {stops.map(stop => {
            const isCompleted = stop.status === 'completed';
            const isAtRisk = stop.status === 'at_risk';

            return (
              <View key={stop.id} style={[styles.stopCard, isCompleted && styles.stopCardCompleted]}>
                <View style={styles.stopHeader}>
                  <View style={styles.stopSequenceRow}>
                    <View style={[styles.stopBadge, isCompleted && styles.stopBadgeDone, isAtRisk && styles.stopBadgeRisk]}>
                      <Text style={styles.stopBadgeText}>{stop.isLocked ? '🔒' : stop.sequence}</Text>
                    </View>
                    <View style={styles.stopTitleWrap}>
                      <Text style={[styles.stopCustomerName, isCompleted && styles.textMuted]}>
                        {stop.customerName}
                      </Text>
                      <Text style={styles.stopAddress}>{stop.address}</Text>
                    </View>
                  </View>

                  <View style={[styles.statusPill, isCompleted && styles.pillSuccess, isAtRisk && styles.pillRisk]}>
                    <Text style={[styles.statusPillText, isCompleted && styles.pillTextSuccess, isAtRisk && styles.pillTextRisk]}>
                      {stop.status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Timing & Demand */}
                <View style={styles.stopDetailsRow}>
                  <Text style={styles.stopDetailItem}>⏰ {stop.windowStart} – {stop.windowEnd}</Text>
                  <Text style={styles.stopDetailItem}>📦 {stop.demandKg} kg</Text>
                  <Text style={styles.stopDetailItem}>ETA: {stop.eta}</Text>
                </View>

                {/* Delay Warning Note if at-risk */}
                {stop.notes && (
                  <View style={styles.warningNote}>
                    <Text style={styles.warningNoteText}>⚠️ {stop.notes}</Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => onNavigateToLiveRoute(stop)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.navButtonText}>Start Navigation →</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.checkButton, isCompleted && styles.checkButtonDone]}
                    onPress={() => handleToggleComplete(stop.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.checkButtonText, isCompleted && styles.checkButtonTextDone]}>
                      {isCompleted ? '✓ Done' : 'Complete'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
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
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: '#15211D',
    marginTop: 2,
  },
  dateCarousel: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  dateCard: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(21, 33, 29, 0.08)',
    alignItems: 'center',
  },
  dateCardActive: {
    backgroundColor: '#17231F',
    borderColor: '#17231F',
  },
  dateDay: {
    fontSize: 11,
    fontWeight: '600',
    color: '#77736D',
  },
  dateDayActive: {
    color: '#A8DBC9',
  },
  dateNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#15211D',
    marginTop: 2,
  },
  dateNumActive: {
    color: '#FFFFFF',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(21, 33, 29, 0.08)',
    marginBottom: 20,
    shadowColor: '#101828',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#77736D',
    fontFamily: 'monospace',
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#205A46',
    marginTop: 2,
  },
  assumedRate: {
    fontSize: 10,
    color: '#77736D',
    marginTop: 2,
  },
  shiftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#E2F4EE',
    borderRadius: 999,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  shiftBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#205A46',
  },
  progressContainer: {
    marginTop: 16,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15211D',
  },
  progressPctText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#205A46',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#EEF2ED',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#205A46',
    borderRadius: 999,
  },
  vehicleStrip: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(21, 33, 29, 0.06)',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vehicleInfoText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15211D',
  },
  batteryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#205A46',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#15211D',
  },
  sectionSub: {
    fontSize: 11,
    color: '#77736D',
    marginTop: 1,
  },
  stopList: {
    gap: 12,
  },
  stopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(21, 33, 29, 0.08)',
  },
  stopCardCompleted: {
    backgroundColor: '#FAFBF9',
    borderColor: 'rgba(21, 33, 29, 0.04)',
    opacity: 0.85,
  },
  stopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stopSequenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  stopBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#17231F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stopBadgeDone: {
    backgroundColor: '#205A46',
  },
  stopBadgeRisk: {
    backgroundColor: '#C6534C',
  },
  stopBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  stopTitleWrap: {
    flex: 1,
  },
  stopCustomerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15211D',
  },
  stopAddress: {
    fontSize: 11,
    color: '#77736D',
    marginTop: 1,
  },
  textMuted: {
    color: '#77736D',
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#EEF2ED',
  },
  pillSuccess: {
    backgroundColor: '#E2F4EE',
  },
  pillRisk: {
    backgroundColor: '#FBECEB',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4B5563',
  },
  pillTextSuccess: {
    color: '#205A46',
  },
  pillTextRisk: {
    color: '#C6534C',
  },
  stopDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(21, 33, 29, 0.04)',
  },
  stopDetailItem: {
    fontSize: 10,
    fontWeight: '600',
    color: '#55534F',
  },
  warningNote: {
    marginTop: 8,
    backgroundColor: '#FDF4EB',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FBD6B0',
  },
  warningNoteText: {
    fontSize: 10,
    color: '#9A5B00',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  navButton: {
    flex: 1,
    backgroundColor: '#17231F',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  checkButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(21, 33, 29, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButtonDone: {
    backgroundColor: '#E2F4EE',
    borderColor: '#A8DBC9',
  },
  checkButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15211D',
  },
  checkButtonTextDone: {
    color: '#205A46',
  },
});
