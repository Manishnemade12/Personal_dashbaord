import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Linking,
  ScrollView,
} from 'react-native';
import { colors } from '../../styles/theme';
import { api } from '../../api/client';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, EmptyState } from '../../components/common';
import styles from './styles/contactsStyles';

export default function ContactsScreen({ onNavigate }) {
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
      <ScreenHeader
        title="Contact Inquiries"
        subtitle="Manage client inquiries, project proposals & messages"
        category="COMMUNICATION"
        iconName="mail-outline"
        onBack={() => onNavigate && onNavigate('Dashboard')}
        backText="Dashboard"
        rightAction={
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{contacts.length} Total</Text>
          </View>
        }
      />

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={renderContactItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchContacts();
              }}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="mail-unread-outline"
              title="No Inquiries Yet"
              description="Messages sent through your public portfolio contact form will appear here."
            />
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
                <Text style={styles.modalTitle}>Inquiry Details</Text>
                <TouchableOpacity onPress={() => setSelectedContact(null)}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Sender:</Text>
                <Text style={styles.detailValue}>
                  {selectedContact.name || selectedContact.fullname || 'Anonymous'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Email:</Text>
                <TouchableOpacity
                  onPress={() => Linking.openURL(`mailto:${selectedContact.email}`).catch(() => {})}
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
                  <Text style={styles.detailLabel}>Subject:</Text>
                  <Text style={styles.detailValue}>
                    {selectedContact.project || selectedContact.subject}
                  </Text>
                </View>
              ) : null}

              <Text style={styles.msgHeader}>Message:</Text>
              <ScrollView style={styles.msgBox}>
                <Text style={styles.msgBody}>
                  {selectedContact.description || selectedContact.message || 'No message content provided.'}
                </Text>
              </ScrollView>

              {selectedContact.email ? (
                <TouchableOpacity
                  style={styles.replyBtn}
                  onPress={() => Linking.openURL(`mailto:${selectedContact.email}`).catch(() => {})}
                  activeOpacity={0.8}
                >
                  <Ionicons name="mail" size={16} color={colors.textLight} />
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
