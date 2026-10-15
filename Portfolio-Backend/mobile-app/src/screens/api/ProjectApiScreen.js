import React, { useState, useEffect } from 'react';
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
import { ScreenHeader, EmptyState } from '../../components/common';
import styles from './styles/apiScreenStyles';

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const METHOD_COLORS = {
  GET: '#3b82f6',
  POST: '#10b981',
  PUT: '#f59e0b',
  DELETE: '#ef4444',
  PATCH: '#8b5cf6',
};

export default function ProjectApiScreen({ onNavigate }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState({});
  const [copyNotice, setCopyNotice] = useState(null);

  // Project Modal State (Create / Edit Project)
  const [projectModalVisible, setProjectModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formProjectName, setFormProjectName] = useState('');
  const [formProjectDesc, setFormProjectDesc] = useState('');
  const [savingProject, setSavingProject] = useState(false);

  // Endpoint Modal State (Add Endpoint to Project)
  const [endpointModalVisible, setEndpointModalVisible] = useState(false);
  const [targetProjectId, setTargetProjectId] = useState(null);
  const [formEndpointName, setFormEndpointName] = useState('');
  const [formEndpointUrl, setFormEndpointUrl] = useState('');
  const [formEndpointMethod, setFormEndpointMethod] = useState('GET');
  const [formEndpointDesc, setFormEndpointDesc] = useState('');
  const [savingEndpoint, setSavingEndpoint] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.getProjectApis();
      const list = Array.isArray(res) ? res : [];
      setProjects(list);
      if (list.length > 0 && Object.keys(expandedProjects).length === 0) {
        setExpandedProjects({ [list[0]._id]: true });
      }
    } catch (err) {
      console.error('Error fetching project APIs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const toggleExpand = (id) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

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
      } else {
        await api.createProjectApi({
          projectName: formProjectName.trim(),
          description: formProjectDesc.trim(),
          apis: [],
        });
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
      `Delete project "${p.projectName}" and all its registered endpoints?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteProjectApi(p._id);
              fetchProjects();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete project.');
            }
          },
        },
      ]
    );
  };

  const handleOpenAddEndpoint = (projectId) => {
    setTargetProjectId(projectId);
    setFormEndpointName('');
    setFormEndpointUrl('');
    setFormEndpointMethod('GET');
    setFormEndpointDesc('');
    setEndpointModalVisible(true);
  };

  const handleSaveEndpoint = async () => {
    if (!formEndpointName.trim() || !formEndpointUrl.trim()) {
      Alert.alert('Required', 'Please provide endpoint name and URL.');
      return;
    }

    try {
      setSavingEndpoint(true);
      await api.addProjectApiEndpoint(targetProjectId, {
        name: formEndpointName.trim(),
        endpoint: formEndpointUrl.trim(),
        method: formEndpointMethod,
        description: formEndpointDesc.trim(),
      });
      setEndpointModalVisible(false);
      setExpandedProjects((prev) => ({ ...prev, [targetProjectId]: true }));
      fetchProjects();
    } catch (err) {
      Alert.alert('Error', err.message || 'Error adding endpoint');
    } finally {
      setSavingEndpoint(false);
    }
  };

  const handleDeleteEndpoint = (projectId, apiId, endpointName) => {
    Alert.alert(
      'Delete Endpoint',
      `Delete endpoint "${endpointName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteProjectApiEndpoint(projectId, apiId);
              fetchProjects();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete endpoint.');
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

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Project API Services"
        subtitle={`${projects.length} API Groups • Categorized service endpoints`}
        category="API HUB"
        iconName="layers-outline"
        onBack={() => onNavigate && onNavigate('Dashboard')}
        backText="Dashboard"
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={fetchProjects}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="refresh" size={16} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addBtn}
              onPress={handleOpenAddProject}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color={colors.textLight} />
              <Text style={styles.addBtnText}>New Project</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
          {projects.length === 0 ? (
            <EmptyState
              icon="layers-outline"
              title="No API Projects"
              description="Group your microservices, cloud functions, and backend routes."
              actionLabel="Add Project"
              onAction={handleOpenAddProject}
            />
          ) : (
            projects.map((p) => {
              const isExpanded = !!expandedProjects[p._id];
              const endpointCount = p.apis?.length || 0;

              return (
                <View key={p._id} style={styles.apiCard}>
                  {/* Project Header Row */}
                  <View style={styles.apiTopRow}>
                    <TouchableOpacity
                      style={styles.apiNameWrap}
                      onPress={() => toggleExpand(p._id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                        size={18}
                        color={colors.primary}
                      />
                      <Text style={[styles.apiName, { fontSize: 15 }]} numberOfLines={1}>
                        {p.projectName}
                      </Text>
                      <View style={styles.catBadge}>
                        <Text style={styles.catBadgeText}>{endpointCount} Endpoints</Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.apiActions}>
                      <TouchableOpacity
                        style={[styles.actionIconBtn, { backgroundColor: colors.primaryBg }]}
                        onPress={() => handleOpenAddEndpoint(p._id)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="add" size={16} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() => handleOpenEditProject(p)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="pencil-outline" size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionIconBtn, styles.deleteActionBtn]}
                        onPress={() => handleDeleteProject(p)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="trash-outline" size={14} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {p.description ? (
                    <Text style={[styles.apiDesc, { marginTop: 2, marginBottom: 6 }]}>
                      {p.description}
                    </Text>
                  ) : null}

                  {/* Expanded Endpoints List */}
                  {isExpanded && (
                    <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 8 }}>
                      {endpointCount === 0 ? (
                        <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, color: colors.textMuted }}>No endpoints added yet.</Text>
                          <TouchableOpacity
                            onPress={() => handleOpenAddEndpoint(p._id)}
                            style={{ marginTop: 6 }}
                          >
                            <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>+ Add Endpoint</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        p.apis.map((ep) => {
                          const methodColor = METHOD_COLORS[ep.method] || colors.primary;
                          const isCopied = copyNotice === ep._id;

                          return (
                            <View
                              key={ep._id}
                              style={{
                                backgroundColor: colors.surfaceAlt,
                                borderRadius: 8,
                                padding: 10,
                                marginBottom: 6,
                                borderWidth: 1,
                                borderColor: colors.border,
                              }}
                            >
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                                  <View style={[styles.methodBadge, { backgroundColor: methodColor + '18' }]}>
                                    <Text style={[styles.methodText, { color: methodColor }]}>{ep.method || 'GET'}</Text>
                                  </View>
                                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>
                                    {ep.name}
                                  </Text>
                                </View>
                                <TouchableOpacity
                                  onPress={() => handleDeleteEndpoint(p._id, ep._id, ep.name)}
                                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                >
                                  <Ionicons name="trash-outline" size={14} color={colors.danger} />
                                </TouchableOpacity>
                              </View>

                              <View style={[styles.urlBar, { backgroundColor: colors.surface, paddingVertical: 4, paddingHorizontal: 8 }]}>
                                <Text style={styles.urlText} numberOfLines={1}>{ep.endpoint}</Text>
                                <TouchableOpacity
                                  style={[styles.miniBtn, isCopied && styles.miniBtnSuccess]}
                                  onPress={() => handleCopy(ep.endpoint, ep._id)}
                                >
                                  <Ionicons
                                    name={isCopied ? 'checkmark' : 'copy-outline'}
                                    size={11}
                                    color={isCopied ? colors.successText : colors.textSecondary}
                                  />
                                  <Text style={[styles.miniBtnText, isCopied && styles.miniBtnTextSuccess]}>
                                    {isCopied ? 'Copied' : 'Copy'}
                                  </Text>
                                </TouchableOpacity>
                              </View>

                              {ep.description ? (
                                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{ep.description}</Text>
                              ) : null}
                            </View>
                          );
                        })
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Project Modal */}
      <Modal visible={projectModalVisible} transparent animationType="fade" onRequestClose={() => setProjectModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProject ? 'Edit Project Group' : 'Create API Project'}
              </Text>
              <TouchableOpacity onPress={() => setProjectModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Project Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Auth Microservice, Payments API"
                value={formProjectName}
                onChangeText={setFormProjectName}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
                placeholder="Brief summary of routes in this project..."
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
                <ActivityIndicator color={colors.textLight} size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {editingProject ? 'Update Project' : 'Create Project'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Endpoint Modal */}
      <Modal visible={endpointModalVisible} transparent animationType="fade" onRequestClose={() => setEndpointModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add API Endpoint</Text>
              <TouchableOpacity onPress={() => setEndpointModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginBottom: 12 }}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Endpoint Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Get User Profile"
                  value={formEndpointName}
                  onChangeText={setFormEndpointName}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>URL Endpoint *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://api.example.com/v1/user/profile"
                  value={formEndpointUrl}
                  onChangeText={setFormEndpointUrl}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>HTTP Method</Text>
                <View style={styles.methodSelector}>
                  {METHODS.map((m) => {
                    const isSelected = formEndpointMethod === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[styles.methodOption, isSelected && styles.methodOptionSelected]}
                        onPress={() => setFormEndpointMethod(m)}
                      >
                        <Text style={[styles.methodOptionText, isSelected && styles.methodOptionTextSelected]}>{m}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                  placeholder="Optional details, payload schema..."
                  value={formEndpointDesc}
                  onChangeText={setFormEndpointDesc}
                  multiline
                  numberOfLines={2}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSaveEndpoint}
              disabled={savingEndpoint}
              activeOpacity={0.8}
            >
              {savingEndpoint ? (
                <ActivityIndicator color={colors.textLight} size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Add Endpoint</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
