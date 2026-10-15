import React from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors, spacing, radii, typography } from '../../styles/theme';

export default function FilterTabs({
  tabs = [],
  activeTab,
  onSelectTab,
  containerStyle,
}) {
  return (
    <View style={[styles.wrapper, containerStyle]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map((tab) => {
          const key = tab.key || tab;
          const label = tab.label || tab;
          const count = tab.count !== undefined ? tab.count : null;
          const isActive = activeTab === key;

          return (
            <TouchableOpacity
              key={key}
              style={[styles.tabPill, isActive && styles.tabPillActive]}
              onPress={() => onSelectTab(key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {label}
              </Text>
              {count !== null && (
                <View
                  style={[
                    styles.countBadge,
                    isActive && styles.countBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      isActive && styles.countTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: spacing.sm,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 2,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.textLight,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  countText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  countTextActive: {
    color: colors.textLight,
  },
});
