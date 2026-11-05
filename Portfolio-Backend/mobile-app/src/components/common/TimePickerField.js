import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const parseTime = (value) => {
  const [hour, minute] = String(value || '09:00').split(':').map(Number);
  return {
    hour: Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : 9,
    minute: Number.isFinite(minute) ? Math.min(59, Math.max(0, minute)) : 0,
  };
};

export default function TimePickerField({ value, onChange, label = 'Time' }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => parseTime(value));
  const current = parseTime(value);

  const openPicker = () => {
    setDraft(current);
    setOpen(true);
  };

  const apply = () => {
    onChange(`${String(draft.hour).padStart(2, '0')}:${String(draft.minute).padStart(2, '0')}`);
    setOpen(false);
  };

  const displayHour = current.hour % 12 || 12;
  const displayPeriod = current.hour >= 12 ? 'PM' : 'AM';

  return (
    <>
      <TouchableOpacity
        onPress={openPicker}
        style={{
          minHeight: 44,
          borderWidth: 1,
          borderColor: '#cbd5e1',
          borderRadius: 9,
          backgroundColor: '#fff',
          paddingHorizontal: 11,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        accessibilityRole="button"
        accessibilityLabel={`Select ${label}`}
      >
        <View>
          <Text style={{ color: '#64748b', fontSize: 9, fontWeight: '700' }}>{label}</Text>
          <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800', marginTop: 2 }}>
            {String(displayHour).padStart(2, '0')}:{String(current.minute).padStart(2, '0')} {displayPeriod}
          </Text>
        </View>
        <Ionicons name="time-outline" size={18} color="#7e37d8" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.48)', justifyContent: 'center', padding: 22 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, maxWidth: 360, width: '100%', alignSelf: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>Select {label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}><Ionicons name="close" size={21} color="#64748b" /></TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, height: 190 }}>
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {Array.from({ length: 24 }, (_, hour) => (
                  <TouchableOpacity
                    key={hour}
                    onPress={() => setDraft((currentDraft) => ({ ...currentDraft, hour }))}
                    style={{ paddingVertical: 9, borderRadius: 8, backgroundColor: draft.hour === hour ? '#ede9fe' : '#f8fafc', marginBottom: 4, alignItems: 'center' }}
                  >
                    <Text style={{ color: draft.hour === hour ? '#6d28d9' : '#334155', fontWeight: '700' }}>{String(hour % 12 || 12).padStart(2, '0')}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {Array.from({ length: 60 }, (_, minute) => (
                  <TouchableOpacity
                    key={minute}
                    onPress={() => setDraft((currentDraft) => ({ ...currentDraft, minute }))}
                    style={{ paddingVertical: 9, borderRadius: 8, backgroundColor: draft.minute === minute ? '#ede9fe' : '#f8fafc', marginBottom: 4, alignItems: 'center' }}
                  >
                    <Text style={{ color: draft.minute === minute ? '#6d28d9' : '#334155', fontWeight: '700' }}>{String(minute).padStart(2, '0')}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={{ width: 58, justifyContent: 'center', gap: 7 }}>
                {[['AM', false], ['PM', true]].map(([period, isPm]) => (
                  <TouchableOpacity
                    key={period}
                    onPress={() => setDraft((currentDraft) => ({ ...currentDraft, hour: isPm ? (currentDraft.hour % 12) + 12 : currentDraft.hour % 12 }))}
                    style={{ paddingVertical: 11, borderRadius: 8, backgroundColor: (draft.hour >= 12) === isPm ? '#7e37d8' : '#f1f5f9', alignItems: 'center' }}
                  >
                    <Text style={{ color: (draft.hour >= 12) === isPm ? '#fff' : '#475569', fontWeight: '800' }}>{period}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity onPress={apply} style={{ marginTop: 14, minHeight: 44, borderRadius: 9, backgroundColor: '#7e37d8', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>Use This Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
