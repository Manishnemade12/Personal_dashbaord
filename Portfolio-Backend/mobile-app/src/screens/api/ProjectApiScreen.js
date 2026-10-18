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
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/theme';
import { api } from '../../api/client';
import { ScreenHeader, EmptyState } from '../../components/common';
import styles from './styles/apiScreenStyles';

const METHODS = ['KEY', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const METHOD_COLORS = {
  KEY: '#8b5cf6', // purple
  GET: '#3b82f6', // blue
  POST: '#10b981', // green
  PUT: '#f59e0b', // amber
  DELETE: '#ef4444', // red
  PATCH: '#06b6d4', // cyan
};

export default function ProjectApiScreen({ onNavigate }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active Project Selection: 'ALL' or specific projectId
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProjects, setExpandedProjects] = useState({});
  const [revealedSecrets, setRevealedSecrets] = useState({});
  const [toastMessage, setToastMessage] = useState(null);
  const [copiedKeyId, setCopiedKeyId] = useState(null);

  // Project Modal State (Create / Edit Project)
  const [projectModalVisible, setProjectModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formProjectName, setFormProjectName] = useState('');
  const [formProjectDesc, setFormProjectDesc] = useState('');
  const [savingProject, setSavingProject] = useState(false);

  // Endpoint / Key Modal State (Add / Edit Key in Project)
  const [endpointModalVisible, setEndpointModalVisible] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState(null); // null if adding
  const [targetProjectId, setTargetProjectId] = useState(null);
  const [formEndpointName, setFormEndpointName] = useState('');
  const [formEndpointValue, setFormEndpointValue] = useState('');
  const [formEndpointMethod, setFormEndpointMethod] = useState('KEY');
  const [formEndpointDesc, setFormEndpointDesc] = useState('');
  const [savingEndpoint, setSavingEndpoint] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await api.getProjectApis();
      const list = Array.isArray(res) ? res : [];
      setProjects(list);

      // Expand all by default in overview
      const initialExpanded = {};
      list.forEach((p) => {
        initialExpanded[p._id] = true;
      });
      setExpandedProjects(initialExpanded);
    } catch (err) {
      console.error('Error fetching project APIs:', err);
      Alert.alert('Error', 'Failed to load project APIs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const totalApiCount = useMemo(() => {
    return projects.reduce((acc, p) => acc + (p.apis?.length || 0), 0);
  }, [projects]);

  const activeProject = useMemo(() => {
    if (selectedProjectId === 'ALL') return null;
    return projects.find((p) => p._id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Show toast notification
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Toggle show/hide secret value
  const toggleReveal = (id) => {
    setRevealedSecrets((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Copy single value to clipboard
  const handleCopySingle = (text, keyId) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedKeyId(keyId);
    showToast('✓ Copied to clipboard!');
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  // Copy all keys for a specific project or all projects as .env format
  const handleCopyAllEnv = (proj) => {
    let output = '';
    if (proj) {
      output += `# Project: ${proj.projectName}\n`;
      if (proj.description) output += `# ${proj.description}\n`;
      (proj.apis || []).forEach((item) => {
        const val = item.endpoint?.trim() || '';
        output += `${item.name}=${val}\n`;
      });
    } else {
      // All projects
      projects.forEach((p) => {
        output += `\n# ==========================================\n`;
        output += `# Project: ${p.projectName}\n`;
        output += `# ==========================================\n`;
        (p.apis || []).forEach((item) => {
          const val = item.endpoint?.trim() || '';
          output += `${item.name}=${val}\n`;
        });
      });
      output = output.trim();
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(output);
    }
    showToast(`✓ All .env variables copied!`);
  };

  // Toggle expand for project cards in ALL view
  const toggleExpand = (id) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Project Modal Handlers
  const handleOpenAddProject = () => {
    setEditingProject(null);
    setFormProjectName('');
    setFormProjectDesc('');
    setProjectModalVisible(true);
  };

  const handleOpenEditProject = (p) => {
    setEditingProject(p);
    setFormProjectName(p.projectName || '');
    setFormProjectDesc(p.description || '');
    setProjectModalVisible(true);
  };

  const handleSaveProject = async () => {
    if (!formProjectName.trim()) {
      Alert.alert('Required', 'Please enter a project name.');
      return;
    }

    try {
      setSavingProject(true);
      if (editingProject) {
        await api.updateProjectApi(editingProject._id, {
          projectName: formProjectName.trim(),
          description: formProjectDesc.trim(),
        });
        showToast('✓ Project updated successfully!');
      } else {
        const created = await api.createProjectApi({
          projectName: formProjectName.trim(),
          description: formProjectDesc.trim(),
          apis: [],
        });
        showToast('✓ Project created!');
        if (created?._id) {
          setSelectedProjectId(created._id);
        }
      }
      setProjectModalVisible(false);
      fetchProjects();
    } catch (err) {
      Alert.alert('Error', err.message || 'Error saving project');
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteProject = (p) => {
    Alert.alert(
      'Delete Project',
      `Delete project "${p.projectName}" and all its ${p.apis?.length || 0} registered keys?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteProjectApi(p._id);
              if (selectedProjectId === p._id) {
                setSelectedProjectId('ALL');
              }
              showToast('✓ Project deleted');
              fetchProjects();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete project.');
            }
          },
        },
      ]
    );
  };

  // Endpoint / Key Modal Handlers
  const handleOpenAddKey = (preselectedProjectId = null) => {
    setEditingEndpoint(null);
    const projId =
      preselectedProjectId ||
      (selectedProjectId !== 'ALL' ? selectedProjectId : projects[0]?._id || null);
    setTargetProjectId(projId);
    setFormEndpointName('');
    setFormEndpointValue('');
    setFormEndpointMethod('KEY');
    setFormEndpointDesc('');
    setEndpointModalVisible(true);
  };

  const handleOpenEditKey = (projectId, endpoint) => {
    setEditingEndpoint(endpoint);
    setTargetProjectId(projectId);
    setFormEndpointName(endpoint.name || '');
    setFormEndpointValue(endpoint.endpoint || '');
    setFormEndpointMethod(endpoint.method || 'KEY');
    setFormEndpointDesc(endpoint.description || '');
    setEndpointModalVisible(true);
  };

  const handleSaveKey = async () => {
    if (!targetProjectId) {
      Alert.alert('Required', 'Please select a project to save this key under.');
      return;
    }
    if (!formEndpointName.trim() || !formEndpointValue.trim()) {
      Alert.alert('Required', 'Please enter a name and secret/URL.');
      return;
    }

    try {
      setSavingEndpoint(true);
      if (editingEndpoint) {
        // Update existing endpoint
        await api.updateProjectApiEndpoint(targetProjectId, editingEndpoint._id, {
          name: formEndpointName.trim(),
          endpoint: formEndpointValue.trim(),
          method: formEndpointMethod,
          description: formEndpointDesc.trim(),
        });
        showToast('✓ Key updated!');
      } else {
        // Add new endpoint
        await api.addProjectApiEndpoint(targetProjectId, {
          name: formEndpointName.trim(),
          endpoint: formEndpointValue.trim(),
          method: formEndpointMethod,
          description: formEndpointDesc.trim(),
        });
        showToast('✓ Key saved under project!');
      }

      setEndpointModalVisible(false);
      fetchProjects();
    } catch (err) {
      Alert.alert('Error', err.message || 'Error saving key');
    } finally {
      setSavingEndpoint(false);
    }
  };

  const handleDeleteKey = (projectId, apiId, name) => {
    Alert.alert('Delete Key', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteProjectApiEndpoint(projectId, apiId);
            showToast('✓ Key deleted');
            fetchProjects();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete key.');
          }
        },
      },
    ]);
  };

  // Filter keys by search query
  const matchesSearch = (item, projName = '') => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.name?.toLowerCase().includes(q) ||
      item.endpoint?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      projName.toLowerCase().includes(q)
    );
  };

  // Render a single API Key / Endpoint card
  const renderKeyCard = (item, projectId, projectName) => {
    const isCopied = copiedKeyId === item._id;
    const isRevealed = !!revealedSecrets[item._id];
    const methodColor = METHOD_COLORS[item.method] || colors.primary;

    return (
      <View key={item._id} style={styles.keyCard}>
        {/* Top Header Row */}
        <View style={styles.keyHeaderRow}>
          <View style={styles.keyTitleArea}>
            <View style={[styles.methodBadge, { backgroundColor: methodColor + '20' }]}>
              <Text style={[styles.methodText, { color: methodColor }]}>
                {item.method || 'KEY'}
              </Text>
            </View>

            {selectedProjectId === 'ALL' && projectName && (
              <View style={styles.keyProjectTag}>
                <Text style={styles.keyProjectTagText}>{projectName}</Text>
              </View>
            )}

            <Text style={styles.keyName} numberOfLines={1}>
              {item.name}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.keyActionsRow}>
            {/* Reveal/Hide toggle */}
            <TouchableOpacity
              style={styles.iconActionBtn}
              onPress={() => toggleReveal(item._id)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityLabel={isRevealed ? 'Hide Value' : 'Show Value'}
            >
              <Ionicons
                name={isRevealed ? 'eye-off-outline' : 'eye-outline'}
                size={13}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Quick Copy Button */}
            <TouchableOpacity
              style={[styles.keyMiniBtn, isCopied && styles.keyMiniBtnSuccess]}
              onPress={() => handleCopySingle(item.endpoint, item._id)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons
                name={isCopied ? 'checkmark' : 'copy-outline'}
                size={11}
                color={isCopied ? colors.successText : colors.textSecondary}
              />
              <Text style={[styles.keyMiniBtnText, isCopied && styles.keyMiniBtnTextSuccess]}>
                {isCopied ? 'Copied' : 'Copy'}
              </Text>
            </TouchableOpacity>

            {/* Edit Key */}
            <TouchableOpacity
              style={styles.iconActionBtn}
              onPress={() => handleOpenEditKey(projectId, item)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="pencil-outline" size={12} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Delete Key */}
            <TouchableOpacity
              style={[styles.iconActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}
              onPress={() => handleDeleteKey(projectId, item._id, item.name)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="trash-outline" size={12} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Value Box */}
        <View style={styles.valueBox}>
          {isRevealed ? (
            <Text style={styles.valueText} numberOfLines={2} selectable>
              {item.endpoint}
            </Text>
          ) : (
            <Text style={styles.valueMasked} numberOfLines={1}>
              ••••••••••••••••••••••••••••••••
            </Text>
          )}
        </View>

        {/* Optional Description */}
        {item.description ? (
          <Text style={styles.keyDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 1. Header */}
      <ScreenHeader
        title="API Projects & Keys"
        subtitle={`${projects.length} Projects • ${totalApiCount} Keys & Endpoints`}
        category="API VAULT & SERVICES"
        iconName="shield-checkmark-outline"
        onBack={() => onNavigate && onNavigate('Dashboard')}
        backText="Dashboard"
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={handleOpenAddProject}
              activeOpacity={0.8}
            >
              <Ionicons name="folder-open-outline" size={12} color="#ffffff" />
              <Text style={styles.headerBtnText}>+ New Project</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* 2. Project Filter Horizontal Bar */}
      <View style={styles.projectFilterSection}>
        <View style={styles.projectFilterTitleRow}>
          <Text style={styles.projectFilterLabel}>Select Project:</Text>
          <Text style={styles.projectFilterCounter}>
            {selectedProjectId === 'ALL'
              ? `All (${totalApiCount} items)`
              : `${activeProject?.projectName || ''} (${activeProject?.apis?.length || 0} items)`}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.projectPillsScroll}
          contentContainerStyle={styles.projectPillsContainer}
        >
          {/* "All Projects" Option */}
          <TouchableOpacity
            style={[styles.projectPill, selectedProjectId === 'ALL' && styles.projectPillActive]}
            onPress={() => setSelectedProjectId('ALL')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="layers-outline"
              size={12}
              color={selectedProjectId === 'ALL' ? '#ffffff' : colors.primary}
            />
            <Text
              style={[
                styles.projectPillText,
                selectedProjectId === 'ALL' && styles.projectPillTextActive,
              ]}
            >
              All Projects
            </Text>
            <View
              style={[
                styles.projectPillBadge,
                selectedProjectId === 'ALL' && styles.projectPillBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.projectPillBadgeText,
                  selectedProjectId === 'ALL' && styles.projectPillBadgeTextActive,
                ]}
              >
                {totalApiCount}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Individual Projects */}
          {projects.map((p) => {
            const isSelected = selectedProjectId === p._id;
            const count = p.apis?.length || 0;

            return (
              <TouchableOpacity
                key={p._id}
                style={[styles.projectPill, isSelected && styles.projectPillActive]}
                onPress={() => setSelectedProjectId(p._id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="cube-outline"
                  size={12}
                  color={isSelected ? '#ffffff' : colors.textSecondary}
                />
                <Text
                  style={[styles.projectPillText, isSelected && styles.projectPillTextActive]}
                  numberOfLines={1}
                >
                  {p.projectName}
                </Text>
                <View
                  style={[styles.projectPillBadge, isSelected && styles.projectPillBadgeActive]}
                >
                  <Text
                    style={[
                      styles.projectPillBadgeText,
                      isSelected && styles.projectPillBadgeTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Main Body */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 8 }}>
            Loading API keys & projects...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollInner}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchProjects();
              }}
              colors={[colors.primary]}
            />
          }
        >
          {/* Search Bar & Global Quick Actions */}
          <View style={styles.searchBarWrap}>
            <Ionicons name="search" size={14} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={
                selectedProjectId === 'ALL'
                  ? 'Search keys across all projects...'
                  : `Search in ${activeProject?.projectName || 'project'}...`
              }
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.textMuted}
              clearButtonMode="while-editing"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* ============================================================== */}
          {/* CASE A: A SPECIFIC PROJECT IS SELECTED                         */}
          {/* ============================================================== */}
          {selectedProjectId !== 'ALL' && activeProject && (
            <View>
              {/* Selected Project Hero Banner */}
              <View style={styles.projectBanner}>
                <View style={styles.projectBannerTop}>
                  <View style={styles.projectBannerInfo}>
                    <View style={styles.projectBannerTitleRow}>
                      <Ionicons name="cube" size={16} color={colors.primary} />
                      <Text style={styles.projectBannerTitle} numberOfLines={1}>
                        {activeProject.projectName}
                      </Text>
                    </View>
                    {activeProject.description ? (
                      <Text style={styles.projectBannerDesc}>{activeProject.description}</Text>
                    ) : null}

                    <View style={styles.projectBannerStats}>
                      <View style={styles.projectStatPill}>
                        <Text style={styles.projectStatPillText}>
                          {activeProject.apis?.length || 0} Registered Keys
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Banner Actions */}
                <View style={styles.projectBannerActions}>
                  <TouchableOpacity
                    style={[styles.bannerBtn, styles.bannerBtnPrimary]}
                    onPress={() => handleOpenAddKey(activeProject._id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={14} color="#ffffff" />
                    <Text style={[styles.bannerBtnText, styles.bannerBtnTextPrimary]}>
                      + Add Key / Endpoint
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.bannerBtn}
                    onPress={() => handleCopyAllEnv(activeProject)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="copy-outline" size={13} color={colors.primary} />
                    <Text style={styles.bannerBtnText}>Copy .env</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.bannerBtn}
                    onPress={() => handleOpenEditProject(activeProject)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil-outline" size={13} color={colors.textSecondary} />
                    <Text style={styles.bannerBtnText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.bannerBtn, styles.bannerBtnDanger]}
                    onPress={() => handleDeleteProject(activeProject)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={13} color={colors.danger} />
                    <Text style={styles.bannerBtnTextDanger}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* List of keys in this project */}
              {activeProject.apis?.filter((item) => matchesSearch(item, activeProject.projectName))
                .length === 0 ? (
                <EmptyState
                  icon="key-outline"
                  title="No Keys or Endpoints"
                  description={
                    searchQuery
                      ? `No keys matched "${searchQuery}" in this project.`
                      : 'Add your environment variables, secrets, or microservice routes.'
                  }
                  actionLabel="+ Add First Key"
                  onAction={() => handleOpenAddKey(activeProject._id)}
                />
              ) : (
                activeProject.apis
                  .filter((item) => matchesSearch(item, activeProject.projectName))
                  .map((item) => renderKeyCard(item, activeProject._id, activeProject.projectName))
              )}
            </View>
          )}

          {/* ============================================================== */}
          {/* CASE B: "ALL PROJECTS" IS SELECTED                             */}
          {/* ============================================================== */}
          {selectedProjectId === 'ALL' && (
            <View>
              {/* Quick Actions Bar for All Projects */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                  gap: 6,
                }}
              >
                <TouchableOpacity
                  style={[styles.bannerBtn, styles.bannerBtnPrimary, { flex: 1 }]}
                  onPress={() => handleOpenAddKey(null)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={14} color="#ffffff" />
                  <Text style={[styles.bannerBtnText, styles.bannerBtnTextPrimary]}>
                    + Add New Key / Endpoint
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.bannerBtn, { paddingHorizontal: 10 }]}
                  onPress={() => handleCopyAllEnv(null)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="copy-outline" size={13} color={colors.primary} />
                  <Text style={styles.bannerBtnText}>Copy All .env</Text>
                </TouchableOpacity>
              </View>

              {projects.length === 0 ? (
                <EmptyState
                  icon="layers-outline"
                  title="No API Projects"
                  description="Create your first project group to organize microservices and keys."
                  actionLabel="+ Create Project"
                  onAction={handleOpenAddProject}
                />
              ) : (
                projects.map((p) => {
                  const filteredApis = (p.apis || []).filter((item) =>
                    matchesSearch(item, p.projectName)
                  );
                  if (searchQuery && filteredApis.length === 0) return null;

                  const isExpanded = !!expandedProjects[p._id];

                  return (
                    <View key={p._id} style={styles.projectGroupCard}>
                      {/* Project Header */}
                      <TouchableOpacity
                        style={styles.projectGroupHeader}
                        onPress={() => toggleExpand(p._id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.projectGroupLeft}>
                          <Ionicons
                            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                            size={16}
                            color={colors.primary}
                          />
                          <Text style={styles.projectGroupName} numberOfLines={1}>
                            {p.projectName}
                          </Text>
                          <View style={styles.projectStatPill}>
                            <Text style={styles.projectStatPillText}>
                              {p.apis?.length || 0}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.projectGroupActions}>
                          {/* Quick Filter To This Project */}
                          <TouchableOpacity
                            style={[styles.keyMiniBtn, { paddingHorizontal: 6 }]}
                            onPress={() => setSelectedProjectId(p._id)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Text style={[styles.keyMiniBtnText, { color: colors.primary }]}>
                              Focus
                            </Text>
                          </TouchableOpacity>

                          {/* Copy .env for this project */}
                          <TouchableOpacity
                            style={styles.iconActionBtn}
                            onPress={() => handleCopyAllEnv(p)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="copy-outline" size={12} color={colors.textSecondary} />
                          </TouchableOpacity>

                          {/* Quick Add key */}
                          <TouchableOpacity
                            style={[styles.iconActionBtn, { backgroundColor: colors.primaryBg }]}
                            onPress={() => handleOpenAddKey(p._id)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="add" size={14} color={colors.primary} />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>

                      {/* Project Body */}
                      {isExpanded && (
                        <View style={styles.projectGroupBody}>
                          {filteredApis.length === 0 ? (
                            <View style={{ padding: 12, alignItems: 'center' }}>
                              <Text style={{ fontSize: 11, color: colors.textMuted }}>
                                No keys registered in this project.
                              </Text>
                              <TouchableOpacity
                                onPress={() => handleOpenAddKey(p._id)}
                                style={{ marginTop: 4 }}
                              >
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: '700',
                                    color: colors.primary,
                                  }}
                                >
                                  + Add Key / Endpoint
                                </Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            filteredApis.map((item) =>
                              renderKeyCard(item, p._id, p.projectName)
                            )
                          )}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <View style={styles.toastBanner}>
          <Ionicons name="checkmark-circle" size={16} color="#34d399" />
          <Text style={styles.toastBannerText}>{toastMessage}</Text>
        </View>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: ADD / EDIT KEY & ENDPOINT                             */}
      {/* ============================================================== */}
      <Modal
        visible={endpointModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEndpointModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingEndpoint ? 'Edit Key / Endpoint' : 'Save Key Under Project'}
              </Text>
              <TouchableOpacity
                onPress={() => setEndpointModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Select Project to Save Under */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Select Project *</Text>
                <View style={styles.projectSelectPillRow}>
                  {projects.map((p) => {
                    const isTarget = targetProjectId === p._id;
                    return (
                      <TouchableOpacity
                        key={p._id}
                        style={[
                          styles.projectSelectPill,
                          isTarget && styles.projectSelectPillActive,
                        ]}
                        onPress={() => setTargetProjectId(p._id)}
                      >
                        <Text
                          style={[
                            styles.projectSelectPillText,
                            isTarget && styles.projectSelectPillTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {p.projectName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Key / Variable Name */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Key / Variable Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. JWT_SECRET, llm__api_key, /api/auth/login"
                  value={formEndpointName}
                  onChangeText={setFormEndpointName}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
              </View>

              {/* Type / Method */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Type / HTTP Method</Text>
                <View style={styles.methodSelector}>
                  {METHODS.map((m) => {
                    const isSel = formEndpointMethod === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[styles.methodOption, isSel && styles.methodOptionSelected]}
                        onPress={() => setFormEndpointMethod(m)}
                      >
                        <Text
                          style={[
                            styles.methodOptionText,
                            isSel && styles.methodOptionTextSelected,
                          ]}
                        >
                          {m}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Secret Value or URL */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Secret Value / Endpoint URL *</Text>
                <TextInput
                  style={[styles.input, { minHeight: 65, textAlignVertical: 'top' }]}
                  placeholder="e.g. gsk_2U9f..., sk_live_..., or https://api.service.com/v1"
                  value={formEndpointValue}
                  onChangeText={setFormEndpointValue}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  autoCapitalize="none"
                />
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Description / Notes (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Production key for LLM pipeline"
                  value={formEndpointDesc}
                  onChangeText={setFormEndpointDesc}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSaveKey}
                disabled={savingEndpoint}
                activeOpacity={0.8}
              >
                {savingEndpoint ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {editingEndpoint ? 'Update Key' : 'Save Key to Project'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: CREATE / EDIT PROJECT GROUP                           */}
      {/* ============================================================== */}
      <Modal
        visible={projectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProjectModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProject ? 'Edit Project Group' : 'Create API Project'}
              </Text>
              <TouchableOpacity
                onPress={() => setProjectModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Project Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. piyush_project, Secreate_vault, aws"
                value={formProjectName}
                onChangeText={setFormProjectName}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, { minHeight: 65, textAlignVertical: 'top' }]}
                placeholder="Short description of this project's microservices or vault..."
                value={formProjectDesc}
                onChangeText={setFormProjectDesc}
                multiline
                numberOfLines={3}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSaveProject}
              disabled={savingProject}
              activeOpacity={0.8}
            >
              {savingProject ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {editingProject ? 'Update Project' : 'Create Project'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
