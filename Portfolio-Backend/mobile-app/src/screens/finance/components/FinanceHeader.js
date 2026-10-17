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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <View style={[styles.titleIconBadge, { width: 34, height: 34, borderRadius: 8 }]}>
              <Ionicons name="wallet" size={17} color="#7e37d8" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.pageTitle, { fontSize: 15 }]} numberOfLines={1}>Finance & Budget</Text>
              <Text style={[styles.pageSubtitle, { fontSize: 11 }]} numberOfLines={1}>Monthly Overview</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.addTxBtn, { paddingHorizontal: 10, paddingVertical: 6, height: 32, borderRadius: 8 }]}
            onPress={() => onAddTransaction()}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={15} color="#ffffff" />
            <Text style={[styles.addTxBtnText, { fontSize: 12 }]}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Row 2: Month Navigation + Secondary Action Buttons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 6, marginTop: 4 }}>
          <View style={[styles.monthNav, { flex: 1.2, justifyContent: 'space-between', height: 32, paddingVertical: 0 }]}>
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
            style={[styles.budgetBtn, { paddingHorizontal: 9, paddingVertical: 5, height: 32, borderRadius: 8 }]}
            onPress={onOpenBudget}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={13} color="#7e37d8" />
            <Text style={[styles.budgetBtnText, { fontSize: 11 }]}>Budget</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.manageRemoveBtn, { paddingHorizontal: 9, paddingVertical: 5, height: 32, borderRadius: 8 }]}
            onPress={onOpenBulkRemove}
            activeOpacity={0.8}
          >
            <Feather name="trash-2" size={12} color="#ef4444" />
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
          <Text style={styles.addTxBtnText}>Add Entry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
