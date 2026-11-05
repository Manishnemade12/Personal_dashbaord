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
import { getCategoryTimeMinutes, getTimeMinutes } from '../utils/dietSorting';

export default function DietAiPlannerModal({
  visible,
  onClose,
  dietItems = [],
  dateStr,
  onAccepted,
}) {
  const [inputText, setInputText] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [planId, setPlanId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [showMeals, setShowMeals] = useState(false);
  const [showPlan, setShowPlan] = useState(true);
  const [selectedMealIds, setSelectedMealIds] = useState([]);

  const createReview = async () => {
    if (!inputText.trim()) {
      Alert.alert('Tell the AI what you need', 'Add a preference such as vegetarian, no dairy, or workout at 6 PM.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.reviewAiDietPlan({
        dateStr,
        prompt: inputText.trim(),
        dietItemIds: selectedMealIds,
      });
      setRecommendations(
        (response.recommendations || [])
          .sort((a, b) => getTimeMinutes(a.timeStr) - getTimeMinutes(b.timeStr) || String(a.name || '').localeCompare(String(b.name || '')))
          .map((item) => ({
          ...item,
          selected: item.defaultSelected !== false,
        }))
      );
      setPlanId(response.planId);
      setMessages(response.messages || [{
        role: 'assistant',
        text: 'I prepared a draft from your saved Diet Library. Review it, ask questions, and accept only what you want to schedule.',
      }]);
    } catch (error) {
      Alert.alert('AI Diet Planner', error.message || 'Could not prepare the diet plan review.');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !planId) return;
    const text = inputText.trim();
    setInputText('');
    setChatLoading(true);
    try {
      const response = await api.chatAiDietPlan({ planId, message: text });
      setMessages(response.messages || []);
    } catch (error) {
      Alert.alert('AI Diet Planner', error.message || 'Could not discuss this draft plan.');
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setInputText('');
      setRecommendations([]);
      setPlanId(null);
      setMessages([]);
      setSelectedMealIds(dietItems.map((item) => item._id));
      setShowMeals(false);
      setShowPlan(true);
    }
  }, [visible, dateStr]);

  useEffect(() => {
    if (visible && !planId) setSelectedMealIds(dietItems.map((item) => item._id));
  }, [visible, dietItems, planId]);

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
      await api.acceptAiDietPlan({ planId });
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
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 7 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                <Ionicons name="sparkles" size={15} color="#059669" />
              </View>
              <Text style={{ color: '#0f172a', fontWeight: '800', fontSize: 14 }}>
                {planId ? 'Ask about this draft' : 'Tell AI your diet goal'}
              </Text>
            </View>
            <View style={{ maxHeight: 110, marginBottom: 7 }}>
              <ScrollView>
                {messages.map((message, index) => (
                  <View
                    key={`${index}-${message.role}`}
                    style={{
                      alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '90%',
                      paddingVertical: 6,
                      paddingHorizontal: 9,
                      marginBottom: 5,
                      borderRadius: 10,
                      backgroundColor: message.role === 'user' ? '#ede9fe' : '#f1f5f9',
                    }}
                  >
                    <Text style={{ color: '#334155', fontSize: 11, lineHeight: 16 }}>{message.text}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 9 }}>
              <TextInput
                style={[styles.formInput, { flex: 1, minHeight: 42, maxHeight: 70, paddingVertical: 10 }]}
                multiline={!planId}
                value={inputText}
                onChangeText={setInputText}
                placeholder={planId ? 'Ask: why was this meal flagged?' : 'Example: vegetarian, no dairy, dinner at 8 PM'}
                placeholderTextColor="#94a3b8"
              />
              <TouchableOpacity
                style={{ width: 42, height: 42, borderRadius: 10, marginLeft: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#059669' }}
                onPress={planId ? sendMessage : createReview}
                disabled={loading || chatLoading}
              >
                {loading || chatLoading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name={planId ? 'send' : 'sparkles'} size={17} color="#fff" />}
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', marginBottom: 5 }}
              onPress={() => setShowMeals((value) => !value)}
            >
              <Ionicons name={showMeals ? 'chevron-down' : 'chevron-forward'} size={14} color="#047857" />
              <Text style={{ color: '#065f46', fontWeight: '800', fontSize: 12, marginLeft: 5 }}>
                Meals <Text style={{ color: '#64748b', fontWeight: '600' }}>({planId ? recommendations.filter((item) => item.selected).length : selectedMealIds.length}/{dietItems.length})</Text>
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', marginBottom: 7 }}
              onPress={() => setShowPlan((value) => !value)}
            >
              <Ionicons name={showPlan ? 'chevron-down' : 'chevron-forward'} size={14} color="#2563eb" />
              <Text style={{ color: '#1e40af', fontWeight: '800', fontSize: 12, marginLeft: 5 }}>
                AI draft plan <Text style={{ color: '#64748b', fontWeight: '600' }}>({recommendations.length} meals)</Text>
              </Text>
            </TouchableOpacity>

            {showMeals && [...dietItems].sort((a, b) => {
              const aTime = recommendations.find((item) => String(item.id) === String(a._id))?.timeStr;
              const bTime = recommendations.find((item) => String(item.id) === String(b._id))?.timeStr;
              return (aTime ? getTimeMinutes(aTime) : getCategoryTimeMinutes(a.category)) -
                (bTime ? getTimeMinutes(bTime) : getCategoryTimeMinutes(b.category)) ||
                String(a.name || '').localeCompare(String(b.name || ''));
            }).map((meal) => {
              const recommendation = recommendations.find((item) => String(item.id) === String(meal._id));
              const isSelected = planId ? recommendation?.selected : selectedMealIds.some((id) => String(id) === String(meal._id));
              return (
                <TouchableOpacity
                  key={meal._id}
                  onPress={() => {
                    if (recommendation) toggleRecommendation(recommendation.id);
                    else setSelectedMealIds((current) => current.includes(meal._id)
                      ? current.filter((id) => id !== meal._id)
                      : [...current, meal._id]);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7 }}
                >
                  <Ionicons
                    name={isSelected ? 'checkbox' : 'square-outline'}
                    size={19}
                    color={isSelected ? '#059669' : '#94a3b8'}
                  />
                  <Text style={{ marginLeft: 7, color: '#334155', fontSize: 11, flex: 1 }}>
                    {meal.name} · {meal.category}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {showPlan && [...recommendations].sort((a, b) => getTimeMinutes(a.timeStr) - getTimeMinutes(b.timeStr) || String(a.name || '').localeCompare(String(b.name || ''))).map((item) => {
              const isAvoid = item.recommendation === 'avoid';
              return (
                <View
                  key={String(item.id)}
                  style={{
                    padding: 8,
                    marginBottom: 6,
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
                      <Text style={{ color: '#0f172a', fontWeight: '800', fontSize: 12 }}>{item.name}</Text>
                      <Text style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>
                        {item.category} • {item.timeStr} • {item.calories} kcal • {item.protein}g protein
                      </Text>
                    </View>
                    <Text style={{ color: isAvoid ? '#b91c1c' : '#047857', fontSize: 10, fontWeight: '800' }}>
                      {isAvoid ? 'REVIEW' : 'FIT'}
                    </Text>
                  </View>
                  <Text style={{ color: isAvoid ? '#991b1b' : '#166534', fontSize: 10, marginTop: 5, lineHeight: 14 }}>
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
