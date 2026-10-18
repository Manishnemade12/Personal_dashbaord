import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography } from '../../styles/theme';

export default function ScreenHeader({
  title,
  subtitle,
  category = 'ADMIN PANEL',
  iconName,
  onBack,
  backText = 'Dashboard',
  rightAction,
}) {
  const { width } = useWindowDimensions();
  const isMobile = width < 680;

  return (
    <View style={[styles.headerContainer, isMobile && styles.headerContainerMobile]}>
      <View style={styles.leftCol}>
        {onBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={isMobile ? 14 : 16} color={colors.textSecondary} />
            <Text style={[styles.backButtonText, isMobile && styles.backButtonTextMobile]}>{backText}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.titleWrap}>
          {category ? <Text style={[styles.categoryText, isMobile && styles.categoryTextMobile]}>{category}</Text> : null}
          <View style={styles.titleRow}>
            {iconName ? (
              <View style={[styles.iconBadge, isMobile && styles.iconBadgeMobile]}>
                <Ionicons name={iconName} size={isMobile ? 14 : 18} color={colors.primary} />
              </View>
            ) : null}
            <Text style={[styles.titleText, isMobile && styles.titleTextMobile]} numberOfLines={1}>
              {title}
            </Text>
          </View>
          {subtitle ? (
            <Text style={[styles.subtitleText, isMobile && styles.subtitleTextMobile]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {rightAction && (
        <View style={[styles.rightCol, isMobile && styles.rightColMobile]}>
          {rightAction}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  headerContainerMobile: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 8,
    gap: 4,
  },
  leftCol: {
    flex: 1,
    minWidth: 0,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  backButtonTextMobile: {
    fontSize: 11,
  },
  titleWrap: {
    justifyContent: 'center',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  categoryTextMobile: {
    fontSize: 9.5,
    marginBottom: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeMobile: {
    width: 24,
    height: 24,
    borderRadius: radii.xs,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  titleTextMobile: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitleText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  subtitleTextMobile: {
    fontSize: 10.5,
    lineHeight: 14,
    marginTop: 1,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rightColMobile: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
});
