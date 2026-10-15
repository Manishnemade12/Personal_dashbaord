import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import { colors } from '../../constants/theme';
import { api } from '../../api/client';
import { Ionicons } from '@expo/vector-icons';

export default function ContactsScreen() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  const fetchContacts = async () => {
    try {
      const data = await api.getContacts();
      setContacts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log('Error fetching contacts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const renderContactItem = ({ item }) => {
    const name = item.name || item.fullname || 'Anonymous';
    const email = item.email || 'No email';
    const subject = Array.isArray(item.project) ? item.project.join(', ') : (item.project || item.subject || 'Portfolio Inquiry');
    const message = item.description || item.message || '';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => setSelectedContact(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.nameWrap}>
            <Text style={styles.nameText}>{name}</Text>
            <Text style={styles.emailText}>{email}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Inquiry</Text>
          </View>
        </View>

        <Text style={styles.subjectText} numberOfLines={1}>
          Subject: {subject}
        </Text>
        <Text style={styles.messagePreview} numberOfLines={2}>
          {message}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.headingTitle}>
            Contact <Text style={styles.headingSpan}>Requests</Text>
          </Text>
          <Text style={styles.headingSubtitle}>ADMIN PANEL</Text>
        </View>
        <View style={styles.badgeCount}>
          <Text style={styles.badgeCountText}>{contacts.length} Total</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={renderContactItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchContacts(); }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="mail-unread-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No inquiries received yet</Text>
            </View>
          }
        />
      )}

      {/* Detail Modal */}
      {selectedContact && (
        <Modal
          visible={!!selectedContact}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedContact(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Message Details</Text>
                <TouchableOpacity onPress={() => setSelectedContact(null)}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>From:</Text>
                <Text style={styles.detailValue}>
                  {selectedContact.name || selectedContact.fullname || 'Anonymous'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Email:</Text>
                <TouchableOpacity
                  onPress={() => Linking.openURL(`mailto:${selectedContact.email}`)}
                >
                  <Text style={[styles.detailValue, { color: colors.primary }]}>
                    {selectedContact.email || 'N/A'}
                  </Text>
                </TouchableOpacity>
              </View>

              {selectedContact.phone ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailValue}>{selectedContact.phone}</Text>
                </View>
              ) : null}

              {selectedContact.project || selectedContact.subject ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Project:</Text>
                  <Text style={styles.detailValue}>
                    {selectedContact.project || selectedContact.subject}
                  </Text>
                </View>
              ) : null}

              <Text style={styles.msgHeader}>Message:</Text>
              <View style={styles.msgBox}>
                <Text style={styles.msgBody}>{selectedContact.description || selectedContact.message || 'No message'}</Text>
              </View>

              {selectedContact.email ? (
                <TouchableOpacity
                  style={styles.replyBtn}
                  onPress={() => Linking.openURL(`mailto:${selectedContact.email}`)}
                >
                  <Ionicons name="mail" size={18} color="#ffffff" />
                  <Text style={styles.replyBtnText}>Reply via Email</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headingTitle: {
    color: '#7e37d8',
    fontSize: 24,
    fontWeight: '800',
  },
  headingSpan: {
    color: '#000000',
  },
  headingSubtitle: {
    color: '#7e37d8',
    letterSpacing: 3,
    fontWeight: '700',
    fontSize: 12,
    marginTop: 2,
  },
  badgeCount: {
    backgroundColor: '#eee8fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeCountText: {
    color: '#5f22db',
    fontWeight: '700',
    fontSize: 13,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  nameWrap: {
    flex: 1,
  },
  nameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  emailText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d97706',
  },
  subjectText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  messagePreview: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 15,
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    width: 70,
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  msgHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 10,
    marginBottom: 6,
  },
  msgBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  msgBody: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  replyBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  replyBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
