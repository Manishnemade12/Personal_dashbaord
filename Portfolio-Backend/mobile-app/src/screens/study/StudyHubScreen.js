import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StudyDao } from '../../db/dao/StudyDao';
import CreateFieldModal from '../../components/study/CreateFieldModal';

export default function StudyHubScreen({
  onSelectField,
  onExitToDashboard,
}) {
  const [fields, setFields] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [allChunks, setAllChunks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [fList, sList, cList] = await Promise.all([
        StudyDao.getFields(),
        StudyDao.getSubjects(),
        StudyDao.getChunks(),
      ]);
      setFields(fList || []);
      setAllSubjects(sList || []);
      setAllChunks(cList || []);
    } catch (err) {
      console.warn('[StudyHub] Load data error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate metrics per field
  const fieldStatsMap = useMemo(() => {
    const map = {};
    for (const f of fields) {
      const fieldSubjs = allSubjects.filter((s) => {
        if (f.clientId === 'field_ssc' || f.id === 'field_ssc') {
          return s.fieldId === 'field_ssc' || !s.fieldId;
        }
        return s.fieldId === f.clientId || s.fieldId === f.id;
      });
      const subjIds = new Set(fieldSubjs.map((s) => s.id));
      const fieldChunks = allChunks.filter((c) => subjIds.has(c.subjectId));

      map[f.id || f.clientId] = {
        subjectCount: fieldSubjs.length,
        chunkCount: fieldChunks.length,
      };
    }
    return map;
  }, [fields, allSubjects, allChunks]);

  const handleOpenCreate = () => {
    setEditingField(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (field) => {
    setEditingField(field);
    setModalVisible(true);
  };

  const handleSaveField = async (formData) => {
    try {
      if (editingField) {
        await StudyDao.updateField(editingField.id || editingField.clientId, formData);
      } else {
        await StudyDao.createField(formData);
      }
      await loadData();
    } catch (err) {
      console.warn('[StudyHub] Save field error:', err);
    }
  };

  const handleDeleteField = (field) => {
    if (field.isDefault) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Cannot delete the default study workspace.');
      } else {
        Alert.alert('Protected Folder', 'Cannot delete the default study workspace.');
      }
      return;
    }

    const doDelete = async () => {
      try {
        await StudyDao.deleteField(field.id || field.clientId);
        await loadData();
      } catch (err) {
        console.warn('[StudyHub] Delete field error:', err);
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Are you sure you want to delete "${field.name}"? Any existing subjects will be moved to SSC Exam Prep.`)) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Delete Study Folder',
        `Are you sure you want to delete "${field.name}"? Any existing subjects will be moved to SSC Exam Prep.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0f19" />

      {/* Top Header */}
      <View style={styles.topHeader}>
        {/* Left: Exit to Main Dashboard */}
        <TouchableOpacity
          style={styles.exitBtn}
          onPress={onExitToDashboard}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={15} color="#ffffff" />
          <Text style={styles.exitBtnText}>Exit</Text>
        </TouchableOpacity>

        {/* Center: Brand */}
        <View style={styles.headerCenter}>
          <View style={styles.headerIconBubble}>
            <Ionicons name="folder-open" size={14} color="#ffffff" />
          </View>
          <Text style={styles.headerTitle} numberOfLines={1}>Study Hub</Text>
        </View>

        {/* Right: + New Folder */}
        <TouchableOpacity
          style={styles.addFieldBtn}
          onPress={handleOpenCreate}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#ffffff" />
          <Text style={styles.addFieldBtnText}>New Folder</Text>
        </TouchableOpacity>
      </View>

      {/* Main Scrollable View */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        horizontal={false}
        alwaysBounceHorizontal={false}
      >
        {/* Hero Section */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={12} color="#ffffff" />
            <Text style={styles.heroBadgeText}>Categorized Study Spaces</Text>
          </View>

          <Text style={styles.heroTitle}>Your Study Folders</Text>
          <Text style={styles.heroSubtitle}>
            Keep SSC Preparation, Engineering, and other goals completely separated with dedicated notes, subjects, and daily quizzes.
          </Text>

          {/* Quick Stats Strip */}
          <View style={styles.statsStrip}>
            <View style={styles.statPill}>
              <Ionicons name="folder-outline" size={13} color="#a5b4fc" />
              <Text style={styles.statPillText}>{fields.length} Folders</Text>
            </View>
            <View style={styles.statPill}>
              <Ionicons name="book-outline" size={13} color="#a5b4fc" />
              <Text style={styles.statPillText}>{allSubjects.length} Subjects</Text>
            </View>
            <View style={styles.statPill}>
              <Ionicons name="documents-outline" size={13} color="#a5b4fc" />
              <Text style={styles.statPillText}>{allChunks.length} Notes</Text>
            </View>
          </View>
        </View>

        {/* Section Heading */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Select a Study Workspace</Text>
          <Text style={styles.sectionSub}>{fields.length} available</Text>
        </View>

        {/* Field Cards Grid */}
        <View style={styles.fieldsGrid}>
          {fields.map((f) => {
            const stats = fieldStatsMap[f.id || f.clientId] || { subjectCount: 0, chunkCount: 0 };
            const cardColor = f.color || '#6366f1';

            return (
              <View key={f.id || f.clientId} style={styles.fieldCard}>
                {/* Accent Color Top Stripe */}
                <View style={[styles.fieldAccentBar, { backgroundColor: cardColor }]} />

                <View style={styles.fieldCardBody}>
                  {/* Top Bar: Icon + Action Buttons */}
                  <View style={styles.fieldTopRow}>
                    <View style={[styles.fieldIconBubble, { backgroundColor: cardColor }]}>
                      <Ionicons name={f.icon || 'school-outline'} size={20} color="#ffffff" />
                    </View>

                    <View style={styles.fieldActionGroup}>
                      {f.isDefault ? (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>Default</Text>
                        </View>
                      ) : null}

                      <TouchableOpacity
                        style={styles.fieldSmallBtn}
                        onPress={() => handleOpenEdit(f)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="pencil-outline" size={14} color="#94a3b8" />
                      </TouchableOpacity>

                      {!f.isDefault ? (
                        <TouchableOpacity
                          style={styles.fieldSmallBtn}
                          onPress={() => handleDeleteField(f)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={14} color="#f43f5e" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>

                  {/* Title & Description */}
                  <Text style={styles.fieldName} numberOfLines={1}>{f.name}</Text>
                  <Text style={styles.fieldDesc} numberOfLines={2}>
                    {f.description || 'Separate workspace for notes, subjects and daily tests.'}
                  </Text>

                  {/* Metric Chips */}
                  <View style={styles.fieldMetricsRow}>
                    <View style={styles.fieldMetricChip}>
                      <Ionicons name="book-outline" size={12} color="#94a3b8" />
                      <Text style={styles.fieldMetricText}>{stats.subjectCount} Subjects</Text>
                    </View>
                    <View style={styles.fieldMetricChip}>
                      <Ionicons name="documents-outline" size={12} color="#94a3b8" />
                      <Text style={styles.fieldMetricText}>{stats.chunkCount} Notes</Text>
                    </View>
                  </View>

                  {/* Open Workspace Button */}
                  <TouchableOpacity
                    style={[styles.openWorkspaceBtn, { backgroundColor: cardColor }]}
                    onPress={() => onSelectField(f)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.openWorkspaceBtnText}>Open Workspace</Text>
                    <Ionicons name="arrow-forward" size={15} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {/* Add New Field Dashed Box */}
          <TouchableOpacity
            style={styles.addDashedCard}
            onPress={handleOpenCreate}
            activeOpacity={0.8}
          >
            <View style={styles.addDashedIconWrap}>
              <Ionicons name="add" size={24} color="#6366f1" />
            </View>
            <Text style={styles.addDashedTitle}>Create New Folder</Text>
            <Text style={styles.addDashedSub}>
              Add another course or exam space (e.g. GATE, Semester Exams, UPSC).
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Create / Edit Field Modal */}
      <CreateFieldModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveField}
        fieldToEdit={editingField}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  topHeader: {
    height: 52,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    zIndex: 10,
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexShrink: 0,
  },
  exitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  headerIconBubble: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  addFieldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#6366f1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexShrink: 0,
  },
  addFieldBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  scrollContainer: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  scrollContent: {
    padding: 14,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
    overflow: 'hidden',
  },
  heroCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#312e81',
    padding: 16,
    marginBottom: 18,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#c7d2fe',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
    marginBottom: 14,
  },
  statsStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f8fafc',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  fieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
    maxWidth: '100%',
  },
  fieldCard: {
    flex: 1,
    flexBasis: '47%',
    minWidth: 260,
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
    overflow: 'hidden',
  },
  fieldAccentBar: {
    height: 4,
    width: '100%',
  },
  fieldCardBody: {
    padding: 14,
  },
  fieldTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  fieldIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  defaultBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#818cf8',
    textTransform: 'uppercase',
  },
  fieldSmallBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  fieldDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
    marginBottom: 14,
    minHeight: 36,
  },
  fieldMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  fieldMetricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fieldMetricText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#cbd5e1',
  },
  openWorkspaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  openWorkspaceBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  addDashedCard: {
    flex: 1,
    flexBasis: '47%',
    minWidth: 260,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#1f2937',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  addDashedIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  addDashedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  addDashedSub: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 220,
    lineHeight: 16,
  },
});
