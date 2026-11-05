import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { syncEngine } from '../../services/syncEngine';

export const SyncStatusBar = () => {
  const [syncState, setSyncState] = useState(syncEngine.getState());

  useEffect(() => {
    const unsubscribe = syncEngine.addListener((state) => {
      setSyncState(state);
    });
    return unsubscribe;
  }, []);

  const { isOnline, isSyncing, pendingCount } = syncState;

  // If online and nothing is syncing or pending, hide the bar to keep UI clean
  if (isOnline && !isSyncing && pendingCount === 0) {
    return null;
  }

  const handlePress = () => {
    if (isOnline && !isSyncing) {
      syncEngine.syncNow().catch(() => {});
    }
  };

  if (!isOnline) {
    return (
      <View style={[styles.container, styles.offlineContainer]}>
        <Ionicons name="cloud-offline-outline" size={14} color="#b45309" />
        <Text style={styles.offlineText}>
          Offline Mode {pendingCount > 0 ? `• ${pendingCount} change${pendingCount > 1 ? 's' : ''} saved locally` : '• Changes saved locally'}
        </Text>
      </View>
    );
  }

  if (isSyncing) {
    return (
      <View style={[styles.container, styles.syncingContainer]}>
        <ActivityIndicator size="small" color="#2563eb" style={{ transform: [{ scale: 0.7 }] }} />
        <Text style={styles.syncingText}>
          Syncing changes with cloud...
        </Text>
      </View>
    );
  }

  if (pendingCount > 0) {
    return (
      <TouchableOpacity style={[styles.container, styles.pendingContainer]} onPress={handlePress} activeOpacity={0.8}>
        <Ionicons name="cloud-upload-outline" size={14} color="#7e37d8" />
        <Text style={styles.pendingText}>
          {pendingCount} unsynced change{pendingCount > 1 ? 's' : ''} • Tap to sync now
        </Text>
      </TouchableOpacity>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    gap: 8,
    borderBottomWidth: 1,
  },
  offlineContainer: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b45309',
  },
  syncingContainer: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  syncingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  pendingContainer: {
    backgroundColor: '#f5f3ff',
    borderColor: '#ddd6fe',
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7e37d8',
  },
});

export default SyncStatusBar;

