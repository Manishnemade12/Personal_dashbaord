import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api } from '../../../api/client';

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function DietCaloriesVisuals({ visible }) {
  const [history, setHistory] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (!visible) return;
    setSelectedDate(null);
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 13);
    api.getDietCalorieHistory(formatDate(start), formatDate(end))
      .then((response) => setHistory(Array.isArray(response?.history) ? response.history : []))
      .catch((error) => console.error('[Diet Calories Visuals Error]', error));
  }, [visible]);

  const maxCalories = useMemo(
    () => Math.max(...history.map((item) => item.plannedCalories || 0), 1),
    [history]
  );

  if (!visible) return null;

  const selectedItem = history.find((item) => item.date === selectedDate);
  const formatTooltipDate = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 10, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' }}>
      <Text style={{ color: '#166534', fontSize: 12, fontWeight: '800' }}>Diet calorie history</Text>
      <Text style={{ color: '#4d7c0f', fontSize: 10, marginTop: 2 }}>Completed calories from the last 14 days</Text>
      {selectedItem && (
        <View
          accessibilityRole="summary"
          style={{
            alignSelf: 'center',
            marginTop: 7,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
            backgroundColor: '#166534',
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '700' }}>
            {formatTooltipDate(selectedItem.date)} · {selectedItem.completedCalories || 0} kcal ·{' '}
            {selectedItem.completedMeals || 0} meal{selectedItem.completedMeals === 1 ? '' : 's'}
          </Text>
        </View>
      )}
      <View style={{ height: 74, flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginTop: 8 }}>
        {history.map((item) => {
          const value = item.completedCalories || 0;
          const height = value ? Math.max(6, Math.round((value / maxCalories) * 52)) : 3;
          const isSelected = selectedDate === item.date;
          return (
            <View key={item.date} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${formatTooltipDate(item.date)}: ${value} calories consumed`}
                onPress={() => setSelectedDate((current) => (current === item.date ? null : item.date))}
                onHoverIn={() => setSelectedDate(item.date)}
                style={{
                  width: '80%',
                  height,
                  minHeight: 3,
                  borderRadius: 3,
                  backgroundColor: value ? '#10b981' : '#d1fae5',
                  borderWidth: isSelected ? 2 : 0,
                  borderColor: '#047857',
                  opacity: isSelected ? 0.85 : 1,
                }}
              />
              <Text style={{ color: '#65a30d', fontSize: 8, marginTop: 3 }}>{item.date.slice(8)}</Text>
            </View>
          );
        })}
      </View>
      <Text style={{ color: '#166534', fontSize: 10, marginTop: 4 }}>
        Green bars show calories from completed Diet calendar meals.
      </Text>
    </View>
  );
}
