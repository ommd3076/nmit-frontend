import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DataBadgeProps {
  label: string;
  tone?: 'default' | 'success' | 'warning' | 'preview';
}

export const DataBadge: React.FC<DataBadgeProps> = ({ label, tone = 'preview' }) => {
  const getBadgeStyle = () => {
    switch (tone) {
      case 'success':
        return {
          bg: '#E2F4EE',
          border: '#A8DBC9',
          text: '#205A46'
        };
      case 'warning':
        return {
          bg: '#FDF4EB',
          border: '#FBD6B0',
          text: '#D78A45'
        };
      case 'preview':
      default:
        return {
          bg: '#F3F4F6',
          border: '#E5E7EB',
          text: '#4B5563'
        };
    }
  };

  const colors = getBadgeStyle();

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  }
});
