import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/investmentAnalyticsStyles';

export default function AnalyticsHeader({ isMobile, holdingsCount, onNavigateBack, onRefresh }) {
  return (
      <View style={[styles.headerToolbar, isMobile && { flexDirection: 'column', alignItems: 'flex-start', paddingHorizontal: 12, paddingVertical: 10, gap: 10 }]}>
        <View style={[styles.headerLeft, isMobile && { width: '100%', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onNavigateBack}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={17} color="#0f172a" />
            <Text style={styles.backBtnText}>Back to Portfolio</Text>
          </TouchableOpacity>

          {!isMobile && <View style={styles.titleDivider} />}

          <View style={styles.titleGroup}>
            <View style={styles.titleBadge}>
              <Ionicons name="analytics" size={18} color="#3b82f6" />
            </View>
            <View>
              <Text style={[styles.screenTitle, isMobile && { fontSize: 17 }]}>Visualisation Studio</Text>
              <Text style={styles.screenSubtitle}>
                Sector distribution, market cap spread & risk profiling
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.headerRight, isMobile && { width: '100%', justifyContent: 'space-between' }]}>
          <View style={styles.liveHoldingsBadge}>
            <View style={styles.liveGreenDot} />
            <Text style={styles.liveHoldingsText}>
              {holdingsCount} Positions (Classified)
            </Text>
          </View>

          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={onRefresh}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={15} color="#3b82f6" />
            <Text style={styles.refreshBtnText}>Sync</Text>
          </TouchableOpacity>
        </View>
      </View>

  );
}
