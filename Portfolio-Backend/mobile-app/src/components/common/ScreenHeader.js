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

  if (isMobile) {
    return (
      <View style={styles.headerContainerMobile}>
        {(onBack || rightAction) && (
          <View style={styles.topBarMobile}>
            {onBack ? (
              <TouchableOpacity
                style={styles.backButton}
                onPress={onBack}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="arrow-back" size={14} color={colors.textSecondary} />
                <Text style={styles.backButtonTextMobile}>{backText}</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            {rightAction ? (
              <View style={styles.rightActionMobileWrap}>
                {rightAction}
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.titleWrap}>
          {category ? <Text style={styles.categoryTextMobile}>{category}</Text> : null}
          <View style={styles.titleRow}>
            {iconName ? (
              <View style={styles.iconBadgeMobile}>
                <Ionicons name={iconName} size={14} color={colors.primary} />
              </View>
            ) : null}
            <Text style={styles.titleTextMobile} numberOfLines={1}>
              {title}
            </Text>
          </View>
          {subtitle ? (
            <Text style={styles.subtitleTextMobile} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.headerContainer}>
      <View style={styles.leftCol}>
        {onBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
            <Text style={styles.backButtonText}>{backText}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.titleWrap}>
          {category ? <Text style={styles.categoryText}>{category}</Text> : null}
          <View style={styles.titleRow}>
            {iconName ? (
              <View style={styles.iconBadge}>
                <Ionicons name={iconName} size={18} color={colors.primary} />
              </View>
            ) : null}
            <Text style={styles.titleText} numberOfLines={1}>
              {title}
            </Text>
          </View>
          {subtitle ? (
            <Text style={styles.subtitleText} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {rightAction && (
        <View style={styles.rightCol}>
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
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm + 6,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: 8,
  },
  topBarMobile: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 4,
  },
  rightActionMobileWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  leftCol: {
    flex: 1,
    minWidth: 0,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
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
