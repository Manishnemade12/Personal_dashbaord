import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TAB_OPTIONS } from '../constants/analyticsOptions';
import styles from '../styles/investmentAnalyticsStyles';

export default function AnalyticsTabBar({ selectedTab, onSelect }) {
  return (
      <View style={styles.tabBarWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
          {TAB_OPTIONS.map((tab) => {
            const isActive = selectedTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => {
                  onSelect(tab.key);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon}
                  size={13}
                  color={isActive ? '#ffffff' : '#64748b'}
                />
                <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

  );
}
