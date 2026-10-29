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
import { DOCK_CHECKLIST, DockChecklistItem, DRIVER_PROFILE } from '../data/mockDriverData';

export const LoadsScreen: React.FC = () => {
  const [checklist, setChecklist] = useState<DockChecklistItem[]>(DOCK_CHECKLIST);

  const toggleCheck = (id: string) => {
    setChecklist(prev =>
      prev.map(item => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const checkedCount = checklist.filter(c => c.checked).length;
  const isAllChecked = checkedCount === checklist.length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>03 · LOAD MANIFEST & DOCK AUDIT</Text>
            <Text style={styles.title}>Cargo & Dock Checklist</Text>
          </View>
          <DataBadge label="Preview" tone="preview" />
        </View>

        {/* Cargo Capacity Overview Card (Warehouse Ref 4) */}
        <View style={styles.capacityCard}>
          <View style={styles.capacityHeader}>
            <View>
              <Text style={styles.capacityLabel}>ACTIVE VAN PAYLOAD</Text>
              <Text style={styles.capacityValue}>
                {DRIVER_PROFILE.currentPayloadKg} / {DRIVER_PROFILE.maxPayloadKg} kg
              </Text>
            </View>
            <View style={styles.badgeCapacity}>
              <Text style={styles.badgeCapacityText}>
                {Math.round((DRIVER_PROFILE.currentPayloadKg / DRIVER_PROFILE.maxPayloadKg) * 100)}% Utilized
              </Text>
            </View>
          </View>

          {/* Segmented Cargo Type Bar */}
          <View style={styles.segmentContainer}>
            <View style={[styles.segmentBar, { flex: 4, backgroundColor: '#205A46' }]} />
            <View style={[styles.segmentBar, { flex: 3, backgroundColor: '#2F5BEA' }]} />
            <View style={[styles.segmentBar, { flex: 2, backgroundColor: '#D78A45' }]} />
          </View>
          <View style={styles.segmentLegend}>
            <Text style={styles.legendText}>Pharma (180kg)</Text>
            <Text style={styles.legendText}>· Perishables (140kg)</Text>
            <Text style={styles.legendText}>· Electronics (100kg)</Text>
          </View>
        </View>

        {/* Dock Checklist Section */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Dock Departure Checklist</Text>
            <Text style={styles.sectionSub}>Verify all 5 inspection points before hub departure</Text>
          </View>
          <Text style={[styles.checkCounter, isAllChecked && styles.checkCounterDone]}>
            {checkedCount}/{checklist.length} Passed
          </Text>
        </View>

        <View style={styles.checklistWrap}>
          {checklist.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[styles.checkItem, item.checked && styles.checkItemChecked]}
              onPress={() => toggleCheck(item.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
                {item.checked && <Text style={styles.checkTick}>✓</Text>}
              </View>

              <View style={styles.itemTextWrap}>
                <Text style={[styles.itemTitle, item.checked && styles.itemTitleChecked]}>
                  {item.title}
                </Text>
                <Text style={styles.itemDescription}>{item.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Departure Sign-off CTA */}
        <TouchableOpacity
          style={[styles.signoffBtn, !isAllChecked && styles.signoffBtnDisabled]}
          disabled={!isAllChecked}
          activeOpacity={0.8}
        >
          <Text style={styles.signoffBtnText}>
            {isAllChecked ? '✓ Ready for Dock Gate Clearance' : 'Complete All Inspection Checks'}
          </Text>
        </TouchableOpacity>
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
  capacityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(21, 33, 29, 0.08)',
    marginBottom: 20,
  },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  capacityLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#77736D',
    fontFamily: 'monospace',
  },
  capacityValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#15211D',
    marginTop: 2,
  },
  badgeCapacity: {
    backgroundColor: '#E2F4EE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeCapacityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#205A46',
  },
  segmentContainer: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 14,
    gap: 3,
  },
  segmentBar: {
    height: '100%',
    borderRadius: 2,
  },
  segmentLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#55534F',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  checkCounter: {
    fontSize: 11,
    fontWeight: '700',
    color: '#77736D',
  },
  checkCounterDone: {
    color: '#205A46',
  },
  checklistWrap: {
    gap: 10,
  },
  checkItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(21, 33, 29, 0.08)',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkItemChecked: {
    backgroundColor: '#FAFBF9',
    borderColor: '#A8DBC9',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#929E99',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#205A46',
    borderColor: '#205A46',
  },
  checkTick: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  itemTextWrap: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15211D',
  },
  itemTitleChecked: {
    color: '#205A46',
  },
  itemDescription: {
    fontSize: 11,
    color: '#77736D',
    marginTop: 2,
    lineHeight: 15,
  },
  signoffBtn: {
    marginTop: 20,
    backgroundColor: '#17231F',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signoffBtnDisabled: {
    backgroundColor: '#A8B3AE',
  },
  signoffBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
