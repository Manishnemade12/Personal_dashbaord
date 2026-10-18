import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/theme';
import { api } from '../../api/client';
import { ScreenHeader, SearchInput, EmptyState } from '../../components/common';
import styles from './styles/apiScreenStyles';

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const METHOD_COLORS = {
  GET: '#3b82f6',
  POST: '#10b981',
  PUT: '#f59e0b',
  DELETE: '#ef4444',
  PATCH: '#8b5cf6',
};

export default function ApiManagementScreen({ onNavigate }) {
  const [apis, setApis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [copyNotice, setCopyNotice] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testingId, setTestingId] = useState(null);

  // Form Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingApi, setEditingApi] = useState(null);
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formMethod, setFormMethod] = useState('GET');
  const [formCategory, setFormCategory] = useState('General');
  const [formDescription, setFormDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchApis = async () => {
    try {
      setLoading(true);
      const res = await api.getApis();
      setApis(res?.data || []);
    } catch (err) {
      console.error('Error fetching APIs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApis();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(['All']);
    apis.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [apis]);

  const filteredApis = useMemo(() => {
    return apis.filter((item) => {
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name?.toLowerCase().includes(q) ||
        item.url?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [apis, selectedCategory, search]);

  const handleOpenAdd = () => {
    setEditingApi(null);
    setFormName('');
    setFormUrl('');
    setFormMethod('GET');
    setFormCategory('General');
    setFormDescription('');
    setModalVisible(true);
  };

  const handleOpenEdit = (item) => {
    setEditingApi(item);
    setFormName(item.name || '');
    setFormUrl(item.url || '');
    setFormMethod(item.method || 'GET');
    setFormCategory(item.category || 'General');
    setFormDescription(item.description || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formUrl.trim()) {
      Alert.alert('Required', 'Please provide both API Name and URL Endpoint.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formName.trim(),
        url: formUrl.trim(),
        method: formMethod,
        category: formCategory.trim() || 'General',
        description: formDescription.trim(),
      };

      if (editingApi) {
        await api.updateApi(editingApi._id, payload);
      } else {
        await api.createApi(payload);
      }

      setModalVisible(false);
      fetchApis();
    } catch (err) {
      Alert.alert('Error', err.message || 'Error saving API');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Delete API',
      `Delete "${item.name}" API endpoint?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteApi(item._id);
              fetchApis();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete API.');
            }
          },
        },
      ]
    );
  };

  const handleCopy = (url, id) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    setCopyNotice(id);
    setTimeout(() => setCopyNotice(null), 2000);
  };

  const handleTestEndpoint = async (item) => {
    setTestingId(item._id);
    setTestResult(null);
    const start = Date.now();
    try {
      const res = await fetch(item.url, { method: item.method || 'GET' });
      const elapsed = Date.now() - start;
      setTestResult({
        id: item._id,
        status: res.status,
        ok: res.ok,
        time: elapsed,
      });
    } catch (e) {
      setTestResult({
        id: item._id,
        status: 'Error',
        ok: false,
        error: e.message,
      });
    } finally {
      setTestingId(null);
    }
  };

  const headerElements = (
    <View>
      <ScreenHeader
        title="API Management"
        subtitle={`${apis.length} REST endpoints & integrations registered`}
        category="API HUB"
        iconName="server-outline"
        onBack={() => onNavigate && onNavigate('Dashboard')}
        backText="Dashboard"
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={fetchApis}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="refresh" size={16} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addBtn}
              onPress={handleOpenAdd}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color={colors.textLight} />
              <Text style={styles.addBtnText}>New API</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.filterBar}>
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by API name, URL or description..."
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={{ flex: 1 }}>
          {headerElements}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      ) : (
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
          {headerElements}
          {filteredApis.length === 0 ? (
            <EmptyState
              icon="server-outline"
              title="No APIs Found"
              description={search ? `No endpoints matching "${search}"` : 'Register your first API endpoint to track integrations.'}
              actionLabel="Add API"
              onAction={handleOpenAdd}
            />
          ) : (
            filteredApis.map((item) => {
              const methodColor = METHOD_COLORS[item.method] || colors.primary;
              const isCopied = copyNotice === item._id;
              const isTesting = testingId === item._id;
              const test = testResult?.id === item._id ? testResult : null;

              return (
                <View key={item._id} style={styles.apiCard}>
                  <View style={styles.apiTopRow}>
                    <View style={styles.apiNameWrap}>
                      <View style={[styles.methodBadge, { backgroundColor: methodColor + '18' }]}>
                        <Text style={[styles.methodText, { color: methodColor }]}>
                          {item.method || 'GET'}
                        </Text>
                      </View>
                      <Text style={styles.apiName} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>

                    <View style={styles.apiActions}>
                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() => handleOpenEdit(item)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="pencil-outline" size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionIconBtn, styles.deleteActionBtn]}
                        onPress={() => handleDelete(item)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="trash-outline" size={14} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.urlBar}>
                    <Text style={styles.urlText} numberOfLines={1}>
                      {item.url}
                    </Text>
                    <View style={styles.urlButtons}>
                      <TouchableOpacity
                        style={[styles.miniBtn, isCopied && styles.miniBtnSuccess]}
                        onPress={() => handleCopy(item.url, item._id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isCopied ? 'checkmark' : 'copy-outline'}
                          size={12}
                          color={isCopied ? colors.successText : colors.textSecondary}
                        />
                        <Text style={[styles.miniBtnText, isCopied && styles.miniBtnTextSuccess]}>
                          {isCopied ? 'Copied' : 'Copy'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.miniBtn}
                        onPress={() => handleTestEndpoint(item)}
                        disabled={isTesting}
                        activeOpacity={0.7}
                      >
                        {isTesting ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <>
                            <Ionicons name="flash-outline" size={12} color={colors.primary} />
                            <Text style={[styles.miniBtnText, { color: colors.primary }]}>Ping</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {test && (
                    <View style={[styles.testBox, { backgroundColor: test.ok ? colors.successBg : colors.dangerBg }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons
                          name={test.ok ? 'checkmark-circle' : 'close-circle'}
                          size={14}
                          color={test.ok ? colors.success : colors.danger}
                        />
                        <Text style={[styles.testStatusText, { color: test.ok ? colors.successText : colors.dangerText }]}>
                          HTTP {test.status} {test.ok ? 'OK' : 'Failed'}
                        </Text>
                      </View>
                      {test.time && (
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>{test.time}ms</Text>
                      )}
                    </View>
                  )}

                  <View style={styles.apiFooter}>
                    <Text style={styles.apiDesc} numberOfLines={2}>
                      {item.description || 'No description provided'}
                    </Text>
                    {item.category ? (
                      <View style={styles.catBadge}>
                        <Text style={styles.catBadgeText}>{item.category}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Form Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingApi ? 'Edit API Endpoint' : 'Register API Endpoint'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginBottom: 12 }}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Endpoint Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Fetch Portfolio Blogs"
                  value={formName}
                  onChangeText={setFormName}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>URL Endpoint *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://api.example.com/v1/blogs"
                  value={formUrl}
                  onChangeText={setFormUrl}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>HTTP Method</Text>
                <View style={styles.methodSelector}>
                  {METHODS.map((m) => {
                    const isSelected = formMethod === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[styles.methodOption, isSelected && styles.methodOptionSelected]}
                        onPress={() => setFormMethod(m)}
                      >
                        <Text style={[styles.methodOptionText, isSelected && styles.methodOptionTextSelected]}>
                          {m}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Authentication, Portfolio, Financial"
                  value={formCategory}
                  onChangeText={setFormCategory}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
                  placeholder="Endpoint parameters, response schema, rate limits..."
                  value={formDescription}
                  onChangeText={setFormDescription}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSave}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color={colors.textLight} size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {editingApi ? 'Update API' : 'Register API'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
