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
  useWindowDimensions,
} from 'react-native';
import { colors } from '../../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader, EmptyState } from '../../components/common';
import styles from './styles/educationStyles';

export default function EducationScreen({ onNavigate }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 680;

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
      Alert.alert('Required', 'School or Institute name is required.');
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
      Alert.alert('Error', err.message || 'Error saving education');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (index, schoolName) => {
    Alert.alert(
      'Delete Education',
      `Delete "${schoolName || 'entry'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedList = educationList.filter((_, i) => i !== index);
              await api.updateEducation({ _id: profileId, education: updatedList });
              fetchEducation();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete education record.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={{ flex: 1 }}>
          <ScreenHeader
            title="Education & Academics"
            subtitle="Manage degrees, colleges, certifications & academic credentials"
            category="PORTFOLIO HUB"
            iconName="school-outline"
            onBack={() => onNavigate && onNavigate('Dashboard')}
            backText="Dashboard"
          />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      ) : (
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
          <ScreenHeader
            title="Education & Academics"
            subtitle="Manage degrees, colleges, certifications & academic credentials"
            category="PORTFOLIO HUB"
            iconName="school-outline"
            onBack={() => onNavigate && onNavigate('Dashboard')}
            backText="Dashboard"
            rightAction={
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.refreshBtn}
                  onPress={fetchEducation}
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
                  <Text style={styles.addBtnText}>Add Record</Text>
                </TouchableOpacity>
              </View>
            }
          />
          {educationList.length === 0 ? (
            <EmptyState
              icon="school-outline"
              title="No Education Records"
              description="Add your university degrees, colleges, or formal training credentials."
              actionLabel="Add Education"
              onAction={handleOpenAdd}
            />
          ) : (
            <View style={styles.timelineList}>
              {educationList.map((item, index) => {
                const isFirst = index === 0;
                const isLast = index === educationList.length - 1;

                return (
                  <View key={item._id || index} style={styles.timelineItem}>
                    <View style={styles.timelineTrack}>
                      <View style={[styles.timelineDot, isFirst && styles.timelineDotActive]}>
                        <Ionicons name="school" size={12} color="#ffffff" />
                      </View>
                      {!isLast && <View style={styles.timelineLine} />}
                    </View>

                    <View style={styles.educationCard}>
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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
                              <Ionicons name="ribbon-outline" size={12} color={colors.success} />
                              <Text style={styles.gradeText}>{item.grade}</Text>
                            </View>
                          ) : null}
                        </View>

                        <View style={styles.cardActions}>
                          <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => handleOpenEdit(item, index)}
                            activeOpacity={0.7}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="create-outline" size={14} color={colors.primary} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionBtn, styles.deleteBtn]}
                            onPress={() => handleDelete(index, item.school)}
                            activeOpacity={0.7}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="trash-outline" size={14} color={colors.danger} />
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

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="school" size={18} color={colors.primary} />
                <Text style={styles.modalTitle}>
                  {editingIndex !== null ? 'Edit Education' : 'Add Education Record'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
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
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.fieldRow}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Degree</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. B.Tech / M.S."
                    value={formDegree}
                    onChangeText={setFormDegree}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Field of Study</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. Computer Science"
                    value={formField}
                    onChangeText={setFormField}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.fieldRow}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Year / Batch</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. 2020 - 2024"
                    value={formYear}
                    onChangeText={setFormYear}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Grade / CGPA</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. 9.2 CGPA / First Class"
                    value={formGrade}
                    onChangeText={setFormGrade}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Key Highlights / Description</Text>
                <TextInput
                  style={[styles.fieldInput, styles.fieldInputMultiline]}
                  placeholder="Relevant coursework, honors, projects..."
                  value={formDesc}
                  onChangeText={setFormDesc}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color={colors.textLight} size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingIndex !== null ? 'Update Record' : 'Save Record'}
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
