import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/workoutStyles';

export default function TodaysDietPlanTab({
  selectedDateStr,
  onPrevDay,
  onNextDay,
  onToday,
  isToday,
  dailyPlan,
  loading,
  onToggleStatus,
  onDeleteMeal,
  onOpenScheduleModal,
}) {
  const stats = dailyPlan?.stats || {
    totalMeals: 0,
    completedMeals: 0,
    accuracyPercentage: 0,
    totalPlannedCalories: 0,
    totalCompletedCalories: 0,
    totalPlannedProtein: 0,
    totalCompletedProtein: 0,
  };

  const meals = dailyPlan?.meals || [];

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return 'Today';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Date Navigator Bar */}
      <View style={styles.dateNavigatorBar}>
        <TouchableOpacity style={styles.dateNavArrow} onPress={onPrevDay} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={16} color="#334155" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.dateCenterLabel} onPress={onToday} activeOpacity={0.7}>
          <Text style={styles.dateText}>{formatDisplayDate(selectedDateStr)}</Text>
          {isToday && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>TODAY</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.dateNavArrow} onPress={onNextDay} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={16} color="#334155" />
        </TouchableOpacity>
      </View>

      {/* Accuracy & Compliance Card */}
      <View style={styles.accuracyCard}>
        <View style={styles.accuracyHeaderRow}>
          <View style={styles.accuracyTitleWrap}>
            <Ionicons name="fitness-outline" size={18} color="#10b981" />
            <Text style={styles.accuracyTitle}>Diet Plan Accuracy</Text>
          </View>
          <View style={styles.accuracyPercentBadge}>
            <Text style={styles.accuracyPercentText}>{stats.accuracyPercentage}% ACCURACY</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(100, Math.max(0, stats.accuracyPercentage))}%` },
            ]}
          />
        </View>

        {/* Macro & Meal Metrics */}
        <View style={styles.macroRow}>
          <View style={styles.macroPill}>
            <Ionicons name="checkmark-done" size={13} color="#10b981" />
            <Text style={styles.macroPillText}>
              {stats.completedMeals}/{stats.totalMeals}
            </Text>
            <Text style={styles.macroPillSub}>Meals Done</Text>
          </View>

          {stats.totalPlannedCalories > 0 && (
            <View style={styles.macroPill}>
              <Ionicons name="flame" size={13} color="#f59e0b" />
              <Text style={styles.macroPillText}>
                {stats.totalCompletedCalories}/{stats.totalPlannedCalories}
              </Text>
              <Text style={styles.macroPillSub}>kcal</Text>
            </View>
          )}

          {stats.totalPlannedProtein > 0 && (
            <View style={styles.macroPill}>
              <Ionicons name="barbell-outline" size={13} color="#10b981" />
              <Text style={styles.macroPillText}>
                {stats.totalCompletedProtein}/{stats.totalPlannedProtein}g
              </Text>
              <Text style={styles.macroPillSub}>Protein</Text>
            </View>
          )}
        </View>
      </View>

      {/* Meals Section Header */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>
          Scheduled Meals ({meals.length})
        </Text>
        <TouchableOpacity
          style={styles.scheduleBtnMini}
          onPress={onOpenScheduleModal}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={14} color="#ffffff" />
          <Text style={styles.scheduleBtnMiniText}>Schedule Meal</Text>
        </TouchableOpacity>
      </View>

      {/* Loading state */}
      {loading ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator size="small" color="#7e37d8" />
          <Text style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
            Syncing diet schedule & checklist...
          </Text>
        </View>
      ) : meals.length === 0 ? (
        <View style={styles.emptyStateBox}>
          <View style={styles.emptyStateIcon}>
            <Ionicons name="restaurant-outline" size={26} color="#10b981" />
          </View>
          <Text style={styles.emptyStateTitle}>No Meals Scheduled</Text>
          <Text style={styles.emptyStateSub}>
            Plan your daily diet by scheduling meals from your Diet Library with explicit time slots!
          </Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={onOpenScheduleModal}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={14} color="#ffffff" />
            <Text style={styles.emptyActionBtnText}>Schedule Meal for Today</Text>
          </TouchableOpacity>
        </View>
      ) : (
        meals.map((meal) => (
          <View
            key={meal._id}
            style={[styles.mealCard, meal.isCompleted && styles.mealCardCompleted]}
          >
            {/* Interactive Checklist Checkbox */}
            <TouchableOpacity
              style={[
                styles.checkboxBtn,
                meal.isCompleted && styles.checkboxBtnActive,
              ]}
              onPress={() => onToggleStatus(meal._id)}
              activeOpacity={0.7}
            >
              {meal.isCompleted && (
                <Ionicons name="checkmark" size={16} color="#ffffff" />
              )}
            </TouchableOpacity>

            {/* Meal Details */}
            <View style={styles.mealCardContent}>
              <View style={styles.mealTimeBadge}>
                <Ionicons name="time-outline" size={11} color="#059669" />
                <Text style={styles.mealTimeText}>{meal.timeStr}</Text>
              </View>

              <Text
                style={[
                  styles.mealTitle,
                  meal.isCompleted && styles.mealTitleCompleted,
                ]}
                numberOfLines={1}
              >
                {meal.title}
              </Text>

              {meal.description ? (
                <Text
                  style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}
                  numberOfLines={1}
                >
                  {meal.description}
                </Text>
              ) : null}

              {(meal.calories > 0 || meal.protein > 0) && (
                <View style={styles.mealNutrientRow}>
                  {meal.calories > 0 && (
                    <Text style={styles.mealNutrientChip}>
                      ⚡ {meal.calories} kcal
                    </Text>
                  )}
                  {meal.protein > 0 && (
                    <Text style={styles.mealNutrientChip}>
                      💪 {meal.protein}g Pro
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Delete Meal Action */}
            <TouchableOpacity
              style={styles.deleteMealBtn}
              onPress={() => onDeleteMeal(meal._id, meal.title)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        ))
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
