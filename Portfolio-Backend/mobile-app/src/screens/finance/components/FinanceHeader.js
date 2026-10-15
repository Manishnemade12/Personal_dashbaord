import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import styles from '../styles/financeStyles';

export default function FinanceHeader({ isMobile, monthName, changeMonth, onOpenBudget, onOpenBulkRemove, onAddTransaction }) {
  if (isMobile) {
    return (
      <View style={styles.headerToolbarMobile}>
        {/* Row 1: Title + Primary Action (+ Entry) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <View style={styles.titleIconBadge}>
              <Ionicons name="wallet" size={20} color="#7e37d8" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.pageTitle, { fontSize: 17 }]} numberOfLines={1}>Finance & Expenses</Text>
              <Text style={styles.pageSubtitle} numberOfLines={1}>Budget Tracking & Expenses</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.addTxBtn, { paddingHorizontal: 12, paddingVertical: 8 }]}
            onPress={() => onAddTransaction()}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.addTxBtnText}>+ Entry</Text>
          </TouchableOpacity>
        </View>

        {/* Row 2: Month Navigation + Secondary Action Buttons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 8, marginTop: 4 }}>
          <View style={[styles.monthNav, { flex: 1.2, justifyContent: 'space-between' }]}>
            <TouchableOpacity style={styles.arrowBtn} onPress={() => changeMonth(-1)}>
              <Ionicons name="chevron-back" size={14} color="#64748b" />
            </TouchableOpacity>
            <View style={styles.monthLabelBox}>
              <Text style={[styles.monthLabelText, { fontSize: 12 }]}>{monthName}</Text>
            </View>
            <TouchableOpacity style={styles.arrowBtn} onPress={() => changeMonth(1)}>
              <Ionicons name="chevron-forward" size={14} color="#64748b" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.budgetBtn, { paddingHorizontal: 10, paddingVertical: 7 }]}
            onPress={onOpenBudget}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={14} color="#7e37d8" />
            <Text style={[styles.budgetBtnText, { fontSize: 11 }]}>Budget</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.manageRemoveBtn, { paddingHorizontal: 10, paddingVertical: 7 }]}
            onPress={onOpenBulkRemove}
            activeOpacity={0.8}
          >
            <Feather name="trash-2" size={13} color="#ef4444" />
            <Text style={[styles.manageRemoveBtnText, { fontSize: 11 }]}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.headerToolbar}>
      <View style={styles.leftTitleRow}>
        <View style={styles.titleIconBadge}>
          <Ionicons name="wallet" size={20} color="#7e37d8" />
        </View>
        <View>
          <Text style={styles.pageTitle}>Finance & Expenses</Text>
          <Text style={styles.pageSubtitle}>Budget Tracking & Itemized Expenses</Text>
        </View>
      </View>

      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.arrowBtn} onPress={() => changeMonth(-1)}>
          <Ionicons name="chevron-back" size={16} color="#64748b" />
        </TouchableOpacity>
        <View style={styles.monthLabelBox}>
          <Ionicons name="calendar-outline" size={14} color="#7e37d8" style={{ marginRight: 6 }} />
          <Text style={styles.monthLabelText}>{monthName}</Text>
        </View>
        <TouchableOpacity style={styles.arrowBtn} onPress={() => changeMonth(1)}>
          <Ionicons name="chevron-forward" size={16} color="#64748b" />
        </TouchableOpacity>
      </View>

      <View style={styles.rightActionRow}>
        <TouchableOpacity
          style={styles.budgetBtn}
          onPress={onOpenBudget}
          activeOpacity={0.8}
        >
          <Ionicons name="options-outline" size={15} color="#7e37d8" />
          <Text style={styles.budgetBtnText}>Set Budget</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.manageRemoveBtn}
          onPress={onOpenBulkRemove}
          activeOpacity={0.8}
        >
          <Feather name="trash-2" size={14} color="#ef4444" />
          <Text style={styles.manageRemoveBtnText}>Remove Transactions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addTxBtn}
          onPress={() => onAddTransaction()}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text style={styles.addTxBtnText}>+ Entry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
