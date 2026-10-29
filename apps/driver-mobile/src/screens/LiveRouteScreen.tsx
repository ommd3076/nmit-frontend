import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { DataBadge } from '../components/DataBadge';
import { DRIVER_STOPS, DriverStop } from '../data/mockDriverData';

interface LiveRouteScreenProps {
  activeStop?: DriverStop;
  onStopCompleted?: () => void;
}

export const LiveRouteScreen: React.FC<LiveRouteScreenProps> = ({
  activeStop = DRIVER_STOPS[1],
  onStopCompleted
}) => {
  const [arrived, setArrived] = useState<boolean>(false);
  const [delayReported, setDelayReported] = useState<boolean>(false);

  const handleMarkArrived = () => {
    setArrived(true);
    if (onStopCompleted) onStopCompleted();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top HUD Telemetry Bar (Image 2 Dark Tactical Navigation) */}
      <View style={styles.topHud}>
        <View>
          <Text style={styles.hudSub}>TACTICAL NAVIGATION · BENGALURU</Text>
          <Text style={styles.hudLocation}>Indiranagar 100ft Rd → Koramangala</Text>
        </View>
        <DataBadge label="Preview" tone="preview" />
      </View>

      {/* Maneuver Banner */}
      <View style={styles.maneuverCard}>
        <View style={styles.turnIconCircle}>
          <Text style={styles.turnIconText}>↱</Text>
        </View>
        <View style={styles.maneuverTextWrap}>
          <Text style={styles.maneuverDistance}>In 350 meters</Text>
          <Text style={styles.maneuverInstruction}>Turn right onto 100 Feet Road</Text>
        </View>
        <View style={styles.speedWrap}>
          <Text style={styles.speedNum}>34</Text>
          <Text style={styles.speedUnit}>KM/H</Text>
        </View>
      </View>

      {/* Tactical Route Map Visual Surface */}
      <View style={styles.mapCanvas}>
        {/* Dark Map Canvas with Architectural Grid */}
        <View style={styles.gridOverlay}>
          {/* Simulated Tactical Route Polylines */}
          <View style={styles.routePolylineBacking} />
          <View style={styles.routePolylineCore} />

          {/* Heading Chevron on Route */}
          <View style={styles.headingChevron}>
            <Text style={styles.chevronIcon}>▲</Text>
          </View>

          {/* Destination Pin */}
          <View style={styles.destPin}>
            <View style={styles.destPinDot} />
            <View style={styles.destPinCallout}>
              <Text style={styles.destPinText}>{activeStop.customerName.split(' ')[0]}</Text>
            </View>
          </View>

          {/* Traffic Congestion Alert Tag */}
          <View style={styles.trafficAlertTag}>
            <Text style={styles.trafficAlertText}>Advisory: +12 min Corridor Delay (Hosur Main Rd)</Text>
          </View>
        </View>
      </View>

      {/* Bottom Destination HUD & Active Delivery Actions */}
      <View style={styles.bottomSheet}>
        <View style={styles.sheetHandle} />

        <View style={styles.destinationHeader}>
          <View>
            <Text style={styles.destinationStopIdx}>STOP #{activeStop.sequence} OF 4</Text>
            <Text style={styles.destinationName}>{activeStop.customerName}</Text>
            <Text style={styles.destinationAddress}>{activeStop.address}</Text>
          </View>
          <View style={styles.etaBadge}>
            <Text style={styles.etaText}>14:42 IST</Text>
            <Text style={styles.etaSub}>(simulated)</Text>
          </View>
        </View>

        {/* Cargo & Window Pill */}
        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillText}>Demand: {activeStop.demandKg} kg</Text>
          </View>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillText}>Window: {activeStop.windowStart} - {activeStop.windowEnd}</Text>
          </View>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillText}>Cold-Chain: 4.2°C</Text>
          </View>
        </View>

        {/* Delay Feedback if reported */}
        {delayReported && (
          <View style={styles.delayConfirmedBanner}>
            <Text style={styles.delayConfirmedText}>✓ Congestion report submitted to arQ central dispatch.</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={[styles.primaryCta, arrived && styles.primaryCtaDone]}
            onPress={handleMarkArrived}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryCtaText}>
              {arrived ? '✓ Arrival Confirmed at Dock' : 'Arrived at Stop'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryCta}
            onPress={() => setDelayReported(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryCtaText}>Report Delay</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1713',
  },
  topHud: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  hudSub: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: '#A8DBC9',
    fontWeight: '700',
  },
  hudLocation: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  maneuverCard: {
    margin: 14,
    backgroundColor: '#17231F',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(168, 219, 201, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  turnIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#205A46',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  turnIconText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  maneuverTextWrap: {
    flex: 1,
  },
  maneuverDistance: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#A8DBC9',
    fontWeight: '700',
  },
  maneuverInstruction: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  speedWrap: {
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    paddingLeft: 12,
  },
  speedNum: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  speedUnit: {
    fontSize: 8,
    fontFamily: 'monospace',
    color: '#77736D',
  },
  mapCanvas: {
    flex: 1,
    backgroundColor: '#121C17',
    position: 'relative',
    overflow: 'hidden',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routePolylineBacking: {
    position: 'absolute',
    width: 220,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transform: [{ rotate: '-35deg' }],
    borderRadius: 3,
  },
  routePolylineCore: {
    position: 'absolute',
    width: 220,
    height: 4,
    backgroundColor: '#205A46',
    transform: [{ rotate: '-35deg' }],
    borderRadius: 2,
  },
  headingChevron: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#A8DBC9',
    alignItems: 'center',
    justifyContent: 'center',
    left: '42%',
    top: '48%',
  },
  chevronIcon: {
    color: '#17231F',
    fontSize: 12,
    fontWeight: '900',
  },
  destPin: {
    position: 'absolute',
    left: '68%',
    top: '28%',
    alignItems: 'center',
  },
  destPinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#C6534C',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  destPinCallout: {
    backgroundColor: '#17231F',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  destPinText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  trafficAlertTag: {
    position: 'absolute',
    top: 14,
    backgroundColor: 'rgba(215, 138, 69, 0.2)',
    borderWidth: 1,
    borderColor: '#D78A45',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  trafficAlertText: {
    color: '#FDF4EB',
    fontSize: 10,
    fontWeight: '700',
  },
  bottomSheet: {
    backgroundColor: '#17231F',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  destinationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  destinationStopIdx: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: '#A8DBC9',
    fontWeight: '700',
  },
  destinationName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  destinationAddress: {
    fontSize: 11,
    color: '#929E99',
    marginTop: 1,
  },
  etaBadge: {
    backgroundColor: 'rgba(32, 90, 70, 0.3)',
    borderWidth: 1,
    borderColor: '#205A46',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  etaText: {
    color: '#A8DBC9',
    fontSize: 12,
    fontWeight: '800',
  },
  etaSub: {
    color: '#929E99',
    fontSize: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  metaPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaPillText: {
    color: '#D9E6DC',
    fontSize: 10,
    fontWeight: '600',
  },
  delayConfirmedBanner: {
    marginTop: 10,
    backgroundColor: 'rgba(32, 90, 70, 0.3)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#205A46',
  },
  delayConfirmedText: {
    color: '#A8DBC9',
    fontSize: 10,
    fontWeight: '600',
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  primaryCta: {
    flex: 2,
    backgroundColor: '#205A46',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaDone: {
    backgroundColor: '#1E4B3B',
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryCta: {
    flex: 1,
    backgroundColor: 'rgba(215, 138, 69, 0.2)',
    borderWidth: 1,
    borderColor: '#D78A45',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCtaText: {
    color: '#FDF4EB',
    fontSize: 12,
    fontWeight: '700',
  },
});
