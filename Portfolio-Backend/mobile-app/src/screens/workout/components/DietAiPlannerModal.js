import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../api/client';
import styles from '../styles/workoutStyles';

export default function DietAiPlannerModal({
  visible,
  onClose,
  dietItems = [],
  dateStr,
  onAccepted,
}) {
  const [prompt, setPrompt] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const createReview = async () => {
    setLoading(true);
    try {
      const response = await api.reviewAiDietPlan({
        dateStr,
        prompt,
        dietItemIds: dietItems.map((item) => item._id),
      });
      setRecommendations(
        (response.recommendations || []).map((item) => ({
          ...item,
          selected: item.defaultSelected !== false,
        }))
      );
    } catch (error) {
      Alert.alert('AI Diet Planner', error.message || 'Could not prepare the diet plan review.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) createReview();
  }, [visible, dateStr]);

  const toggleRecommendation = (id) => {
    setRecommendations((current) =>
      current.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const acceptPlan = async () => {
    const selected = recommendations.filter((item) => item.selected);
    if (!selected.length) {
      Alert.alert('Select Meals', 'Select at least one suitable meal before accepting the plan.');
      return;
    }
    setAccepting(true);
    try {
      for (const item of selected) {
        await api.scheduleDietMeal({
          title: item.name,
          dateStr: item.dateStr,
          timeStr: item.timeStr,
          description: item.description,
          calories: item.calories,
          protein: item.protein,
        });
      }
      Alert.alert('Diet Plan Scheduled', `${selected.length} accepted meal${selected.length === 1 ? '' : 's'} added to your Diet Plan.`);
      onAccepted();
      onClose();
    } catch (error) {
      Alert.alert('Schedule Failed', error.message || 'Some meals could not be scheduled.');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '90%' }]}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>AI Diet Planner</Text>
              <Text style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>
                Review first. Nothing is scheduled until you accept.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.formLabel}>Tell AI your preferences</Text>
            <TextInput
              style={[styles.formInput, { minHeight: 65, textAlignVertical: 'top' }]}
              multiline
              value={prompt}
              onChangeText={setPrompt}
              placeholder="Example: vegetarian, no dairy, light dinner, workout at 6 PM"
              placeholderTextColor="#94a3b8"
            />
            <TouchableOpacity
              style={[styles.saveBtn, { marginBottom: 10 }]}
              onPress={createReview}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Discuss / Refresh Suggestions</Text>}
            </TouchableOpacity>

            {recommendations.map((item) => {
              const isAvoid = item.recommendation === 'avoid';
              return (
                <View
                  key={String(item.id)}
                  style={{
                    padding: 10,
                    marginBottom: 8,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: isAvoid ? '#fecaca' : item.selected ? '#86efac' : '#cbd5e1',
                    backgroundColor: isAvoid ? '#fff7f7' : item.selected ? '#f0fdf4' : '#f8fafc',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => toggleRecommendation(item.id)} style={{ marginRight: 8 }}>
                      <Ionicons
                        name={item.selected ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={item.selected ? '#059669' : '#94a3b8'}
                      />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#0f172a', fontWeight: '800', fontSize: 13 }}>{item.name}</Text>
                      <Text style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>
                        {item.category} • {item.timeStr} • {item.calories} kcal • {item.protein}g protein
                      </Text>
                    </View>
                    <Text style={{ color: isAvoid ? '#b91c1c' : '#047857', fontSize: 10, fontWeight: '800' }}>
                      {isAvoid ? 'REVIEW' : 'FIT'}
                    </Text>
                  </View>
                  <Text style={{ color: isAvoid ? '#991b1b' : '#166534', fontSize: 10, marginTop: 7 }}>
                    {item.reason}
                  </Text>
                  {isAvoid && (
                    <TouchableOpacity onPress={() => toggleRecommendation(item.id)} style={{ alignSelf: 'flex-start', marginTop: 6 }}>
                      <Text style={{ color: '#7e22ce', fontSize: 10, fontWeight: '800' }}>Schedule anyway</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={accepting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={acceptPlan} disabled={accepting || loading}>
              {accepting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Accept & Schedule</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
