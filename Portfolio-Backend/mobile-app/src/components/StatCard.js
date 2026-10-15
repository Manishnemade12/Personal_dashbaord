import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii } from '../styles/theme';

export default function StatCard({ title, value, type = 'purple', style }) {
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const gradientColors = colors.gradients[type] || colors.gradients.purple;
  const shadowColor = colors.shadows[type] || colors.shadows.purple;

  return (
    <View style={[styles.cardWrapper, { shadowColor }, isCompact && styles.cardWrapperCompact, style]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.content}>
          <Text style={[styles.title, isCompact && styles.titleCompact]} numberOfLines={2}>
            {title}
          </Text>
        </View>
        <View style={styles.bottomPill}>
          <Text style={[styles.value, isCompact && styles.valueCompact]} numberOfLines={1} adjustsFontSizeToFit>
            {value}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    flex: 1,
    minWidth: 140,
    maxWidth: '100%',
    height: 140,
    borderRadius: radii.xl,
    marginBottom: 12,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  cardWrapperCompact: {
    height: 125,
    minWidth: 120,
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: radii.xl,
    overflow: 'hidden',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  titleCompact: {
    fontSize: 12,
  },
  bottomPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    width: '84%',
    paddingVertical: 7,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  valueCompact: {
    fontSize: 18,
  },
});
