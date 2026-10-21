import { StyleSheet, Platform } from 'react-native';

const aiRoutineStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 620,
    maxHeight: '92%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      },
      default: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    backgroundColor: '#faf5ff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3e8ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#7e37d8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e1b4b',
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: '#6b21a8',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f5f3ff',
  },

  // Scrollable Body
  modalBodyScroll: {
    flex: 1,
    minHeight: 0,
  },
  modalBodyContent: {
    padding: 16,
    gap: 14,
  },

  // Info Banner
  infoBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 11.5,
    color: '#166534',
    lineHeight: 16,
  },

  // Form Fields
  fieldGroup: {
    gap: 6,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  fieldHelper: {
    fontSize: 11,
    color: '#64748b',
  },

  // Category Pills
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryPillActive: {
    backgroundColor: '#f3e8ff',
    borderColor: '#c084fc',
  },
  categoryPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  categoryPillTextActive: {
    color: '#7e37d8',
    fontWeight: '700',
  },

  // Calendar Selector Pills
  calendarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  calendarPillActive: {
    borderColor: '#7e37d8',
    backgroundColor: '#faf5ff',
  },
  calendarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  calendarPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  calendarPillTextActive: {
    color: '#7e37d8',
    fontWeight: '700',
  },

  // Inputs
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
  },
  textArea: {
    minHeight: 75,
    textAlignVertical: 'top',
  },

  // Quick Suggestion Chips
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  suggestionChip: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  suggestionChipText: {
    fontSize: 11,
    color: '#475569',
  },

  // Loading Screen inside Modal
  loadingContainer: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e1b4b',
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 360,
  },

  // Review List
  reviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  reviewCountBadge: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  reviewCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7e37d8',
  },

  // Routine Item Card
  routineCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  routineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timeBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1e293b',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityBadgeHigh: {
    backgroundColor: '#fee2e2',
  },
  priorityBadgeMed: {
    backgroundColor: '#fef3c7',
  },
  priorityBadgeLow: {
    backgroundColor: '#e0f2fe',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  routineCardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  routineCardDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },

  // Co-occurrence / Synergy Banner on card
  parallelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 2,
  },
  parallelText: {
    fontSize: 11,
    color: '#1d4ed8',
    fontWeight: '600',
    flex: 1,
  },

  // Conflict Avoidance Banner on card
  conflictBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fef08a',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 2,
  },
  conflictText: {
    fontSize: 11,
    color: '#854d0e',
    fontWeight: '600',
    flex: 1,
  },

  // Card Action Buttons
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 6,
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#f8fafc',
  },
  cardActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },

  // Add Custom Slot Button
  addSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 8,
    backgroundColor: '#fafafa',
  },
  addSlotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },

  // Sticky Bottom Footer Bar
  modalFooterBar: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexShrink: 0,
  },
  secondaryBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    flex: 1,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  primaryBtn: {
    backgroundColor: '#7e37d8',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1.5,
  },
  primaryBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  primaryBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Floating Action Button (FAB) on Calendar Screen
  aiPlanFab: {
    position: 'absolute',
    bottom: 22,
    right: 22,
    backgroundColor: '#7e37d8',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 999,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 15px -3px rgba(126, 55, 216, 0.4), 0 4px 6px -4px rgba(126, 55, 216, 0.3)',
        cursor: 'pointer',
      },
      default: {
        elevation: 6,
      },
    }),
  },
  aiPlanFabText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

export default aiRoutineStyles;
