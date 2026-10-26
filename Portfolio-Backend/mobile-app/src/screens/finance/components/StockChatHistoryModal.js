import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Format ISO date string into readable Date & Time
 */
function formatSessionDateTime(isoStr) {
  if (!isoStr) return 'Recent';
  try {
    const d = new Date(isoStr);
    const datePart = d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timePart = d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${datePart} • ${timePart}`;
  } catch (e) {
    return String(isoStr);
  }
}

export default function StockChatHistoryModal({
  visible,
  onClose,
  sessions = [],
  loading = false,
  currentSessionId = null,
  onSelectSession,
  onDeleteSession,
  onNewChat,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          {/* Header */}
          <View style={modalStyles.headerRow}>
            <View style={modalStyles.headerLeft}>
              <View style={modalStyles.iconWrap}>
                <Ionicons name="time" size={18} color="#7e37d8" />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={modalStyles.title}>Stock Chat History</Text>
                <Text style={modalStyles.subTitle}>
                  {sessions.length} saved session{sessions.length === 1 ? '' : 's'} with date & time
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {onNewChat && (
                <TouchableOpacity
                  style={modalStyles.newChatHeaderBtn}
                  onPress={() => {
                    onClose();
                    onNewChat();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={14} color="#ffffff" />
                  <Text style={modalStyles.newChatHeaderBtnText}>New</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onClose}
                style={modalStyles.closeBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Body Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={modalStyles.scrollBody}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {loading ? (
              <View style={modalStyles.loadingWrap}>
                <ActivityIndicator size="small" color="#7e37d8" />
                <Text style={modalStyles.loadingText}>Loading saved analysis sessions...</Text>
              </View>
            ) : sessions.length === 0 ? (
              <View style={modalStyles.emptyWrap}>
                <View style={modalStyles.emptyIconWrap}>
                  <Ionicons name="chatbubble-ellipses-outline" size={28} color="#7e37d8" />
                </View>
                <Text style={modalStyles.emptyTitle}>No Saved Sessions Yet</Text>
                <Text style={modalStyles.emptySub}>
                  Conversations and multi-stock strategies are automatically saved to MongoDB as you chat with AI!
                </Text>
                {onNewChat && (
                  <TouchableOpacity
                    style={modalStyles.emptyActionBtn}
                    onPress={() => {
                      onClose();
                      onNewChat();
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="sparkles" size={14} color="#ffffff" />
                    <Text style={modalStyles.emptyActionBtnText}>Start First Stock Chat</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              sessions.map((sess) => {
                const isCurrent = currentSessionId === sess._id;
                const formattedTime = formatSessionDateTime(sess.updatedAt || sess.createdAt);

                return (
                  <View
                    key={sess._id}
                    style={[
                      modalStyles.sessionCard,
                      isCurrent && modalStyles.sessionCardActive,
                    ]}
                  >
                    <TouchableOpacity
                      style={{ flex: 1 }}
                      onPress={() => {
                        onClose();
                        onSelectSession(sess);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={modalStyles.sessionCardTop}>
                        <Text style={modalStyles.sessionTitle} numberOfLines={1}>
                          {sess.title || 'Stock Portfolio Chat'}
                        </Text>
                        {isCurrent && (
                          <View style={modalStyles.activeBadge}>
                            <Text style={modalStyles.activeBadgeText}>Active</Text>
                          </View>
                        )}
                      </View>

                      {/* Stock Pills Row */}
                      {Array.isArray(sess.selectedStocks) && sess.selectedStocks.length > 0 && (
                        <View style={modalStyles.stocksPillRow}>
                          {sess.selectedStocks.map((stk, idx) => (
                            <View key={idx} style={modalStyles.stockPill}>
                              <Text style={modalStyles.stockPillText}>
                                {stk.symbolOrCode || stk.instrumentName}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Metadata Row: Date & Time + Message Count */}
                      <View style={modalStyles.metaRow}>
                        <View style={modalStyles.dateTimeWrap}>
                          <Ionicons name="calendar-outline" size={11} color="#64748b" />
                          <Text style={modalStyles.dateTimeText}>{formattedTime}</Text>
                        </View>
                        <Text style={modalStyles.dotSep}>•</Text>
                        <View style={modalStyles.msgCountWrap}>
                          <Ionicons name="chatbubbles-outline" size={11} color="#64748b" />
                          <Text style={modalStyles.msgCountText}>
                            {sess.messageCount || 0} message{sess.messageCount === 1 ? '' : 's'}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Delete Session Button */}
                    <TouchableOpacity
                      style={modalStyles.deleteBtn}
                      onPress={() => onDeleteSession(sess._id)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="trash-outline" size={15} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Footer */}
          <View style={modalStyles.footerRow}>
            {onNewChat && (
              <TouchableOpacity
                style={modalStyles.newChatFullBtn}
                onPress={() => {
                  onClose();
                  onNewChat();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="sparkles" size={14} color="#7e37d8" />
                <Text style={modalStyles.newChatFullBtnText}>Start New Stock Analysis Chat</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={modalStyles.closeActionBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={modalStyles.closeActionBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
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
    paddingVertical: 14,
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
    marginRight: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  subTitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  newChatHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7e37d8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 3,
  },
  newChatHeaderBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
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
    paddingTop: 14,
    flex: 1,
  },
  loadingWrap: {
    padding: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
  },
  emptyWrap: {
    padding: 30,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 11.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7e37d8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  emptyActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  sessionCardActive: {
    borderColor: '#7e37d8',
    backgroundColor: '#faf5ff',
  },
  sessionCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sessionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
    marginRight: 6,
  },
  activeBadge: {
    backgroundColor: '#7e37d8',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
  },
  stocksPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  stockPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stockPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateTimeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dateTimeText: {
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '500',
  },
  dotSep: {
    fontSize: 10,
    color: '#cbd5e1',
    marginHorizontal: 4,
  },
  msgCountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  msgCountText: {
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '500',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  footerRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    gap: 10,
  },
  newChatFullBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  newChatFullBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#7e37d8',
  },
  closeActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
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
