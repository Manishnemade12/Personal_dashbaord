import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/workoutStyles';

const CATEGORIES = [
  'All',
  'Breakfast',
  'Pre-Workout',
  'Post-Workout',
  'Lunch',
  'Snack',
  'Dinner',
];

export default function DietLibraryTab({
  dietItems,
  loading,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteDietItem,
  onScheduleItem,
  onOpenBreakdown,
}) {
  const [selectedCategory, setSelectedCategory] = React.useState('All');
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredItems = (dietItems || []).filter((item) => {
    const matchesCategory =
      selectedCategory === 'All' || item.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.name?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.ingredients?.some((ing) => ing.name?.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  return (
    <View style={{ flex: 1 }}>
      {/* Search + Add — stacked on 2 lines to avoid overflow */}
      <View style={styles.libraryHeader}>
        {/* Row 1: Search bar full width */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={14} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipes, shakes, ingredients..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={14} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Row 2: Category scroll + Add button inline */}
        <View style={styles.categoryAddRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollInline}
            style={{ flex: 1 }}
          >
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      isActive && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Add button — compact icon+label */}
          <TouchableOpacity
            style={styles.addDietBtnCompact}
            onPress={onOpenAddModal}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={16} color="#ffffff" />
            <Text style={styles.addDietBtnCompactText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Diet Items List */}
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#7e37d8" />
            <Text style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
              Loading diet recipes & nutrition...
            </Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <View style={[styles.emptyStateIcon, { backgroundColor: '#f3e8ff' }]}>
              <Ionicons name="nutrition-outline" size={26} color="#7e37d8" />
            </View>
            <Text style={styles.emptyStateTitle}>
              {searchQuery ? 'No Matching Diets' : 'No Diet Items Yet'}
            </Text>
            <Text style={styles.emptyStateSub}>
              Add your shakes, meals, and recipes with exact tablespoon & gram quantities, then calculate macros with Grok AI!
            </Text>
            <TouchableOpacity
              style={[styles.emptyActionBtn, { backgroundColor: '#7e37d8' }]}
              onPress={onOpenAddModal}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={16} color="#ffffff" />
              <Text style={styles.emptyActionBtnText}>Create First Diet Item</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredItems.map((item) => (
            <View key={item._id} style={styles.dietItemCard}>
              {/* Card Header */}
              <View style={styles.dietCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                  <Text style={styles.dietNameText} numberOfLines={1}>{item.name}</Text>
                  <TouchableOpacity
                    style={{
                      marginLeft: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 10,
                      backgroundColor: '#f3e8ff',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 2,
                    }}
                    onPress={() => onOpenBreakdown && onOpenBreakdown(item)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    title="View Ingredient Breakdown"
                  >
                    <Ionicons name="information-circle" size={13} color="#7e37d8" />
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#7e37d8' }}>i</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{item.category}</Text>
                </View>
              </View>

              {/* Macro Nutrients Chips */}
              <View style={styles.macroBadgeRow}>
                <TouchableOpacity
                  style={[styles.macroChip, styles.calChip, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                  onPress={() => onOpenBreakdown && onOpenBreakdown(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.calChipText}>
                    ⚡ {item.nutrients?.calories || 0} kcal
                  </Text>
                  <Ionicons name="information-circle-outline" size={12} color="#7e37d8" />
                </TouchableOpacity>
                <View style={[styles.macroChip, styles.proChip]}>
                  <Text style={styles.proChipText}>
                    💪 {item.nutrients?.protein || 0}g Pro
                  </Text>
                </View>
                {item.nutrients?.carbs > 0 && (
                  <View style={[styles.macroChip, styles.carbChip]}>
                    <Text style={styles.carbChipText}>
                      🌾 {item.nutrients?.carbs}g C
                    </Text>
                  </View>
                )}
                {item.nutrients?.fats > 0 && (
                  <View style={[styles.macroChip, styles.fatChip]}>
                    <Text style={styles.fatChipText}>
                      🥑 {item.nutrients?.fats}g F
                    </Text>
                  </View>
                )}
              </View>

              {/* Ingredients Chips */}
              {item.ingredients && item.ingredients.length > 0 && (
                <View style={styles.ingredientsSection}>
                  <Text style={styles.ingredientsLabel}>Required Ingredients</Text>
                  <View style={styles.ingredientPillWrap}>
                    {item.ingredients.map((ing, idx) => (
                      <View key={idx} style={styles.ingredientPill}>
                        <Text style={styles.ingredientPillText}>
                          {ing.quantity} {ing.unit} {ing.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Grok AI Insight */}
              {item.grokAnalysis ? (
                <View style={styles.aiInsightBox}>
                  <Ionicons name="sparkles" size={12} color="#7e37d8" />
                  <Text style={styles.aiInsightText} numberOfLines={2}>{item.grokAnalysis}</Text>
                </View>
              ) : null}

              {/* Card Actions */}
              <View style={styles.dietCardActions}>
                <TouchableOpacity
                  style={styles.scheduleActionBtn}
                  onPress={() => onScheduleItem(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={12} color="#ffffff" />
                  <Text style={styles.scheduleActionBtnText}>Schedule</Text>
                </TouchableOpacity>

                <View style={styles.cardRightActions}>
                  <TouchableOpacity
                    style={[styles.cardMiniActionBtn, { backgroundColor: '#f3e8ff' }]}
                    onPress={() => onOpenBreakdown && onOpenBreakdown(item)}
                    activeOpacity={0.7}
                    title="View Ingredient Breakdown"
                  >
                    <Ionicons name="information-circle" size={14} color="#7e37d8" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cardMiniActionBtn}
                    onPress={() => onOpenEditModal(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil-outline" size={14} color="#64748b" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cardMiniActionBtn}
                    onPress={() => onDeleteDietItem(item._id, item.name)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={14} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
