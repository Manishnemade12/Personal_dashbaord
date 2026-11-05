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
import IngredientBreakdownModal from './components/IngredientBreakdownModal';
import DietAiPlannerModal from './components/DietAiPlannerModal';
import styles from './styles/workoutStyles';
import api from '../../api/client';
import { DietDao } from '../../db/dao/DietDao';
import { sortDietLibraryItems, sortScheduledMeals } from './utils/dietSorting';

const getTodayDateStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
};

const formatLocalDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;

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

  const [breakdownModalVisible, setBreakdownModalVisible] = useState(false);
  const [breakdownDietItem, setBreakdownDietItem] = useState(null);
  const [aiPlannerVisible, setAiPlannerVisible] = useState(false);

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
      // 1. Read from local SQLite first
      const localMeals = await DietDao.getDailyMealLogs(dateStr);
      if (localMeals && localMeals.length > 0) {
        const completedCount = localMeals.filter((m) => m.status === 'eaten').length;
        const totalCount = localMeals.length;
        const accPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        const totalCal = localMeals.reduce((acc, m) => acc + (m.calories || 0), 0);

        setDailyPlan({
          date: dateStr,
          stats: {
            totalMeals: totalCount,
            completedMeals: completedCount,
            pendingMeals: totalCount - completedCount,
            accuracyPercentage: accPct,
            totalCalories: Math.round(totalCal),
          },
          meals: sortScheduledMeals(
            localMeals.map((m) => ({
              ...m,
              isCompleted: m.status === 'eaten',
              title: m.customTitle || m.mealType,
              time: m.scheduledTime,
            }))
          ),
        });
      }

      // 2. Fetch fresh updates from cloud backend if reachable
      try {
        const res = await api.getDailyDietPlan(dateStr);
        if (res?.meals && Array.isArray(res.meals)) {
          for (const m of res.meals) {
            await DietDao.saveMealLog(
              {
                date: dateStr,
                mealType: m.mealType || m.category || 'Lunch',
                customTitle: m.title || m.name,
                calories: m.calories || 0,
                protein: m.protein || 0,
                carbs: m.carbs || 0,
                fats: m.fats || 0,
                status: m.isCompleted || m.status === 'eaten' ? 'eaten' : 'pending',
                scheduledTime: m.time || m.scheduledTime || '',
                serverId: m._id,
              },
              true
            );
          }
          setDailyPlan(res ? { ...res, meals: sortScheduledMeals(res.meals) } : res);
        }
      } catch (cloudErr) {
        console.log('[Diet Offline] Operating on local SQLite meals');
      }
    } catch (err) {
      console.warn('Error loading daily diet plan:', err.message);
    } finally {
      setLoadingPlan(false);
    }
  };

  const loadDietItems = async () => {
    setLoadingItems(true);
    try {
      // 1. Read from local SQLite
      const localItems = await DietDao.getDietItems();
      if (localItems && localItems.length > 0) {
        setDietItems(sortDietLibraryItems(localItems));
      }

      // 2. Fetch remote if reachable
      try {
        const items = await api.getDietItems();
        if (Array.isArray(items)) {
          for (const it of items) {
            await DietDao.saveDietItem(it, true);
          }
          const updated = await DietDao.getDietItems();
          setDietItems(sortDietLibraryItems(updated));
        }
      } catch (netErr) {
        console.log('[Diet Offline] Using local food library');
      }
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
    setSelectedDateStr(formatLocalDate(date));
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 1);
    setSelectedDateStr(formatLocalDate(date));
  };

  const handleToday = () => {
    setSelectedDateStr(getTodayDateStr());
  };

  // Toggle meal status (Checklist)
  const handleToggleMealStatus = async (eventId) => {
    try {
      // 1. Instant local toggle in SQLite
      await DietDao.toggleMealStatus(eventId);

      // Optimistically update React state immediately
      setDailyPlan((prev) => {
        if (!prev) return prev;
        const updatedMeals = (prev.meals || []).map((m) => {
          if (m._id === eventId || m.client_id === eventId) {
            const nextDone = !m.isCompleted;
            return { ...m, isCompleted: nextDone, status: nextDone ? 'eaten' : 'pending' };
          }
          return m;
        });
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

      // Background remote toggle if online
      api.toggleMealStatus(eventId).catch(() => {});
    } catch (err) {
      Alert.alert('Notice', 'Meal status updated locally.');
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
      {/* ─── Single Compact Header (Non-Sticky in scroll) ─── */}
      <View style={styles.compactHeader}>
        {/* Row 1: Back + Title + Refresh */}
        <View style={styles.compactHeaderRow}>
          <TouchableOpacity
            style={styles.compactBackBtn}
            onPress={() => onNavigate('Calendar')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={16} color="#0f172a" />
          </TouchableOpacity>

          <View style={styles.compactTitleBlock}>
            <Text style={styles.compactTitle}>Workout & Diet</Text>
          </View>

          <TouchableOpacity
            style={styles.compactRefreshBtn}
            onPress={() => {
              loadDailyPlan(selectedDateStr);
              loadDietItems();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="reload" size={14} color="#7e37d8" />
          </TouchableOpacity>
        </View>

        {/* Row 2: Inline Tab Switcher */}
        <View style={styles.inlineTabRow}>
          <TouchableOpacity
            style={[styles.inlineTab, activeTab === 'plan' && styles.inlineTabActive]}
            onPress={() => setActiveTab('plan')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="checkbox-outline"
              size={13}
              color={activeTab === 'plan' ? '#7e37d8' : '#64748b'}
            />
            <Text
              style={[
                styles.inlineTabText,
                activeTab === 'plan' && styles.inlineTabTextActive,
              ]}
            >
              Diet Plan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.inlineTab, activeTab === 'library' && styles.inlineTabActive]}
            onPress={() => setActiveTab('library')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="nutrition-outline"
              size={13}
              color={activeTab === 'library' ? '#7e37d8' : '#64748b'}
            />
            <Text
              style={[
                styles.inlineTabText,
                activeTab === 'library' && styles.inlineTabTextActive,
              ]}
            >
              Diet Library
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Tab Content (flex:1 fills remaining space) ─── */}
      <View style={{ flex: 1, overflow: 'hidden' }}>
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
            onOpenBreakdown={(item) => {
              setBreakdownDietItem(item);
              setBreakdownModalVisible(true);
            }}
            onOpenAiPlanner={() => setAiPlannerVisible(true)}
          />
        )}
      </View>

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
          setActiveTab('plan');
        }}
      />

      {/* Modal 3: Ingredient Breakdown Modal ("i" button) */}
      <IngredientBreakdownModal
        visible={breakdownModalVisible}
        onClose={() => setBreakdownModalVisible(false)}
        item={breakdownDietItem}
        onScheduleMeal={(item) => {
          setPrefillDietItem(item);
          setScheduleModalVisible(true);
        }}
      />
      <DietAiPlannerModal
        visible={aiPlannerVisible}
        onClose={() => setAiPlannerVisible(false)}
        dietItems={dietItems}
        dateStr={selectedDateStr}
        onAccepted={() => {
          loadDailyPlan(selectedDateStr);
          setActiveTab('plan');
        }}
      />
    </View>
  );
}
