import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography, layout } from '../../styles/theme';

export default function SearchInput({
  value,
  onChangeText,
  placeholder = 'Search...',
  containerStyle,
}) {
  return (
    <View style={[styles.container, containerStyle]}>
      <Ionicons
        name="search-outline"
        size={18}
        color={colors.textMuted}
        style={styles.icon}
      />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value ? (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          style={styles.clearBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="close-circle" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 42,
    marginVertical: spacing.xs,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    paddingVertical: 0,
    height: '100%',
  },
  clearBtn: {
    padding: 4,
  },
});
