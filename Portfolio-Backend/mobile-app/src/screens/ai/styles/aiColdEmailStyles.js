import { StyleSheet, Platform } from 'react-native';
import { colors, spacing, radii, typography } from '../../../styles/theme';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: spacing.sm,
    paddingBottom: spacing.xxl + 40,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },

  // Grok Banner Pill
  grokBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(126, 55, 216, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(126, 55, 216, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  grokBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7e37d8',
  },

  // =========================================================================
  // CONVERSATION MANAGEMENT BAR
  // =========================================================================
  convoBarWrapper: {
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' },
      default: { elevation: 1 },
    }),
  },
  convoBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  convoBarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  convoBarTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  convoCountBadge: {
    backgroundColor: 'rgba(126, 55, 216, 0.1)',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: radii.pill,
  },
  convoCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7e37d8',
  },
  newConvoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#7e37d8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  newConvoBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Conversation Pills Horizontal List
  convoScroll: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  convoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  convoPillActive: {
    backgroundColor: '#7e37d8',
    borderColor: '#7e37d8',
    ...Platform.select({
      web: { boxShadow: '0 2px 6px rgba(126, 55, 216, 0.3)' },
      default: { elevation: 2 },
    }),
  },
  convoPillTitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textSecondary,
    maxWidth: 130,
  },
  convoPillTitleActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  resumeIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  convoPillDelBtn: {
    marginLeft: 2,
    padding: 2,
  },

  // Active Conversation Info Bar
  activeConvoInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  activeConvoTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  renameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
    backgroundColor: colors.surfaceAlt,
  },
  renameBtnText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // =========================================================================
  // PER-CONVERSATION RESUME CARD
  // =========================================================================
  resumeCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' },
      default: { elevation: 1 },
    }),
  },
  resumeCardAttached: {
    borderColor: 'rgba(16, 185, 129, 0.35)',
    backgroundColor: 'rgba(16, 185, 129, 0.02)',
  },
  resumeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  resumeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  resumeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(126, 55, 216, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resumeIconWrapSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  resumeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  resumeSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  resumeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  resumeStatusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  resumeSnippetBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resumeSnippetText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  resumeActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  resumeActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
  },
  resumeActionBtnPrimary: {
    backgroundColor: '#7e37d8',
    borderColor: '#7e37d8',
  },
  resumeActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  resumeActionTextPrimary: {
    color: '#ffffff',
  },
  resumeNoticeBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: radii.sm,
    padding: 9,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  resumeNoticeText: {
    fontSize: 11,
    color: '#b45309',
    lineHeight: 16,
  },

  // =========================================================================
  // MAIN INPUT CARD
  // =========================================================================
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' },
      default: {
        elevation: 1,
        shadowColor: colors.shadows.card,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
    }),
  },

  // Mode Switch Tabs (Text vs Screenshot)
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
    padding: 3,
    marginBottom: 12,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: radii.xs,
  },
  tabBtnActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...Platform.select({
      web: { boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)' },
      default: { elevation: 1 },
    }),
  },
  tabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  // Form Fields
  formGroup: {
    marginBottom: 10,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  sublabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 12,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    lineHeight: 18,
  },

  // Screenshot Upload Zone
  uploadZone: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: 'rgba(126, 55, 216, 0.3)',
    borderStyle: 'dashed',
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadZoneIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(126, 55, 216, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  uploadZoneTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  uploadZoneSub: {
    fontSize: 10.5,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 10,
  },
  uploadPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  uploadPillBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Uploaded Image Preview
  previewWrap: {
    borderRadius: radii.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    backgroundColor: '#0f172a',
  },
  previewImage: {
    width: '100%',
    height: 180,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeImageText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  ocrSuccessTag: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: radii.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ocrSuccessText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '700',
  },

  // Tone Selector
  toneRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  tonePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tonePillActive: {
    backgroundColor: '#7e37d8',
    borderColor: '#7e37d8',
  },
  toneText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toneTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // Primary Action Button (Generate)
  generateBtn: {
    backgroundColor: '#7e37d8',
    borderRadius: radii.sm,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(126, 55, 216, 0.25)' },
      default: { elevation: 2 },
    }),
  },
  generateBtnDisabled: {
    opacity: 0.7,
  },
  generateBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // =========================================================================
  // RESULT SECTION
  // =========================================================================
  resultSection: {
    marginTop: 4,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statusPillSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  statusTextSuccess: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.successText,
  },

  subjectBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  subjectInput: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.xs,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
  },

  bodyBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  bodyInput: {
    fontSize: 12,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.xs,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 180,
    lineHeight: 18,
    marginTop: 4,
  },

  highlightsBox: {
    backgroundColor: 'rgba(126, 55, 216, 0.05)',
    borderRadius: radii.sm,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(126, 55, 216, 0.15)',
  },
  highlightsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7e37d8',
    marginBottom: 4,
  },
  highlightItem: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
    paddingLeft: 4,
  },

  gmailHeroBtn: {
    backgroundColor: '#ea4335',
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
    ...Platform.select({
      web: { boxShadow: '0 3px 10px rgba(234, 67, 53, 0.3)' },
      default: { elevation: 3 },
    }),
  },
  gmailHeroBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: 8,
  },
  secondaryBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // =========================================================================
  // SAVED EMAILS IN CONVERSATION HISTORY
  // =========================================================================
  historySection: {
    marginTop: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  draftCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  draftSubject: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 6,
  },
  draftDate: {
    fontSize: 10,
    color: colors.textMuted,
  },
  draftSnippet: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
    marginBottom: 6,
  },
  draftFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  draftActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
    backgroundColor: colors.surfaceAlt,
  },
  draftActionText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.primary,
  },

  // =========================================================================
  // MODALS (RESUME VIEW/EDIT & RENAME)
  // =========================================================================
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 9999,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    width: '100%',
    maxWidth: 620,
    maxHeight: '90%',
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      web: { boxShadow: '0 8px 32px rgba(15, 23, 42, 0.25)' },
      default: { elevation: 8 },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalTextArea: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 12,
    color: colors.textPrimary,
    minHeight: 220,
    maxHeight: 350,
    textAlignVertical: 'top',
    lineHeight: 18,
    marginBottom: 10,
  },
  modalWordCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalWordCountText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.sm,
    backgroundColor: '#7e37d8',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalSaveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#0f172a',
    borderRadius: radii.md,
    paddingVertical: 9,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 8,
    zIndex: 10000,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
