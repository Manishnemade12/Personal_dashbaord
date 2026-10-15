import React from 'react';
import { Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MODES = ['month', 'week', 'day', 'agenda'];

export default function CalendarViewControls({ mode, onModeChange, search, onSearchChange }) {
  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {MODES.map((item) => (
          <TouchableOpacity key={item} accessibilityRole="tab" accessibilityState={{ selected: mode === item }}
            style={[styles.tab, mode === item && styles.activeTab]} onPress={() => onModeChange(item)}>
            <Text style={[styles.tabText, mode === item && styles.activeTabText]}>{item[0].toUpperCase() + item.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.search}>
        <Ionicons name="search-outline" size={17} color="#94a3b8" />
        <TextInput style={styles.input} placeholder="Search events" placeholderTextColor="#94a3b8" value={search} onChangeText={onSearchChange} returnKeyType="search" />
        {!!search && <TouchableOpacity accessibilityLabel="Clear search" onPress={() => onSearchChange('')}><Ionicons name="close-circle" size={18} color="#94a3b8" /></TouchableOpacity>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 14, paddingVertical: 10, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#edf0f5' },
  tabs: { flexDirection: 'row', padding: 3, borderRadius: 12, backgroundColor: '#f3f4f8' },
  tab: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 9 },
  activeTab: { backgroundColor: '#fff', elevation: 1, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  tabText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  activeTabText: { color: '#7136bd' },
  search: { height: 42, borderRadius: 12, borderWidth: 1, borderColor: '#e7eaf0', backgroundColor: '#fafbfc', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  input: { flex: 1, minWidth: 0, fontSize: 14, color: '#172033', paddingVertical: 0 },
});
