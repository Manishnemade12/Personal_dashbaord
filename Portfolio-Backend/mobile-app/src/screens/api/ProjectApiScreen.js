import React, { useState, useEffect } from 'react';
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

export default function ProjectApiScreen({ onNavigate }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

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
      // Auto-expand first project if available
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
      alert('Please enter a project name.');
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
      alert(err.message || 'Error saving project');
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteProject = (p) => {
    const doDelete = async () => {
      try {
        await api.deleteProjectApi(p._id);
        fetchProjects();
      } catch (err) {
        alert(err.message || 'Error deleting project');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete project "${p.projectName}" and all its endpoints?`)) {
        doDelete();
      }
    } else {
      Alert.alert('Delete Project', `Delete "${p.projectName}" and all endpoints?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
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
      alert('Please provide endpoint name and URL.');
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
      // Ensure target project is expanded
      setExpandedProjects((prev) => ({ ...prev, [targetProjectId]: true }));
      fetchProjects();
    } catch (err) {
      alert(err.message || 'Error adding endpoint');
    } finally {
      setSavingEndpoint(false);
    }
  };

  const handleDeleteEndpoint = (projectId, apiId, endpointName) => {
    const doDelete = async () => {
      try {
        await api.deleteProjectApiEndpoint(projectId, apiId);
        fetchProjects();
      } catch (err) {
        alert(err.message || 'Error deleting endpoint');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete endpoint "${endpointName}"?`)) {
        doDelete();
      }
    } else {
      Alert.alert('Delete Endpoint', `Delete "${endpointName}"?`, [
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
            <Text style={styles.screenTitle}>API Projects</Text>
            <Text style={styles.screenSubtitle}>
              {projects.length} Projects • API services & route groupings
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={fetchProjects}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={15} color="#3b82f6" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleOpenAddProject}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={17} color="#ffffff" />
            <Text style={styles.addBtnText}>New Project</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Main Content */}
      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading API projects...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
          {projects.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Projects Found</Text>
              <Text style={styles.emptySubtitle}>Create a project to group related API endpoints</Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={handleOpenAddProject}>
                <Ionicons name="add" size={16} color="#ffffff" />
                <Text style={styles.emptyAddBtnText}>Create Project</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.projectsList}>
              {projects.map((project) => {
                const isExpanded = !!expandedProjects[project._id];
                const apisCount = project.apis?.length || 0;

                return (
                  <View key={project._id} style={styles.projectCard}>
                    {/* Project Header Card */}
                    <TouchableOpacity
                      style={styles.projectHeader}
                      onPress={() => toggleExpand(project._id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.projectHeaderLeft}>
                        <View style={styles.projectIconWrap}>
                          <Ionicons name="cube-outline" size={18} color="#3b82f6" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Text style={styles.projectName}>{project.projectName}</Text>
                            <View style={styles.endpointCountBadge}>
                              <Text style={styles.endpointCountText}>
                                {apisCount} Endpoint{apisCount === 1 ? '' : 's'}
                              </Text>
                            </View>
                          </View>
                          {project.description ? (
                            <Text style={styles.projectDesc}>{project.description}</Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.projectHeaderRight}>
                        <TouchableOpacity
                          style={styles.miniAddEndpointBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleOpenAddEndpoint(project._id);
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="add" size={14} color="#3b82f6" />
                          <Text style={styles.miniAddEndpointText}>Add Endpoint</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleOpenEditProject(project);
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="pencil-outline" size={14} color="#475569" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, styles.deleteBtn]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project);
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={14} color="#ef4444" />
                        </TouchableOpacity>

                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color="#94a3b8"
                        />
                      </View>
                    </TouchableOpacity>

                    {/* Expandable Endpoints Section */}
                    {isExpanded && (
                      <View style={styles.endpointsContainer}>
                        {apisCount === 0 ? (
                          <View style={styles.emptyEndpointsBox}>
                            <Text style={styles.emptyEndpointsText}>No endpoints added yet.</Text>
                            <TouchableOpacity
                              style={styles.emptyEndpointsBtn}
                              onPress={() => handleOpenAddEndpoint(project._id)}
                            >
                              <Ionicons name="add" size={13} color="#3b82f6" />
                              <Text style={styles.emptyEndpointsBtnText}>Add First Endpoint</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.endpointsList}>
                            {project.apis.map((ep) => {
                              const methodColor = METHOD_COLORS[ep.method] || '#3b82f6';
                              const isCopied = copyNotice === ep._id;

                              return (
                                <View key={ep._id} style={styles.endpointRow}>
                                  <View style={styles.endpointMain}>
                                    <View style={styles.endpointNameRow}>
                                      <View style={[styles.methodBadge, { backgroundColor: methodColor + '18' }]}>
                                        <Text style={[styles.methodText, { color: methodColor }]}>
                                          {ep.method || 'GET'}
                                        </Text>
                                      </View>
                                      <Text style={styles.endpointName}>{ep.name}</Text>
                                    </View>
                                    <Text style={styles.endpointUrl} numberOfLines={1}>
                                      {ep.endpoint}
                                    </Text>
                                    {ep.description ? (
                                      <Text style={styles.endpointDesc}>{ep.description}</Text>
                                    ) : null}
                                  </View>

                                  <View style={styles.endpointActions}>
                                    <TouchableOpacity
                                      style={[styles.copyBtn, isCopied && styles.copyBtnSuccess]}
                                      onPress={() => handleCopy(ep.endpoint, ep._id)}
                                      activeOpacity={0.7}
                                    >
                                      <Ionicons
                                        name={isCopied ? 'checkmark' : 'copy-outline'}
                                        size={13}
                                        color={isCopied ? '#166534' : '#475569'}
                                      />
                                      <Text style={[styles.copyText, isCopied && styles.copyTextSuccess]}>
                                        {isCopied ? 'Copied' : 'Copy'}
                                      </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                      style={styles.deleteEpBtn}
                                      onPress={() => handleDeleteEndpoint(project._id, ep._id, ep.name)}
                                      activeOpacity={0.7}
                                    >
                                      <Ionicons name="trash-outline" size={14} color="#ef4444" />
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* 3. Create / Edit Project Modal */}
      <Modal visible={projectModalVisible} transparent animationType="fade" onRequestClose={() => setProjectModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, isMobile && { width: '92%', maxWidth: '100%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="cube-outline" size={18} color="#3b82f6" />
                <Text style={styles.modalTitle}>{editingProject ? 'Edit Project' : 'Create API Project'}</Text>
              </View>
              <TouchableOpacity onPress={() => setProjectModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Project Name *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. Authentication Service or Portfolio API"
                  value={formProjectName}
                  onChangeText={setFormProjectName}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.fieldInput, { height: 70, textAlignVertical: 'top' }]}
                  placeholder="What service or microservice this project represents..."
                  value={formProjectDesc}
                  onChangeText={setFormProjectDesc}
                  multiline
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setProjectModalVisible(false)}
                disabled={savingProject}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveProject}
                disabled={savingProject}
              >
                {savingProject ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveBtnText}>{editingProject ? 'Update' : 'Create'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 4. Add Endpoint to Project Modal */}
      <Modal visible={endpointModalVisible} transparent animationType="fade" onRequestClose={() => setEndpointModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, isMobile && { width: '92%', maxWidth: '100%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="add-circle-outline" size={18} color="#10b981" />
                <Text style={styles.modalTitle}>Add API Endpoint</Text>
              </View>
              <TouchableOpacity onPress={() => setEndpointModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Endpoint Name *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. Login with JWT or Fetch User Profile"
                  value={formEndpointName}
                  onChangeText={setFormEndpointName}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Endpoint Path / URL *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. /api/auth/login"
                  value={formEndpointUrl}
                  onChangeText={setFormEndpointUrl}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Method</Text>
                <View style={styles.methodSelector}>
                  {METHODS.map((m) => {
                    const isSelected = formEndpointMethod === m;
                    const color = METHOD_COLORS[m];
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[
                          styles.methodOption,
                          isSelected && { backgroundColor: color, borderColor: color },
                        ]}
                        onPress={() => setFormEndpointMethod(m)}
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

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.fieldInput, { height: 60, textAlignVertical: 'top' }]}
                  placeholder="Brief note about payloads, query params, etc."
                  value={formEndpointDesc}
                  onChangeText={setFormEndpointDesc}
                  multiline
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEndpointModalVisible(false)}
                disabled={savingEndpoint}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: '#10b981' }]}
                onPress={handleSaveEndpoint}
                disabled={savingEndpoint}
              >
                {savingEndpoint ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Endpoint</Text>
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

  // Projects
  projectsList: {
    gap: 14,
  },
  projectCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#ffffff',
    gap: 12,
    flexWrap: 'wrap',
  },
  projectHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 200,
  },
  projectIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  projectDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  endpointCountBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  endpointCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  projectHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniAddEndpointBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  miniAddEndpointText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3b82f6',
  },
  actionBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  deleteBtn: {
    backgroundColor: '#fef2f2',
  },

  // Endpoints list
  endpointsContainer: {
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    padding: 12,
  },
  emptyEndpointsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  emptyEndpointsText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  emptyEndpointsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  emptyEndpointsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3b82f6',
  },
  endpointsList: {
    gap: 8,
  },
  endpointRow: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  endpointMain: {
    flex: 1,
    gap: 2,
  },
  endpointNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  methodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  methodText: {
    fontSize: 9,
    fontWeight: '800',
  },
  endpointName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  endpointUrl: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  endpointDesc: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  endpointActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  copyBtnSuccess: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  copyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  copyTextSuccess: {
    color: '#166534',
  },
  deleteEpBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
  },

  // Modals
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
    width: 460,
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
    minWidth: 80,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
