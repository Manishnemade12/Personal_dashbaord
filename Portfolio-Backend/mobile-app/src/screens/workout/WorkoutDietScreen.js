import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TodaysDietPlanTab from './components/TodaysDietPlanTab';
import DietLibraryTab from './components/DietLibraryTab';
import DietItemModal from './components/DietItemModal';
import ScheduleMealModal from './components/ScheduleMealModal';
import styles from './styles/workoutStyles';
import api from '../../api/client';

const getTodayDateStr = () => new Date().toISOString().slice(0, 10);

export default function WorkoutDietScreen({ onNavigate, routeParams }) {
  // Active Tab: 'plan' (Today's Diet Plan) or 'library' (Diet Library & Recipes)
  const [activeTab, setActiveTab] = useState(routeParams?.tab || 'plan');

  useEffect(() => {
    if (routeParams?.tab) {
      setActiveTab(routeParams.tab);
    }
  }, [routeParams?.tab]);

  // Selected date for Today's Diet Plan (YYYY-MM-DD)
  const [selectedDateStr, setSelectedDateStr] = useState(getTodayDateStr());

  // Data states
  const [dailyPlan, setDailyPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

  const [dietItems, setDietItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);

  // Modals state
  const [dietModalVisible, setDietModalVisible] = useState(false);
  const [editingDietItem, setEditingDietItem] = useState(null);

  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [prefillDietItem, setPrefillDietItem] = useState(null);

  useEffect(() => {
    initScreen();
  }, []);

  useEffect(() => {
    loadDailyPlan(selectedDateStr);
  }, [selectedDateStr]);

  const initScreen = async () => {
    try {
      await api.ensureDietCalendar();
    } catch (e) {}
    loadDietItems();
    loadDailyPlan(selectedDateStr);
  };

  const loadDailyPlan = async (dateStr) => {
    setLoadingPlan(true);
    try {
      const res = await api.getDailyDietPlan(dateStr);
      setDailyPlan(res);
    } catch (err) {
      console.warn('Error loading daily diet plan:', err.message);
    } finally {
      setLoadingPlan(false);
    }
  };

  const loadDietItems = async () => {
    setLoadingItems(true);
    try {
      const items = await api.getDietItems();
      setDietItems(Array.isArray(items) ? items : []);
    } catch (err) {
      console.warn('Error loading diet items:', err.message);
    } finally {
      setLoadingItems(false);
    }
  };

  // Date Navigation handlers
  const handlePrevDay = () => {
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 1);
    setSelectedDateStr(date.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 1);
    setSelectedDateStr(date.toISOString().slice(0, 10));
  };

  const handleToday = () => {
    setSelectedDateStr(getTodayDateStr());
  };

  // Toggle meal status (Checklist)
  const handleToggleMealStatus = async (eventId) => {
    try {
      const res = await api.toggleMealStatus(eventId);
      if (res && res.success) {
        // Optimistically update local state for instant responsiveness
        setDailyPlan((prev) => {
          if (!prev) return prev;
          const updatedMeals = (prev.meals || []).map((m) =>
            m._id === eventId
              ? { ...m, isCompleted: res.isCompleted, status: res.status }
              : m
          );
          const completedCount = updatedMeals.filter((m) => m.isCompleted).length;
          const totalCount = updatedMeals.length;
          const accPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

          return {
            ...prev,
            stats: {
              ...prev.stats,
              completedMeals: completedCount,
              pendingMeals: totalCount - completedCount,
              accuracyPercentage: accPct,
            },
            meals: updatedMeals,
          };
        });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to update meal status.');
      loadDailyPlan(selectedDateStr);
    }
  };

  // Delete Meal from schedule
  const handleDeleteMeal = (eventId, title) => {
    Alert.alert(
      'Remove Meal',
      `Remove "${title}" from your diet schedule for this day?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.removeDietMeal(eventId);
              loadDailyPlan(selectedDateStr);
            } catch (err) {
              Alert.alert('Error', 'Failed to remove meal.');
            }
          },
        },
      ]
    );
  };

  // Delete Diet Item from Library
  const handleDeleteDietItem = (id, name) => {
    Alert.alert(
      'Delete Diet Recipe',
      `Delete "${name}" from your diet library?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteDietItem(id);
              loadDietItems();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete diet item.');
            }
          },
        },
      ]
    );
  };

  const isToday = selectedDateStr === getTodayDateStr();

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => onNavigate('Calendar')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={18} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Workout & Diet</Text>
            <Text style={styles.headerSubtitle}>
              Meal timing checklist, accuracy & Grok macros
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => {
              loadDailyPlan(selectedDateStr);
              loadDietItems();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="reload" size={16} color="#7e37d8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Top Segmented Tab Switcher */}
      <View style={styles.tabSegmentWrapper}>
        <View style={styles.tabSegment}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'plan' && styles.tabBtnActive]}
            onPress={() => setActiveTab('plan')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="checkbox-outline"
              size={15}
              color={activeTab === 'plan' ? '#7e37d8' : '#64748b'}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'plan' && styles.tabBtnTextActive,
              ]}
            >
              Today's Diet Plan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'library' && styles.tabBtnActive]}
            onPress={() => setActiveTab('library')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="nutrition-outline"
              size={15}
              color={activeTab === 'library' ? '#7e37d8' : '#64748b'}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'library' && styles.tabBtnTextActive,
              ]}
            >
              Diet Library
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab 1: Today's Diet Plan */}
      {activeTab === 'plan' && (
        <TodaysDietPlanTab
          selectedDateStr={selectedDateStr}
          onPrevDay={handlePrevDay}
          onNextDay={handleNextDay}
          onToday={handleToday}
          isToday={isToday}
          dailyPlan={dailyPlan}
          loading={loadingPlan}
          onToggleStatus={handleToggleMealStatus}
          onDeleteMeal={handleDeleteMeal}
          onOpenScheduleModal={() => {
            setPrefillDietItem(null);
            setScheduleModalVisible(true);
          }}
        />
      )}

      {/* Tab 2: Diet Library */}
      {activeTab === 'library' && (
        <DietLibraryTab
          dietItems={dietItems}
          loading={loadingItems}
          onOpenAddModal={() => {
            setEditingDietItem(null);
            setDietModalVisible(true);
          }}
          onOpenEditModal={(item) => {
            setEditingDietItem(item);
            setDietModalVisible(true);
          }}
          onDeleteDietItem={handleDeleteDietItem}
          onScheduleItem={(item) => {
            setPrefillDietItem(item);
            setScheduleModalVisible(true);
          }}
        />
      )}

      {/* Modal 1: Create / Edit Diet Item */}
      <DietItemModal
        visible={dietModalVisible}
        onClose={() => setDietModalVisible(false)}
        editingItem={editingDietItem}
        onSaveSuccess={() => {
          loadDietItems();
        }}
      />

      {/* Modal 2: Schedule Meal to Diet Calendar */}
      <ScheduleMealModal
        visible={scheduleModalVisible}
        onClose={() => setScheduleModalVisible(false)}
        dietItems={dietItems}
        prefillItem={prefillDietItem}
        defaultDateStr={selectedDateStr}
        onScheduleSuccess={() => {
          loadDailyPlan(selectedDateStr);
          setActiveTab('plan'); // Switch to plan view to see scheduled meal
        }}
      />
    </View>
  );
}
