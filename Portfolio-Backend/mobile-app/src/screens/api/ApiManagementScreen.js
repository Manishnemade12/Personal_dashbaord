import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const METHOD_COLORS = {
  GET: '#3b82f6',
  POST: '#10b981',
  PUT: '#f59e0b',
  DELETE: '#ef4444',
  PATCH: '#8b5cf6',
};

export default function ApiManagementScreen({ onNavigate }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

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
      alert('Please provide both API Name and URL Endpoint.');
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
      alert(err.message || 'Error saving API');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (item) => {
    const doDelete = async () => {
      try {
        await api.deleteApi(item._id);
        fetchApis();
      } catch (err) {
        alert(err.message || 'Error deleting API');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${item.name}" API endpoint?`)) {
        doDelete();
      }
    } else {
      Alert.alert('Delete API', `Are you sure you want to delete "${item.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
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

  return (
    <View style={styles.container}>
      {/* 1. Header Toolbar */}
      <View style={[styles.headerToolbar, isMobile && styles.headerToolbarMobile]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => onNavigate && onNavigate('Dashboard')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={16} color="#0f172a" />
            <Text style={styles.backBtnText}>Dashboard</Text>
          </TouchableOpacity>
          <View style={styles.titleDivider} />
          <View>
            <Text style={styles.screenTitle}>API Management</Text>
            <Text style={styles.screenSubtitle}>
              {apis.length} REST endpoints & API registry
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={fetchApis}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={15} color="#3b82f6" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleOpenAdd}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={17} color="#ffffff" />
            <Text style={styles.addBtnText}>New API</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Search & Category Filters */}
      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search API by name, URL or description..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

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

      {/* 3. API Cards List */}
      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading registered APIs...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
          {filteredApis.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="server-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No APIs Found</Text>
              <Text style={styles.emptySubtitle}>
                {search ? 'Try clearing your search query' : 'Register your first API endpoint'}
              </Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={handleOpenAdd}>
                <Ionicons name="add" size={16} color="#ffffff" />
                <Text style={styles.emptyAddBtnText}>Add API</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.apiGrid}>
              {filteredApis.map((item) => {
                const methodColor = METHOD_COLORS[item.method] || '#3b82f6';
                const isCopied = copyNotice === item._id;
                const isTesting = testingId === item._id;
                const test = testResult?.id === item._id ? testResult : null;

                return (
                  <View key={item._id} style={styles.apiCard}>
                    {/* Top Row: Method & Name & Actions */}
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
                        >
                          <Ionicons name="pencil-outline" size={15} color="#475569" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionIconBtn, styles.deleteActionBtn]}
                          onPress={() => handleDelete(item)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={15} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* URL Endpoint Bar */}
                    <View style={styles.urlBar}>
                      <Text style={styles.urlText} numberOfLines={1}>
                        {item.url}
                      </Text>
                      <View style={styles.urlButtons}>
                        <TouchableOpacity
                          style={[styles.miniCopyBtn, isCopied && styles.miniCopyBtnSuccess]}
                          onPress={() => handleCopy(item.url, item._id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={isCopied ? 'checkmark' : 'copy-outline'}
                            size={13}
                            color={isCopied ? '#166534' : '#475569'}
                          />
                          <Text style={[styles.miniCopyText, isCopied && styles.miniCopyTextSuccess]}>
                            {isCopied ? 'Copied' : 'Copy'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.miniTestBtn}
                          onPress={() => handleTestEndpoint(item)}
                          disabled={isTesting}
                          activeOpacity={0.7}
                        >
                          {isTesting ? (
                            <ActivityIndicator size="small" color="#3b82f6" />
                          ) : (
                            <>
                              <Ionicons name="flash-outline" size={13} color="#3b82f6" />
                              <Text style={styles.miniTestText}>Ping</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Ping Result if tested */}
                    {test && (
                      <View style={[styles.testBox, { backgroundColor: test.ok ? '#f0fdf4' : '#fef2f2' }]}>
                        <View style={styles.testLeft}>
                          <Ionicons
                            name={test.ok ? 'checkmark-circle' : 'close-circle'}
                            size={14}
                            color={test.ok ? '#16a34a' : '#ef4444'}
                          />
                          <Text style={[styles.testStatusText, { color: test.ok ? '#166534' : '#991b1b' }]}>
                            HTTP {test.status} {test.ok ? 'OK' : 'Failed'}
                          </Text>
                        </View>
                        {test.time && (
                          <Text style={styles.testTimeText}>{test.time}ms</Text>
                        )}
                      </View>
                    )}

                    {/* Description & Category Footer */}
                    <View style={styles.apiFooter}>
                      {item.description ? (
                        <Text style={styles.apiDesc} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : (
                        <Text style={[styles.apiDesc, { fontStyle: 'italic', color: '#94a3b8' }]}>
                          No description provided
                        </Text>
                      )}

                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>
                          {item.category || 'General'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* 4. Create / Edit API Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, isMobile && { width: '92%', maxWidth: '100%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name={editingApi ? 'create-outline' : 'add-circle-outline'} size={20} color="#3b82f6" />
                <Text style={styles.modalTitle}>{editingApi ? 'Edit API Endpoint' : 'Register New API'}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>API Name *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. Get User Profile"
                  value={formName}
                  onChangeText={setFormName}
                />
              </View>

              {/* URL */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Endpoint URL *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. /api/prof or https://api.example.com/v1"
                  value={formUrl}
                  onChangeText={setFormUrl}
                  autoCapitalize="none"
                />
              </View>

              {/* Method Selector */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>HTTP Method</Text>
                <View style={styles.methodSelector}>
                  {METHODS.map((m) => {
                    const isSelected = formMethod === m;
                    const color = METHOD_COLORS[m];
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[
                          styles.methodOption,
                          isSelected && { backgroundColor: color, borderColor: color },
                        ]}
                        onPress={() => setFormMethod(m)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.methodOptionText, isSelected && { color: '#ffffff' }]}>
                          {m}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Category */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Category / Module</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. Authentication, Portfolio, Utilities"
                  value={formCategory}
                  onChangeText={setFormCategory}
                />
              </View>

              {/* Description */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.fieldInput, { height: 70, textAlignVertical: 'top' }]}
                  placeholder="Brief summary of what this endpoint provides..."
                  value={formDescription}
                  onChangeText={setFormDescription}
                  multiline
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveBtnText}>{editingApi ? 'Update API' : 'Create API'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerToolbar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerToolbarMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  titleDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
  screenTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  screenSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Filters
  filterBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    padding: 0,
  },
  categoryScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryPillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  categoryTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // Content
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 16,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  emptyAddBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },

  // Cards
  apiGrid: {
    gap: 12,
  },
  apiCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    gap: 10,
  },
  apiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  apiNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  methodBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  methodText: {
    fontSize: 10,
    fontWeight: '800',
  },
  apiName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  apiActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  deleteActionBtn: {
    backgroundColor: '#fef2f2',
  },

  // URL Bar
  urlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  urlText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: '#334155',
    flex: 1,
  },
  urlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  miniCopyBtnSuccess: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  miniCopyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  miniCopyTextSuccess: {
    color: '#166534',
  },
  miniTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  miniTestText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3b82f6',
  },

  // Test result
  testBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  testLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  testStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  testTimeText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },

  // Footer
  apiFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    paddingTop: 8,
  },
  apiDesc: {
    fontSize: 11,
    color: '#64748b',
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  categoryBadgeText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    width: 480,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
  },
  methodSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  methodOption: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  methodOptionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    minWidth: 90,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
