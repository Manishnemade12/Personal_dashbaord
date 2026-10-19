import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/workoutStyles';
import api from '../../../api/client';

const UNITS = ['tablespoon', 'teaspoon', 'gram', 'ml', 'scoop', 'cup', 'piece'];
const CATEGORIES = [
  'Breakfast',
  'Pre-Workout',
  'Post-Workout',
  'Lunch',
  'Snack',
  'Dinner',
  'Other',
];

export default function DietItemModal({
  visible,
  onClose,
  editingItem,
  onSaveSuccess,
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Breakfast');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState([
    { name: '', quantity: '1', unit: 'scoop' },
  ]);
  const [nutrients, setNutrients] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
  });
  const [grokAnalysis, setGrokAnalysis] = useState('');
  const [calculatingGrok, setCalculatingGrok] = useState(false);
  const [saving, setSaving] = useState(false);

  // Unit picker sheet state
  const [activeUnitIndex, setActiveUnitIndex] = useState(null);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name || '');
      setCategory(editingItem.category || 'Breakfast');
      setDescription(editingItem.description || '');
      setIngredients(
        editingItem.ingredients && editingItem.ingredients.length > 0
          ? editingItem.ingredients.map((ing) => ({
              name: ing.name || '',
              quantity: String(ing.quantity || '1'),
              unit: ing.unit || 'gram',
            }))
          : [{ name: '', quantity: '1', unit: 'scoop' }]
      );
      setNutrients(
        editingItem.nutrients || { calories: 0, protein: 0, carbs: 0, fats: 0 }
      );
      setGrokAnalysis(editingItem.grokAnalysis || '');
    } else {
      setName('');
      setCategory('Breakfast');
      setDescription('');
      setIngredients([
        { name: 'Whey Protein', quantity: '1', unit: 'scoop' },
        { name: 'Oats', quantity: '2', unit: 'tablespoon' },
        { name: 'Peanut Butter', quantity: '1', unit: 'tablespoon' },
      ]);
      setNutrients({ calories: 0, protein: 0, carbs: 0, fats: 0 });
      setGrokAnalysis('');
    }
  }, [editingItem, visible]);

  const handleAddIngredientRow = () => {
    setIngredients((prev) => [...prev, { name: '', quantity: '1', unit: 'gram' }]);
  };

  const handleRemoveIngredientRow = (index) => {
    if (ingredients.length <= 1) {
      Alert.alert('Notice', 'At least one ingredient row is required.');
      return;
    }
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index, field, value) => {
    setIngredients((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleCalculateGrok = async () => {
    const validIngredients = ingredients.filter((ing) => ing.name && ing.name.trim());
    if (validIngredients.length === 0) {
      Alert.alert('Required', 'Please add at least one ingredient name with quantity.');
      return;
    }

    setCalculatingGrok(true);
    try {
      const res = await api.calculateDietMacros({
        name: name.trim() || 'Custom Diet Item',
        category,
        ingredients: validIngredients.map((ing) => ({
          name: ing.name.trim(),
          quantity: parseFloat(ing.quantity) || 1,
          unit: ing.unit,
        })),
      });

      if (res && res.nutrients) {
        setNutrients(res.nutrients);
        setGrokAnalysis(res.analysis || '');
      }
    } catch (err) {
      Alert.alert('Calculation Error', err.message || 'Failed to calculate macros.');
    } finally {
      setCalculatingGrok(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a name for this diet item.');
      return;
    }

    const validIngredients = ingredients
      .filter((ing) => ing.name && ing.name.trim())
      .map((ing) => ({
        name: ing.name.trim(),
        quantity: parseFloat(ing.quantity) || 1,
        unit: ing.unit,
      }));

    if (validIngredients.length === 0) {
      Alert.alert('Required', 'Please provide at least one ingredient.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        category,
        description: description.trim(),
        ingredients: validIngredients,
        nutrients,
        grokAnalysis,
      };

      if (editingItem?._id) {
        await api.updateDietItem(editingItem._id, payload);
      } else {
        await api.createDietItem(payload);
      }

      onSaveSuccess();
      onClose();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save diet item.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingItem ? 'Edit Diet Item' : 'New Diet Recipe / Item'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Diet Name */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Diet / Recipe Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Morning High-Protein Shake"
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Category Selector */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Meal Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      category === cat && styles.categoryChipActive,
                      { paddingVertical: 4, paddingHorizontal: 8 },
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        category === cat && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Dynamic Ingredients Section */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Required Ingredients (Tablespoon, Gram, Scoop, etc.) *
              </Text>
              {ingredients.map((ing, idx) => (
                <View key={idx} style={styles.ingredientRow}>
                  <TextInput
                    style={styles.ingredientNameInput}
                    placeholder="Ingredient name (e.g. Oats)"
                    placeholderTextColor="#94a3b8"
                    value={ing.name}
                    onChangeText={(val) => handleIngredientChange(idx, 'name', val)}
                  />
                  <TextInput
                    style={styles.ingredientQtyInput}
                    placeholder="Qty"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={ing.quantity}
                    onChangeText={(val) => handleIngredientChange(idx, 'quantity', val)}
                  />
                  {/* Unit Selector Button */}
                  <TouchableOpacity
                    style={styles.unitSelectorBtn}
                    onPress={() => setActiveUnitIndex(idx)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.unitSelectorText} numberOfLines={1}>
                      {ing.unit}
                    </Text>
                    <Ionicons name="chevron-down" size={10} color="#64748b" />
                  </TouchableOpacity>

                  {/* Remove Button */}
                  <TouchableOpacity
                    style={styles.removeIngredientBtn}
                    onPress={() => handleRemoveIngredientRow(idx)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={styles.addIngredientRowBtn}
                onPress={handleAddIngredientRow}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={14} color="#7e37d8" />
                <Text style={styles.addIngredientRowText}>+ Add Another Ingredient</Text>
              </TouchableOpacity>
            </View>

            {/* Grok AI Calculate Button */}
            <TouchableOpacity
              style={styles.grokCalculateBtn}
              onPress={handleCalculateGrok}
              disabled={calculatingGrok}
              activeOpacity={0.8}
            >
              {calculatingGrok ? (
                <>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.grokCalculateBtnText}>Grok Calculating Macros...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles" size={16} color="#ffffff" />
                  <Text style={styles.grokCalculateBtnText}>
                    ⚡ Calculate Calories & Protein with Grok AI
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Nutrients Display / Manual Adjustments */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nutritional Breakdown (Auto-Filled by Grok)</Text>
              <View style={styles.nutrientInputGrid}>
                <View style={styles.nutrientInputBox}>
                  <Text style={styles.nutrientInputLabel}>Calories (kcal)</Text>
                  <TextInput
                    style={styles.nutrientInputVal}
                    keyboardType="numeric"
                    value={String(nutrients.calories || 0)}
                    onChangeText={(v) =>
                      setNutrients((p) => ({ ...p, calories: parseInt(v, 10) || 0 }))
                    }
                  />
                </View>
                <View style={styles.nutrientInputBox}>
                  <Text style={styles.nutrientInputLabel}>Protein (g)</Text>
                  <TextInput
                    style={styles.nutrientInputVal}
                    keyboardType="numeric"
                    value={String(nutrients.protein || 0)}
                    onChangeText={(v) =>
                      setNutrients((p) => ({ ...p, protein: parseInt(v, 10) || 0 }))
                    }
                  />
                </View>
                <View style={styles.nutrientInputBox}>
                  <Text style={styles.nutrientInputLabel}>Carbs (g)</Text>
                  <TextInput
                    style={styles.nutrientInputVal}
                    keyboardType="numeric"
                    value={String(nutrients.carbs || 0)}
                    onChangeText={(v) =>
                      setNutrients((p) => ({ ...p, carbs: parseInt(v, 10) || 0 }))
                    }
                  />
                </View>
                <View style={styles.nutrientInputBox}>
                  <Text style={styles.nutrientInputLabel}>Fats (g)</Text>
                  <TextInput
                    style={styles.nutrientInputVal}
                    keyboardType="numeric"
                    value={String(nutrients.fats || 0)}
                    onChangeText={(v) =>
                      setNutrients((p) => ({ ...p, fats: parseInt(v, 10) || 0 }))
                    }
                  />
                </View>
              </View>
            </View>

            {/* Grok Insight summary preview */}
            {grokAnalysis ? (
              <View style={styles.aiInsightBox}>
                <Ionicons name="sparkles" size={14} color="#7e37d8" />
                <Text style={styles.aiInsightText}>{grokAnalysis}</Text>
              </View>
            ) : null}

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Notes & Preparation (Optional)</Text>
              <TextInput
                style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]}
                placeholder="e.g. Blend with ice cubes for 45 seconds"
                placeholderTextColor="#94a3b8"
                multiline
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {editingItem ? 'Update Diet Item' : 'Save Diet Item'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Unit Selector Sub-Modal */}
      {activeUnitIndex !== null && (
        <Modal transparent animationType="fade" visible={true}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.4)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 24,
            }}
            activeOpacity={1}
            onPress={() => setActiveUnitIndex(null)}
          >
            <View
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 14,
                width: '100%',
                maxWidth: 280,
                padding: 16,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 10 }}>
                Select Measurement Unit
              </Text>
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={{
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: '#f1f5f9',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onPress={() => {
                    handleIngredientChange(activeUnitIndex, 'unit', u);
                    setActiveUnitIndex(null);
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight:
                        ingredients[activeUnitIndex]?.unit === u ? '700' : '500',
                      color:
                        ingredients[activeUnitIndex]?.unit === u ? '#7e37d8' : '#334155',
                      textTransform: 'capitalize',
                    }}
                  >
                    {u}
                  </Text>
                  {ingredients[activeUnitIndex]?.unit === u && (
                    <Ionicons name="checkmark" size={16} color="#7e37d8" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </Modal>
  );
}
