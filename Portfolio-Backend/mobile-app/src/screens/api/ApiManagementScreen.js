import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components/common';
import styles from './styles/apiManagementStyles';

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const METHOD_COLORS = {
  GET: '#3b82f6',    // Blue
  POST: '#10b981',   // Emerald Green
  PUT: '#f59e0b',    // Amber
  DELETE: '#ef4444', // Red
  PATCH: '#8b5cf6',  // Purple
};

const COMMON_CATEGORIES = [
  'General',
  'Authentication',
  'Portfolio',
  'Study Hub',
  'AI Services',
  'Finance',
  'Calendar',
];

export default function ApiManagementScreen({ onNavigate }) {
  const [apis, setApis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMethod, setSelectedMethod] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Copy & Interaction State
  const [copiedId, setCopiedId] = useState(null);
  const [copiedCurlId, setCopiedCurlId] = useState(null);
  const [revealedUrls, setRevealedUrls] = useState({});
  const [testResults, setTestResults] = useState({});
  const [testingIds, setTestingIds] = useState({});
  const [toastMessage, setToastMessage] = useState(null);

  // Form Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingApi, setEditingApi] = useState(null);
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formMethod, setFormMethod] = useState('GET');
  const [formCategory, setFormCategory] = useState('General');
  const [formStatus, setFormStatus] = useState('active');
  const [formDescription, setFormDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

  const fetchApis = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getApis();
      setApis(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Error fetching APIs:', err);
      showToast('⚠️ Could not load endpoints');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApis();
  }, [fetchApis]);

  // Derived Categories
  const categories = useMemo(() => {
    const set = new Set(['All']);
    apis.forEach((item) => {
      if (item.category && item.category.trim()) {
        set.add(item.category.trim());
      }
    });
    return Array.from(set);
  }, [apis]);

  // Metrics & Stats
  const stats = useMemo(() => {
    const total = apis.length;
    const methodCounts = { GET: 0, POST: 0, PUT: 0, DELETE: 0, PATCH: 0 };
    let activeCount = 0;

    apis.forEach((item) => {
      const m = (item.method || 'GET').toUpperCase();
      if (methodCounts[m] !== undefined) methodCounts[m]++;
      if (item.status === 'active' || !item.status) activeCount++;
    });

    return {
      total,
      activeCount,
      methodCounts,
      categoriesCount: categories.length - 1, // exclude 'All'
    };
  }, [apis, categories]);

  // Filtered APIs
  const filteredApis = useMemo(() => {
    return apis.filter((item) => {
      // Category filter
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }
      // Method filter
      if (selectedMethod !== 'ALL' && (item.method || 'GET').toUpperCase() !== selectedMethod) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'ALL' && (item.status || 'active') !== selectedStatus) {
        return false;
      }
      // Search query
      const q = search.toLowerCase().trim();
      if (q) {
        const nameMatch = item.name?.toLowerCase().includes(q);
        const urlMatch = item.url?.toLowerCase().includes(q);
        const descMatch = item.description?.toLowerCase().includes(q);
        const catMatch = item.category?.toLowerCase().includes(q);
        if (!nameMatch && !urlMatch && !descMatch && !catMatch) {
          return false;
        }
      }
      return true;
    });
  }, [apis, selectedCategory, selectedMethod, selectedStatus, search]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingApi(null);
    setFormName('');
    setFormUrl('');
    setFormMethod('GET');
    setFormCategory('General');
    setFormStatus('active');
    setFormDescription('');
    setModalVisible(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setEditingApi(item);
    setFormName(item.name || '');
    setFormUrl(item.url || '');
    setFormMethod(item.method || 'GET');
    setFormCategory(item.category || 'General');
    setFormStatus(item.status || 'active');
    setFormDescription(item.description || '');
    setModalVisible(true);
  };

  // Save (Create or Update)
  const handleSave = async () => {
    if (!formName.trim() || !formUrl.trim()) {
      Alert.alert('Required', 'Please provide both Endpoint Name and URL / Key.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formName.trim(),
        url: formUrl.trim(),
        method: formMethod,
        category: formCategory.trim() || 'General',
        status: formStatus || 'active',
        description: formDescription.trim(),
      };

      if (editingApi) {
        await api.updateApi(editingApi._id, payload);
        showToast('✓ Endpoint updated successfully');
      } else {
        await api.createApi(payload);
        showToast('✓ New endpoint registered');
      }

      setModalVisible(false);
      fetchApis();
    } catch (err) {
      Alert.alert('Error', err.message || 'Error saving API');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete
  const handleDelete = (item) => {
    Alert.alert(
      'Delete Endpoint',
      `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteApi(item._id);
              showToast('✓ Endpoint removed');
              fetchApis();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete API.');
            }
          },
        },
      ]
    );
  };

  // Copy URL
  const handleCopyUrl = (url, id) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    setCopiedId(id);
    showToast('✓ URL copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Generate & Copy cURL
  const handleCopyCurl = (item) => {
    const method = item.method || 'GET';
    const curlCmd = `curl -X ${method} "${item.url}" -H "Content-Type: application/json"`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(curlCmd);
    }
    setCopiedCurlId(item._id);
    showToast('✓ cURL command copied');
    setTimeout(() => setCopiedCurlId(null), 2000);
  };

  // Toggle mask/reveal for sensitive URLs / tokens
  const toggleReveal = (id) => {
    setRevealedUrls((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Ping / Live Latency Test
  const handleTestEndpoint = async (item) => {
    const id = item._id;
    setTestingIds((prev) => ({ ...prev, [id]: true }));
    const start = Date.now();

    try {
      // Direct HTTP probe
      const res = await fetch(item.url, {
        method: item.method || 'GET',
        headers: { Accept: 'application/json' },
      });
      const elapsed = Date.now() - start;

      let snippet = '';
      try {
        const text = await res.text();
        snippet = text.slice(0, 200);
      } catch (tErr) {}

      setTestResults((prev) => ({
        ...prev,
        [id]: {
          status: res.status,
          statusText: res.statusText || (res.ok ? 'OK' : 'Error'),
          ok: res.ok,
          time: elapsed,
          snippet,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      }));
    } catch (e) {
      const elapsed = Date.now() - start;
      setTestResults((prev) => ({
        ...prev,
        [id]: {
          status: 'ERR',
          statusText: e.message?.slice(0, 45) || 'Network Connection Failed',
          ok: false,
          time: elapsed,
          snippet: '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      }));
    } finally {
      setTestingIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Open in browser (if valid URL)
  const handleOpenExternal = (url) => {
    if (!url) return;
    const cleanUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(cleanUrl, '_blank');
    } else {
      Linking.openURL(cleanUrl).catch(() => {
        Alert.alert('Cannot Open', 'Invalid URL endpoint format.');
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Toast Notification */}
      {toastMessage && (
        <View
          style={{
            position: 'absolute',
            top: 14,
            alignSelf: 'center',
            zIndex: 9999,
            backgroundColor: '#10b981',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            shadowColor: '#000',
            shadowOpacity: 0.3,
            shadowRadius: 5,
            elevation: 6,
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 12.5, fontWeight: '700' }}>
            {toastMessage}
          </Text>
        </View>
      )}

      {/* Screen Header */}
      <ScreenHeader
        title="API Management Studio"
        subtitle={`${apis.length} REST endpoints & integrations tracked`}
        category="DEVELOPER SUITE"
        iconName="server-outline"
        onBack={() => onNavigate && onNavigate('Dashboard')}
        backText="Dashboard"
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={fetchApis}
              activeOpacity={0.7}
              accessibilityLabel="Refresh APIs"
            >
              <Ionicons name="refresh" size={16} color="#818cf8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addBtn}
              onPress={handleOpenAdd}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#ffffff" />
              <Text style={styles.addBtnText}>New Endpoint</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
        {/* ========================================================= */}
        {/* 1. HERO METRICS & STATS BAR                                */}
        {/* ========================================================= */}
        <View style={styles.statsGrid}>
          {/* Card 1: Total Endpoints */}
          <View style={styles.statCard}>
            <View style={styles.statCardTop}>
              <Text style={styles.statLabel}>Total APIs</Text>
              <View style={[styles.statIconWrap, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                <Ionicons name="layers-outline" size={15} color="#818cf8" />
              </View>
            </View>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statSubtitle}>Registered Endpoints</Text>
          </View>

          {/* Card 2: Active / Operational */}
          <View style={styles.statCard}>
            <View style={styles.statCardTop}>
              <Text style={styles.statLabel}>Active Status</Text>
              <View style={[styles.statIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="checkmark-circle-outline" size={15} color="#10b981" />
              </View>
            </View>
            <Text style={[styles.statValue, { color: '#10b981' }]}>{stats.activeCount}</Text>
            <Text style={styles.statSubtitle}>Live & Accessible</Text>
          </View>

          {/* Card 3: GET vs POST breakdown */}
          <View style={styles.statCard}>
            <View style={styles.statCardTop}>
              <Text style={styles.statLabel}>Methods</Text>
              <View style={[styles.statIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Ionicons name="code-slash-outline" size={15} color="#3b82f6" />
              </View>
            </View>
            <Text style={styles.statValue}>
              {stats.methodCounts.GET} <Text style={{ fontSize: 13, color: '#64748b' }}>GET</Text> · {stats.methodCounts.POST} <Text style={{ fontSize: 13, color: '#64748b' }}>POST</Text>
            </Text>
            <Text style={styles.statSubtitle}>REST Distribution</Text>
          </View>

          {/* Card 4: Categories */}
          <View style={styles.statCard}>
            <View style={styles.statCardTop}>
              <Text style={styles.statLabel}>Categories</Text>
              <View style={[styles.statIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Ionicons name="folder-open-outline" size={15} color="#f59e0b" />
              </View>
            </View>
            <Text style={styles.statValue}>{stats.categoriesCount}</Text>
            <Text style={styles.statSubtitle}>Organized Modules</Text>
          </View>
        </View>

        {/* ========================================================= */}
        {/* 2. SEARCH & MULTI-AXIS FILTER SECTION                      */}
        {/* ========================================================= */}
        <View style={styles.filterSection}>
          {/* Search Input Bar */}
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={16} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by endpoint name, URL path, or category..."
              placeholderTextColor="#64748b"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} style={styles.searchClearBtn}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* HTTP Method Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <View style={styles.filterPills}>
              <TouchableOpacity
                style={[styles.filterPill, selectedMethod === 'ALL' && styles.filterPillActive]}
                onPress={() => setSelectedMethod('ALL')}
              >
                <Text style={[styles.filterPillText, selectedMethod === 'ALL' && styles.filterPillTextActive]}>
                  ALL METHODS
                </Text>
              </TouchableOpacity>

              {METHODS.map((m) => {
                const isSelected = selectedMethod === m;
                const mColor = METHOD_COLORS[m];
                return (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.filterPill,
                      isSelected && { backgroundColor: mColor, borderColor: mColor },
                    ]}
                    onPress={() => setSelectedMethod(isSelected ? 'ALL' : m)}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        { color: isSelected ? '#ffffff' : mColor },
                      ]}
                    >
                      {m}
                    </Text>
                    {stats.methodCounts[m] > 0 && (
                      <View style={styles.filterBadge}>
                        <Text style={[styles.filterBadgeText, isSelected && { color: '#ffffff' }]}>
                          {stats.methodCounts[m]}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Category Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <View style={styles.filterPills}>
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.filterPill, isSelected && styles.filterPillActive]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Ionicons
                      name="folder-outline"
                      size={12}
                      color={isSelected ? '#ffffff' : '#64748b'}
                    />
                    <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* ========================================================= */}
        {/* 3. API ENDPOINTS CARDS LIST                                */}
        {/* ========================================================= */}
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={{ color: '#64748b', fontSize: 13, marginTop: 10 }}>Loading endpoints...</Text>
          </View>
        ) : filteredApis.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Ionicons name="server-outline" size={28} color="#818cf8" />
            </View>
            <Text style={styles.emptyTitle}>No Endpoints Found</Text>
            <Text style={styles.emptyDesc}>
              {search
                ? `No APIs matching "${search}". Try adjusting your filters.`
                : 'Register your first API endpoint to track and test live integrations.'}
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={handleOpenAdd}>
              <Text style={styles.emptyBtnText}>Register New API</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardsList}>
            {filteredApis.map((item) => {
              const m = (item.method || 'GET').toUpperCase();
              const methodColor = METHOD_COLORS[m] || '#6366f1';
              const isCopiedUrl = copiedId === item._id;
              const isCopiedCurl = copiedCurlId === item._id;
              const isTesting = Boolean(testingIds[item._id]);
              const test = testResults[item._id];
              const isRevealed = Boolean(revealedUrls[item._id]);

              // Mask secret if looks like token / key and not revealed
              const looksLikeToken = item.url.length > 25 && !item.url.includes('/') && !item.url.includes('http');
              const displayUrl = looksLikeToken && !isRevealed
                ? `${item.url.slice(0, 6)}••••••••••••••••••••${item.url.slice(-4)}`
                : item.url;

              const statusColor =
                item.status === 'deprecated'
                  ? '#ef4444'
                  : item.status === 'testing'
                  ? '#f59e0b'
                  : '#10b981';

              return (
                <View
                  key={item._id}
                  style={[styles.apiCard, { borderLeftColor: methodColor }]}
                >
                  {/* Card Header Row */}
                  <View style={styles.apiCardHeader}>
                    <View style={styles.apiTitleArea}>
                      {/* Method Badge */}
                      <View style={[styles.methodBadge, { backgroundColor: `${methodColor}22` }]}>
                        <Text style={[styles.methodText, { color: methodColor }]}>{m}</Text>
                      </View>

                      {/* Endpoint Name */}
                      <Text style={styles.apiName} numberOfLines={1}>
                        {item.name}
                      </Text>

                      {/* Status Pulse Dot */}
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />

                      {/* Category Chip */}
                      {item.category ? (
                        <View style={styles.catBadge}>
                          <Text style={styles.catBadgeText}>{item.category}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Action Buttons Toolbar */}
                    <View style={styles.cardActions}>
                      {/* Ping Live Health Check */}
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleTestEndpoint(item)}
                        disabled={isTesting}
                        activeOpacity={0.7}
                      >
                        {isTesting ? (
                          <ActivityIndicator size="small" color="#818cf8" />
                        ) : (
                          <>
                            <Ionicons name="flash" size={12} color="#818cf8" />
                            <Text style={styles.actionBtnText}>Ping</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      {/* cURL Command Generator */}
                      <TouchableOpacity
                        style={[styles.actionBtn, isCopiedCurl && styles.actionBtnActive]}
                        onPress={() => handleCopyCurl(item)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isCopiedCurl ? 'checkmark' : 'terminal-outline'}
                          size={12}
                          color={isCopiedCurl ? '#10b981' : '#94a3b8'}
                        />
                        <Text style={[styles.actionBtnText, isCopiedCurl && { color: '#10b981' }]}>
                          {isCopiedCurl ? 'cURL Copied' : 'cURL'}
                        </Text>
                      </TouchableOpacity>

                      {/* Mask/Unmask Toggle for Secrets */}
                      {looksLikeToken && (
                        <TouchableOpacity
                          style={styles.actionIconOnly}
                          onPress={() => toggleReveal(item._id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={isRevealed ? 'eye-off-outline' : 'eye-outline'}
                            size={14}
                            color="#94a3b8"
                          />
                        </TouchableOpacity>
                      )}

                      {/* Edit Button */}
                      <TouchableOpacity
                        style={styles.actionIconOnly}
                        onPress={() => handleOpenEdit(item)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="pencil-outline" size={14} color="#94a3b8" />
                      </TouchableOpacity>

                      {/* Delete Button */}
                      <TouchableOpacity
                        style={[styles.actionIconOnly, styles.actionDanger]}
                        onPress={() => handleDelete(item)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Monospace Code URL Box */}
                  <View style={styles.urlBox}>
                    <Text style={styles.urlText} numberOfLines={1} selectable>
                      {displayUrl}
                    </Text>

                    <View style={styles.urlActions}>
                      <TouchableOpacity
                        style={[styles.copyBtn, isCopiedUrl && styles.copyBtnSuccess]}
                        onPress={() => handleCopyUrl(item.url, item._id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isCopiedUrl ? 'checkmark' : 'copy-outline'}
                          size={12}
                          color={isCopiedUrl ? '#10b981' : '#94a3b8'}
                        />
                        <Text style={[styles.copyBtnText, isCopiedUrl && styles.copyBtnTextSuccess]}>
                          {isCopiedUrl ? 'Copied' : 'Copy'}
                        </Text>
                      </TouchableOpacity>

                      {(item.url.startsWith('http://') || item.url.startsWith('https://')) && (
                        <TouchableOpacity
                          style={styles.copyBtn}
                          onPress={() => handleOpenExternal(item.url)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="open-outline" size={12} color="#94a3b8" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Live Ping Test Latency Console */}
                  {test && (
                    <View
                      style={[
                        styles.testConsole,
                        { borderColor: test.ok ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)' },
                      ]}
                    >
                      <View style={styles.testConsoleTop}>
                        <View
                          style={[
                            styles.testStatusBadge,
                            { backgroundColor: test.ok ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' },
                          ]}
                        >
                          <Ionicons
                            name={test.ok ? 'checkmark-circle' : 'alert-circle'}
                            size={14}
                            color={test.ok ? '#10b981' : '#ef4444'}
                          />
                          <Text
                            style={[
                              styles.testStatusText,
                              { color: test.ok ? '#10b981' : '#ef4444' },
                            ]}
                          >
                            HTTP {test.status} ({test.statusText})
                          </Text>
                        </View>

                        <Text style={styles.latencyText}>
                          Latency: {test.time}ms · {test.timestamp}
                        </Text>
                      </View>

                      {test.snippet ? (
                        <View style={styles.testJsonBox}>
                          <Text style={styles.testJsonText} numberOfLines={3}>
                            {test.snippet}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}

                  {/* Description & Metadata Footer */}
                  <View style={styles.apiFooter}>
                    <Text style={styles.apiDesc} numberOfLines={2}>
                      {item.description || 'No documentation or parameters specified.'}
                    </Text>

                    {item.updatedAt && (
                      <Text style={styles.dateText}>
                        Updated {new Date(item.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ========================================================= */}
      {/* 4. REGISTER & EDIT ENDPOINT MODAL                         */}
      {/* ========================================================= */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <View style={styles.modalIconBadge}>
                  <Ionicons name="code-working-outline" size={18} color="#818cf8" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>
                    {editingApi ? 'Edit Endpoint Details' : 'Register New API Endpoint'}
                  </Text>
                  <Text style={styles.modalSubtitle}>RESTful API Hub & Microservices</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Method Selector */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>HTTP Method</Text>
                <View style={styles.methodRow}>
                  {METHODS.map((m) => {
                    const isSelected = formMethod === m;
                    const mColor = METHOD_COLORS[m];
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[
                          styles.methodSelectPill,
                          isSelected && {
                            backgroundColor: `${mColor}25`,
                            borderColor: mColor,
                            borderWidth: 1.5,
                          },
                        ]}
                        onPress={() => setFormMethod(m)}
                      >
                        <Text
                          style={[
                            styles.methodSelectPillText,
                            { color: isSelected ? mColor : '#94a3b8' },
                          ]}
                        >
                          {m}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Endpoint Name */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Endpoint Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Fetch User Analytics Summary"
                  placeholderTextColor="#64748b"
                  value={formName}
                  onChangeText={setFormName}
                />
              </View>

              {/* URL or Secret Path */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>URL Endpoint / Path *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://api.yourdomain.com/v1/analytics"
                  placeholderTextColor="#64748b"
                  value={formUrl}
                  onChangeText={setFormUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Status Picker */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Operational Status</Text>
                <View style={styles.statusRow}>
                  {[
                    { key: 'active', label: 'Active', color: '#10b981' },
                    { key: 'testing', label: 'Testing', color: '#f59e0b' },
                    { key: 'deprecated', label: 'Deprecated', color: '#ef4444' },
                  ].map((s) => {
                    const isSel = formStatus === s.key;
                    return (
                      <TouchableOpacity
                        key={s.key}
                        style={[
                          styles.statusPill,
                          isSel && [styles.statusPillActive, { borderColor: s.color }],
                        ]}
                        onPress={() => setFormStatus(s.key)}
                      >
                        <View style={[styles.statusDot, { backgroundColor: s.color }]} />
                        <Text style={[styles.statusPillText, isSel && { color: '#ffffff' }]}>
                          {s.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Category & Suggestion Chips */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Category</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Authentication, Portfolio, Billing..."
                  placeholderTextColor="#64748b"
                  value={formCategory}
                  onChangeText={setFormCategory}
                />
                <View style={styles.categoryChips}>
                  {COMMON_CATEGORIES.map((chip) => (
                    <TouchableOpacity
                      key={chip}
                      style={[
                        styles.catChip,
                        formCategory === chip && styles.catChipActive,
                      ]}
                      onPress={() => setFormCategory(chip)}
                    >
                      <Text
                        style={[
                          styles.catChipText,
                          formCategory === chip && styles.catChipTextActive,
                        ]}
                      >
                        {chip}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Description & Parameter Schema */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description & Query Notes</Text>
                <TextInput
                  style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
                  placeholder="Headers required, rate limits, sample payload, or auth token details..."
                  placeholderTextColor="#64748b"
                  value={formDescription}
                  onChangeText={setFormDescription}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            {/* Modal Footer Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSave}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={16} color="#ffffff" />
                    <Text style={styles.modalSaveText}>
                      {editingApi ? 'Update Endpoint' : 'Save Endpoint'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
