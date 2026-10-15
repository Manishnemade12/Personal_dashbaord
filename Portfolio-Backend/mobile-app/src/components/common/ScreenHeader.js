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
            <Text style={[styles.titleText, isMobile && styles.titleTextMobile]} numberOfLines={1}>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.xs,
  },
  leftCol: {
    flex: 1,
    minWidth: 200,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  titleWrap: {
    justifyContent: 'center',
  },
  categoryText: {
    ...typography.subtitle,
    color: colors.primary,
    marginBottom: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  titleTextMobile: {
    fontSize: 17,
  },
  subtitleText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rightColMobile: {
    width: '100%',
    justifyContent: 'flex-start',
    marginTop: spacing.xs,
  },
});
