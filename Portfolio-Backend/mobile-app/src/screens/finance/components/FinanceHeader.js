import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import styles from '../styles/financeStyles';

export default function FinanceHeader({ isMobile, monthName, changeMonth, onOpenBudget, onOpenBulkRemove, onAddTransaction }) {
  return (
      <View style={[styles.headerToolbar, isMobile && styles.headerToolbarMobile]}>
        <View style={[styles.leftTitleRow, isMobile && styles.leftTitleRowMobile]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={styles.titleIconBadge}>
              <Ionicons name="wallet" size={20} color="#7e37d8" />
            </View>
            <View>
              <Text style={styles.pageTitle}>Finance & Expenses</Text>
              <Text style={styles.pageSubtitle}>Budget Tracking & Itemized Expenses</Text>
            </View>
          </View>

          {isMobile && (
            <View style={styles.monthNav}>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => changeMonth(-1)}>
                <Ionicons name="chevron-back" size={16} color="#64748b" />
              </TouchableOpacity>
              <View style={styles.monthLabelBox}>
                <Text style={[styles.monthLabelText, { fontSize: 12 }]}>{monthName}</Text>
              </View>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => changeMonth(1)}>
                <Ionicons name="chevron-forward" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {!isMobile && (
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
        )}

        <View style={[styles.rightActionRow, isMobile && styles.rightActionRowMobile]}>
          <TouchableOpacity
            style={[styles.budgetBtn, isMobile && { flex: 1, justifyContent: 'center', paddingHorizontal: 6 }]}
            onPress={onOpenBudget}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={15} color="#7e37d8" />
            <Text style={styles.budgetBtnText}>{isMobile ? 'Budget' : 'Set Budget'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.manageRemoveBtn, isMobile && { flex: 1, justifyContent: 'center', paddingHorizontal: 6 }]}
            onPress={onOpenBulkRemove}
            activeOpacity={0.8}
          >
            <Feather name="trash-2" size={14} color="#ef4444" />
            <Text style={styles.manageRemoveBtnText}>{isMobile ? 'Remove' : 'Remove Transactions'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addTxBtn, isMobile && { flex: 1.4, justifyContent: 'center', paddingHorizontal: 8 }]}
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
