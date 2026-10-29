import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { TodayScreen } from './src/screens/TodayScreen';
import { LiveRouteScreen } from './src/screens/LiveRouteScreen';
import { LoadsScreen } from './src/screens/LoadsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { DRIVER_STOPS, DriverStop } from './src/data/mockDriverData';

type Tab = 'today' | 'live' | 'loads' | 'profile';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [currentNavStop, setCurrentNavStop] = useState<DriverStop>(DRIVER_STOPS[1]);

  const handleNavigateToLiveRoute = (stop: DriverStop) => {
    setCurrentNavStop(stop);
    setActiveTab('live');
  };

  const isDarkTab = activeTab === 'live';

  return (
    <View style={[styles.root, isDarkTab ? styles.rootDark : styles.rootLight]}>
      <StatusBar style={isDarkTab ? 'light' : 'dark'} />

      {/* Screen Area */}
      <View style={styles.screenContainer}>
        {activeTab === 'today' && (
          <TodayScreen onNavigateToLiveRoute={handleNavigateToLiveRoute} />
        )}
        {activeTab === 'live' && (
          <LiveRouteScreen
            activeStop={currentNavStop}
            onStopCompleted={() => setActiveTab('today')}
          />
        )}
        {activeTab === 'loads' && <LoadsScreen />}
        {activeTab === 'profile' && <ProfileScreen />}
      </View>

      {/* Custom Bottom Tab Bar */}
      <View style={[styles.tabBar, isDarkTab ? styles.tabBarDark : styles.tabBarLight]}>
        {[
          { id: 'today', label: 'Today', icon: '📅' },
          { id: 'live', label: 'Live route', icon: '🧭' },
          { id: 'loads', label: 'Loads', icon: '📦' },
          { id: 'profile', label: 'Profile', icon: '👤' },
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
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
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
  tabBar: {
    flexDirection: 'row',
    height: 64,
    paddingHorizontal: 8,
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
    backgroundColor: 'rgba(32, 90, 70, 0.35)',
  },
  tabIcon: {
    fontSize: 16,
    marginBottom: 2,
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
