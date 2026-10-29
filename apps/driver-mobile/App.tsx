import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { TodayScreen } from './src/screens/TodayScreen';
import { LiveRouteScreen } from './src/screens/LiveRouteScreen';
import { LoadsScreen } from './src/screens/LoadsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import {
  DRIVER_STOPS,
  DOCK_CHECKLIST,
  DriverStop,
  DockChecklistItem
} from './src/data/mockDriverData';

type Tab = 'today' | 'live' | 'loads' | 'profile';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [stops, setStops] = useState<DriverStop[]>(DRIVER_STOPS);
  const [currentNavStop, setCurrentNavStop] = useState<DriverStop>(DRIVER_STOPS[1]);
  const [selectedDate, setSelectedDate] = useState<string>('29 Oct');
  const [shiftActive, setShiftActive] = useState<boolean>(true);
  const [checklist, setChecklist] = useState<DockChecklistItem[]>(DOCK_CHECKLIST);

  const handleNavigateToLiveRoute = (stop: DriverStop) => {
    setCurrentNavStop(stop);
    setActiveTab('live');
  };

  const handleToggleComplete = (stop: DriverStop) => {
    const isNowDone = stop.status !== 'completed';
    setStops(prev =>
      prev.map(s =>
        s.id === stop.id
          ? { ...s, status: isNowDone ? 'completed' : 'pending' }
          : s
      )
    );
    if (currentNavStop.id === stop.id) {
      setCurrentNavStop(prev => ({
        ...prev,
        status: isNowDone ? 'completed' : 'pending'
      }));
    }
  };

  const handleLiveStopCompleted = (completedStop: DriverStop) => {
    setStops(prev => {
      const updated = prev.map(s =>
        s.id === completedStop.id ? { ...s, status: 'completed' as const } : s
      );
      // Auto-advance current navigation target to the next pending stop
      const nextPending = updated.find(s => s.status !== 'completed');
      if (nextPending) {
        setCurrentNavStop(nextPending);
      }
      return updated;
    });
    setActiveTab('today');
  };

  const handleReportDelay = (stopId: string, reason: string, minutes: number) => {
    setStops(prev =>
      prev.map(s =>
        s.id === stopId
          ? {
              ...s,
              corridorAdvisory: `Reported by Driver: +${minutes} min (${reason})`,
              pLate: `${Math.min(95, parseInt(s.pLate) + minutes * 2)}% (simulated)`,
              status: 'at_risk' as const
            }
          : s
      )
    );
    if (currentNavStop.id === stopId) {
      setCurrentNavStop(prev => ({
        ...prev,
        corridorAdvisory: `Reported by Driver: +${minutes} min (${reason})`,
        pLate: `${Math.min(95, parseInt(prev.pLate) + minutes * 2)}% (simulated)`,
        status: 'at_risk'
      }));
    }
  };

  const handleToggleCheck = (id: string) => {
    setChecklist(prev =>
      prev.map(item => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const isDarkTab = activeTab === 'live';

  return (
    <View style={[styles.root, isDarkTab ? styles.rootDark : styles.rootLight]}>
      <StatusBar style={isDarkTab ? 'light' : 'dark'} />

      {/* Screen Container with Persistent Tab Views */}
      <View style={styles.screenContainer}>
        <View style={[styles.tabContent, activeTab === 'today' ? styles.tabContentVisible : styles.tabContentHidden]}>
          <TodayScreen
            stops={stops}
            onToggleComplete={handleToggleComplete}
            onNavigateToLiveRoute={handleNavigateToLiveRoute}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            shiftActive={shiftActive}
            onToggleShift={() => setShiftActive(prev => !prev)}
          />
        </View>

        <View style={[styles.tabContent, activeTab === 'live' ? styles.tabContentVisible : styles.tabContentHidden]}>
          <LiveRouteScreen
            activeStop={currentNavStop}
            allStops={stops}
            onSelectStop={setCurrentNavStop}
            onStopCompleted={handleLiveStopCompleted}
            onReportDelay={handleReportDelay}
          />
        </View>

        <View style={[styles.tabContent, activeTab === 'loads' ? styles.tabContentVisible : styles.tabContentHidden]}>
          <LoadsScreen
            checklist={checklist}
            onToggleCheck={handleToggleCheck}
          />
        </View>

        <View style={[styles.tabContent, activeTab === 'profile' ? styles.tabContentVisible : styles.tabContentHidden]}>
          <ProfileScreen />
        </View>
      </View>

      {/* Custom Bottom Tab Bar (Vanta Ride Spacing & High-Contrast Glyphs) */}
      <View style={[styles.tabBar, isDarkTab ? styles.tabBarDark : styles.tabBarLight]}>
        {[
          { id: 'today', label: 'Today', glyph: '◫' },
          { id: 'live', label: 'Live route', glyph: '◎' },
          { id: 'loads', label: 'Loads', glyph: '▤' },
          { id: 'profile', label: 'Profile', glyph: '○' },
        ].map(tab => {
          const isSelected = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabItem,
                isSelected && (isDarkTab ? styles.tabItemActiveDark : styles.tabItemActiveLight),
              ]}
              onPress={() => setActiveTab(tab.id as Tab)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={tab.label}
            >
              <Text
                style={[
                  styles.tabGlyph,
                  isDarkTab ? styles.tabGlyphDark : styles.tabGlyphLight,
                  isSelected && (isDarkTab ? styles.tabGlyphActiveDark : styles.tabGlyphActiveLight),
                ]}
              >
                {tab.glyph}
              </Text>
              <Text
                style={[
                  styles.tabLabel,
                  isDarkTab ? styles.tabLabelDark : styles.tabLabelLight,
                  isSelected && (isDarkTab ? styles.tabLabelActiveDark : styles.tabLabelActiveLight),
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  rootLight: {
    backgroundColor: '#F6F8F5',
  },
  rootDark: {
    backgroundColor: '#0F1713',
  },
  screenContainer: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  tabContentVisible: {
    display: 'flex',
  },
  tabContentHidden: {
    display: 'none',
  },
  tabBar: {
    flexDirection: 'row',
    height: 64,
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabBarLight: {
    backgroundColor: '#FFFFFF',
    borderTopColor: 'rgba(21, 33, 29, 0.08)',
  },
  tabBarDark: {
    backgroundColor: '#17231F',
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 12,
  },
  tabItemActiveLight: {
    backgroundColor: '#E2F4EE',
  },
  tabItemActiveDark: {
    backgroundColor: 'rgba(32, 90, 70, 0.4)',
  },
  tabGlyph: {
    fontSize: 16,
    marginBottom: 2,
    fontWeight: '800',
  },
  tabGlyphLight: {
    color: '#77736D',
  },
  tabGlyphDark: {
    color: '#929E99',
  },
  tabGlyphActiveLight: {
    color: '#205A46',
  },
  tabGlyphActiveDark: {
    color: '#A8DBC9',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabLabelLight: {
    color: '#77736D',
  },
  tabLabelDark: {
    color: '#929E99',
  },
  tabLabelActiveLight: {
    color: '#205A46',
    fontWeight: '800',
  },
  tabLabelActiveDark: {
    color: '#A8DBC9',
    fontWeight: '800',
  },
});
