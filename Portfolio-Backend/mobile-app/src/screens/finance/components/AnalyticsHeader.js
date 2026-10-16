import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/investmentAnalyticsStyles';

export default function AnalyticsHeader({ isMobile, holdingsCount, onNavigateBack, onRefresh }) {
  if (isMobile) {
    return (
      <View style={[styles.headerToolbar, { paddingHorizontal: 12, paddingVertical: 8, gap: 6, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }]}>
        {/* Top Control Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <TouchableOpacity
            style={[styles.backBtn, { paddingHorizontal: 10, paddingVertical: 6 }]}
            onPress={onNavigateBack}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={15} color="#0f172a" />
            <Text style={[styles.backBtnText, { fontSize: 12 }]}>Back</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[styles.liveHoldingsBadge, { paddingHorizontal: 8, paddingVertical: 5 }]}>
              <View style={styles.liveGreenDot} />
              <Text style={[styles.liveHoldingsText, { fontSize: 11 }]}>
                {holdingsCount} Positions
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.refreshBtn, { paddingHorizontal: 9, paddingVertical: 5 }]}
              onPress={onRefresh}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={14} color="#3b82f6" />
              <Text style={[styles.refreshBtnText, { fontSize: 11 }]}>Sync</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Studio Title Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <View style={[styles.titleBadge, { width: 28, height: 28, borderRadius: 7 }]}>
            <Ionicons name="analytics" size={15} color="#3b82f6" />
          </View>
          <View>
            <Text style={[styles.screenTitle, { fontSize: 16, letterSpacing: -0.2 }]}>Visualisation Studio</Text>
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
