import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function IngredientBreakdownModal({
  visible,
  onClose,
  item,
  onScheduleMeal,
}) {
  if (!item) return null;

  const nutrients = item.nutrients || { calories: 0, protein: 0, carbs: 0, fats: 0 };
  const totalCal = Number(nutrients.calories) || 1;

  // Use precomputed ingredientBreakdown from backend, or derive from item.ingredients
  const breakdownList = (item.ingredientBreakdown && item.ingredientBreakdown.length > 0)
    ? item.ingredientBreakdown
    : (item.ingredients || []).map((ing) => {
        const cal = Number(ing.calories) || 0;
        const pct = totalCal > 0 ? Math.round((cal / totalCal) * 100) : 0;
        return {
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          calories: cal,
          protein: Number(ing.protein || 0),
          carbs: Number(ing.carbs || 0),
          fats: Number(ing.fats || 0),
          percentOfTotal: pct,
        };
      });

  // Calculate total computed calories from breakdown if nutrients was 0
  const computedTotalCal = breakdownList.reduce((acc, curr) => acc + (curr.calories || 0), 0);
  const displayTotalCal = totalCal > 1 ? totalCal : (computedTotalCal || 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={breakdownStyles.overlay}>
        <View style={breakdownStyles.modalContainer}>
          {/* Header */}
          <View style={breakdownStyles.headerRow}>
            <View style={breakdownStyles.headerLeft}>
              <View style={breakdownStyles.iconWrap}>
                <Ionicons name="pie-chart" size={18} color="#7e37d8" />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={breakdownStyles.modalTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={breakdownStyles.badgeRow}>
                  <View style={breakdownStyles.categoryBadge}>
                    <Text style={breakdownStyles.categoryBadgeText}>
                      {item.category || 'Meal'}
                    </Text>
                  </View>
                  <Text style={breakdownStyles.headerSub}>Nutrition Breakdown</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={breakdownStyles.closeBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={breakdownStyles.scrollBody}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* Total Meal Summary Banner */}
            <View style={breakdownStyles.summaryBanner}>
              <View style={breakdownStyles.totalCalBlock}>
                <Text style={breakdownStyles.totalCalLabel}>TOTAL ENERGY</Text>
                <View style={breakdownStyles.totalCalRow}>
                  <Text style={breakdownStyles.totalCalNum}>{displayTotalCal}</Text>
                  <Text style={breakdownStyles.totalCalUnit}>kcal</Text>
                </View>
              </View>

              <View style={breakdownStyles.macroPillRow}>
                <View style={[breakdownStyles.macroCard, { borderColor: '#e9d5ff', backgroundColor: '#faf5ff' }]}>
                  <Text style={[breakdownStyles.macroCardVal, { color: '#7e37d8' }]}>
                    {nutrients.protein || 0}g
                  </Text>
                  <Text style={breakdownStyles.macroCardLabel}>Protein</Text>
                </View>
                <View style={[breakdownStyles.macroCard, { borderColor: '#fed7aa', backgroundColor: '#fff7ed' }]}>
                  <Text style={[breakdownStyles.macroCardVal, { color: '#ea580c' }]}>
                    {nutrients.carbs || 0}g
                  </Text>
                  <Text style={breakdownStyles.macroCardLabel}>Carbs</Text>
                </View>
                <View style={[breakdownStyles.macroCard, { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }]}>
                  <Text style={[breakdownStyles.macroCardVal, { color: '#16a34a' }]}>
                    {nutrients.fats || 0}g
                  </Text>
                  <Text style={breakdownStyles.macroCardLabel}>Fats</Text>
                </View>
              </View>
            </View>

            {/* Ingredients Breakdown Title */}
            <View style={breakdownStyles.sectionHeaderRow}>
              <Text style={breakdownStyles.sectionTitle}>
                INGREDIENT CONTRIBUTIONS ({breakdownList.length})
              </Text>
              <Text style={breakdownStyles.sectionSub}>% of Meal Calories</Text>
            </View>

            {/* Ingredient List */}
            {breakdownList.length === 0 ? (
              <View style={breakdownStyles.emptyBox}>
                <Text style={breakdownStyles.emptyText}>No ingredients specified for this meal.</Text>
              </View>
            ) : (
              breakdownList.map((ing, idx) => {
                const percent = displayTotalCal > 0 ? Math.round(((ing.calories || 0) / displayTotalCal) * 100) : 0;
                return (
                  <View key={idx} style={breakdownStyles.ingredientCard}>
                    {/* Top Row: Name + Qty + Calories */}
                    <View style={breakdownStyles.ingTopRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={breakdownStyles.ingName} numberOfLines={1}>
                          {ing.name}
                        </Text>
                        <Text style={breakdownStyles.ingQty}>
                          {ing.quantity} {ing.unit}
                        </Text>
                      </View>

                      <View style={breakdownStyles.ingCalBlock}>
                        <Text style={breakdownStyles.ingCalVal}>
                          {ing.calories || 0} <Text style={breakdownStyles.ingCalUnit}>kcal</Text>
                        </Text>
                        <View style={breakdownStyles.ingPercentBadge}>
                          <Text style={breakdownStyles.ingPercentText}>{percent}% share</Text>
                        </View>
                      </View>
                    </View>

                    {/* Progress Bar of Macro Share */}
                    <View style={breakdownStyles.progressBarBg}>
                      <View
                        style={[
                          breakdownStyles.progressBarFill,
                          {
                            width: `${Math.min(100, Math.max(percent, 4))}%`,
                            backgroundColor: idx % 3 === 0 ? '#7e37d8' : idx % 3 === 1 ? '#0284c7' : '#10b981',
                          },
                        ]}
                      />
                    </View>

                    {/* Macro Breakdown Mini Row */}
                    <View style={breakdownStyles.ingMacroRow}>
                      <View style={breakdownStyles.ingMacroItem}>
                        <Text style={breakdownStyles.ingMacroItemVal}>{ing.protein || 0}g</Text>
                        <Text style={breakdownStyles.ingMacroItemLabel}>Protein</Text>
                      </View>
                      <Text style={breakdownStyles.dotSep}>•</Text>
                      <View style={breakdownStyles.ingMacroItem}>
                        <Text style={breakdownStyles.ingMacroItemVal}>{ing.carbs || 0}g</Text>
                        <Text style={breakdownStyles.ingMacroItemLabel}>Carbs</Text>
                      </View>
                      <Text style={breakdownStyles.dotSep}>•</Text>
                      <View style={breakdownStyles.ingMacroItem}>
                        <Text style={breakdownStyles.ingMacroItemVal}>{ing.fats || 0}g</Text>
                        <Text style={breakdownStyles.ingMacroItemLabel}>Fats</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}

            {/* Grok AI Insight */}
            {item.grokAnalysis ? (
              <View style={breakdownStyles.aiBox}>
                <View style={breakdownStyles.aiHeaderRow}>
                  <Ionicons name="sparkles" size={13} color="#7e37d8" />
                  <Text style={breakdownStyles.aiTitle}>AI Dietary Insight</Text>
                </View>
                <Text style={breakdownStyles.aiText}>{item.grokAnalysis}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Footer Actions */}
          <View style={breakdownStyles.footerRow}>
            {onScheduleMeal && (
              <TouchableOpacity
                style={breakdownStyles.scheduleBtn}
                onPress={() => {
                  onClose();
                  onScheduleMeal(item);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={15} color="#ffffff" />
                <Text style={breakdownStyles.scheduleBtnText}>Schedule to Calendar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={breakdownStyles.closeActionBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={breakdownStyles.closeActionBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const breakdownStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '88%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 6,
  },
  categoryBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  headerSub: {
    fontSize: 11,
    color: '#64748b',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    flex: 1,
  },
  summaryBanner: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  totalCalBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 10,
  },
  totalCalLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#64748b',
  },
  totalCalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  totalCalNum: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  totalCalUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 4,
  },
  macroPillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroCard: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 6,
    alignItems: 'center',
  },
  macroCardVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  macroCardLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#475569',
  },
  sectionSub: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
  emptyBox: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  ingredientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  ingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ingName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    textTransform: 'capitalize',
  },
  ingQty: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  ingCalBlock: {
    alignItems: 'flex-end',
  },
  ingCalVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  ingCalUnit: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748b',
  },
  ingPercentBadge: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 3,
  },
  ingPercentText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#7e37d8',
  },
  progressBarBg: {
    height: 5,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  ingMacroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ingMacroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ingMacroItemVal: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  ingMacroItemLabel: {
    fontSize: 9,
    color: '#94a3b8',
  },
  dotSep: {
    fontSize: 10,
    color: '#cbd5e1',
    marginHorizontal: 8,
  },
  aiBox: {
    backgroundColor: '#faf5ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    padding: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  aiTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7e37d8',
  },
  aiText: {
    fontSize: 11,
    color: '#581c87',
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    gap: 10,
  },
  scheduleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7e37d8',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  scheduleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  closeActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
});
