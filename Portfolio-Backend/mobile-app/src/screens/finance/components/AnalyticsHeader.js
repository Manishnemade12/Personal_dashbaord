import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/investmentAnalyticsStyles';

export default function AnalyticsHeader({ isMobile, holdingsCount, onNavigateBack, onRefresh }) {
  if (isMobile) {
    return (
      <View style={[styles.headerToolbar, { paddingHorizontal: 10, paddingVertical: 6, gap: 4, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }]}>
        {/* Top Control Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <TouchableOpacity
            style={[styles.backBtn, { paddingHorizontal: 8, paddingVertical: 4, minHeight: 26, borderRadius: 6 }]}
            onPress={onNavigateBack}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={13} color="#0f172a" />
            <Text style={[styles.backBtnText, { fontSize: 10.5, fontWeight: '600' }]}>Back</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={[styles.liveHoldingsBadge, { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 }]}>
              <View style={styles.liveGreenDot} />
              <Text style={[styles.liveHoldingsText, { fontSize: 10 }]}>
                {holdingsCount} Positions
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.refreshBtn, { paddingHorizontal: 8, paddingVertical: 4, minHeight: 26, borderRadius: 6 }]}
              onPress={onRefresh}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={12} color="#3b82f6" />
              <Text style={[styles.refreshBtnText, { fontSize: 10.5, fontWeight: '600' }]}>Sync</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Studio Title Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}>
          <View style={[styles.titleBadge, { width: 24, height: 24, borderRadius: 6 }]}>
            <Ionicons name="analytics" size={13} color="#3b82f6" />
          </View>
          <View>
            <Text style={[styles.screenTitle, { fontSize: 14, letterSpacing: -0.2 }]}>Visualisation Studio</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.headerToolbar}>
      <View style={styles.headerLeft}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onNavigateBack}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={17} color="#0f172a" />
          <Text style={styles.backBtnText}>Back to Portfolio</Text>
        </TouchableOpacity>

        <View style={styles.titleDivider} />

        <View style={styles.titleGroup}>
          <View style={styles.titleBadge}>
            <Ionicons name="analytics" size={18} color="#3b82f6" />
          </View>
          <View>
            <Text style={styles.screenTitle}>Visualisation Studio</Text>
            <Text style={styles.screenSubtitle}>
              Sector distribution, market cap spread & risk profiling
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.headerRight}>
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
