import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const SyncBadge = ({ status }) => {
  if (!status || status === 'SYNCED') return null;

  return (
    <View style={styles.container}>
      <Ionicons name="time-outline" size={11} color="#d97706" />
      <Text style={styles.text}>Saved locally</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
    color: '#b45309',
  },
});

export default SyncBadge;

