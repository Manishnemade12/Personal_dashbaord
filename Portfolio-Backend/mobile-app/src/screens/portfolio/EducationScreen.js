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

export default function EducationScreen({ onNavigate }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [educationList, setEducationList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState(null);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formSchool, setFormSchool] = useState('');
  const [formDegree, setFormDegree] = useState('');
  const [formField, setFormField] = useState('');
  const [formYear, setFormYear] = useState('');
  const [formGrade, setFormGrade] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchEducation = async () => {
    try {
      setLoading(true);
      const res = await api.getEducation();
      if (res && res.education) {
        setEducationList(res.education);
        setProfileId(res._id);
      } else {
        setEducationList([]);
      }
    } catch (err) {
      console.error('Error fetching education:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEducation();
  }, []);

  const handleOpenAdd = () => {
    setEditingIndex(null);
    setFormSchool('');
    setFormDegree('');
    setFormField('');
    setFormYear('');
    setFormGrade('');
    setFormDesc('');
    setModalVisible(true);
  };

  const handleOpenEdit = (item, index) => {
    setEditingIndex(index);
    setFormSchool(item.school || '');
    setFormDegree(item.degree || '');
    setFormField(item.fieldOfStudy || '');
    setFormYear(item.year || '');
    setFormGrade(item.grade || '');
    setFormDesc(item.educationDescription || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formSchool.trim()) {
      alert('School or Institute name is required.');
      return;
    }

    try {
      setSaving(true);
      const newEntry = {
        school: formSchool.trim(),
        degree: formDegree.trim(),
        fieldOfStudy: formField.trim(),
        year: formYear.trim(),
        grade: formGrade.trim(),
        educationDescription: formDesc.trim(),
      };

      let updatedList = [...educationList];
      if (editingIndex !== null) {
        updatedList[editingIndex] = { ...updatedList[editingIndex], ...newEntry };
      } else {
        updatedList.unshift(newEntry);
      }

      await api.updateEducation({ _id: profileId, education: updatedList });
      setModalVisible(false);
      fetchEducation();
    } catch (err) {
      alert(err.message || 'Error saving education');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (index, schoolName) => {
    const doDelete = async () => {
      try {
        const updatedList = educationList.filter((_, i) => i !== index);
        await api.updateEducation({ _id: profileId, education: updatedList });
        fetchEducation();
      } catch (err) {
        alert(err.message || 'Error deleting education');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete education record for "${schoolName}"?`)) {
        doDelete();
      }
    } else {
      Alert.alert('Delete Education', `Delete "${schoolName}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
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
            <Text style={styles.screenTitle}>Education & Academics</Text>
            <Text style={styles.screenSubtitle}>
              Degrees, certifications & academic background
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={fetchEducation}
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
            <Text style={styles.addBtnText}>Add Degree</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Timeline List */}
      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading education credentials...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
          {educationList.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="school-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Education Details</Text>
              <Text style={styles.emptySubtitle}>Add your colleges, degrees, or certifications</Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={handleOpenAdd}>
                <Ionicons name="add" size={16} color="#ffffff" />
                <Text style={styles.emptyAddBtnText}>Add Education</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.timelineList}>
              {educationList.map((item, index) => {
                const isFirst = index === 0;
                const isLast = index === educationList.length - 1;

                return (
                  <View key={item._id || index} style={styles.timelineItem}>
                    {/* Left Timeline Bar & Dot */}
                    <View style={styles.timelineTrack}>
                      <View style={[styles.timelineDot, isFirst && styles.timelineDotActive]}>
                        <Ionicons name="school" size={13} color="#ffffff" />
                      </View>
                      {!isLast && <View style={styles.timelineLine} />}
                    </View>

                    {/* Right Card */}
                    <View style={styles.educationCard}>
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Text style={styles.schoolTitle}>{item.school}</Text>
                            {item.year ? (
                              <View style={styles.yearBadge}>
                                <Text style={styles.yearText}>{item.year}</Text>
                              </View>
                            ) : null}
                          </View>

                          {(item.degree || item.fieldOfStudy) ? (
                            <Text style={styles.degreeText}>
                              {item.degree}
                              {item.degree && item.fieldOfStudy ? ' in ' : ''}
                              {item.fieldOfStudy}
                            </Text>
                          ) : null}

                          {item.grade ? (
                            <View style={styles.gradeRow}>
                              <Ionicons name="ribbon-outline" size={13} color="#16a34a" />
                              <Text style={styles.gradeText}>{item.grade}</Text>
                            </View>
                          ) : null}
                        </View>

                        <View style={styles.cardActions}>
                          <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => handleOpenEdit(item, index)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="pencil-outline" size={14} color="#475569" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.deleteBtn]}
                            onPress={() => handleDelete(index, item.school)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={14} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {item.educationDescription ? (
                        <View style={styles.descWrap}>
                          <Text style={styles.descText}>{item.educationDescription}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* 3. Create / Edit Education Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, isMobile && { width: '92%', maxWidth: '100%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="school" size={18} color="#3b82f6" />
                <Text style={styles.modalTitle}>
                  {editingIndex !== null ? 'Edit Education' : 'Add Education Record'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>School / University / Institute *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. Stanford University or IIT Bombay"
                  value={formSchool}
                  onChangeText={setFormSchool}
                />
              </View>

              <View style={styles.fieldRow}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Degree</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. Master of Science"
                    value={formDegree}
                    onChangeText={setFormDegree}
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Field of Study</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. Computer Science"
                    value={formField}
                    onChangeText={setFormField}
                  />
                </View>
              </View>

              <View style={styles.fieldRow}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Year Range</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. 2020 - 2024"
                    value={formYear}
                    onChangeText={setFormYear}
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Grade / Honours</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. 3.9 GPA / Distinction"
                    value={formGrade}
                    onChangeText={setFormGrade}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Description & Achievements (Optional)</Text>
                <TextInput
                  style={[styles.fieldInput, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Specializations, thesis, relevant coursework, or extracurricular honors..."
                  value={formDesc}
                  onChangeText={setFormDesc}
                  multiline
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingIndex !== null ? 'Update Record' : 'Save Education'}
                  </Text>
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

  // Timeline
  timelineList: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timelineTrack: {
    alignItems: 'center',
    width: 28,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineDotActive: {
    backgroundColor: '#7e37d8',
    shadowColor: '#7e37d8',
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  timelineLine: {
    width: 2,
    backgroundColor: '#e2e8f0',
    flex: 1,
    minHeight: 40,
    marginVertical: 4,
  },
  educationCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  schoolTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  yearBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  yearText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  degreeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
    marginTop: 3,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  gradeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  deleteBtn: {
    backgroundColor: '#fef2f2',
  },
  descWrap: {
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    paddingTop: 8,
  },
  descText: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
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
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
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
    minWidth: 110,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
