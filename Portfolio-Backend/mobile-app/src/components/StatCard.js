import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/theme';

export default function StatCard({ title, value, type = 'purple' }) {
  const gradientColors = colors.gradients[type] || colors.gradients.purple;
  const shadowColor = colors.shadows[type] || colors.shadows.purple;

  return (
    <View style={[styles.cardWrapper, { shadowColor }]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.bottomPill}>
          <Text style={styles.value}>{value}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    width: '48%',
    height: 155,
    borderRadius: 28,
    marginBottom: 14,
    elevation: 8,
    shadowOffset: { width: 2, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bottomPill: {
    backgroundColor: 'rgba(93, 102, 189, 0.65)',
    width: '78%',
    paddingVertical: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
});
