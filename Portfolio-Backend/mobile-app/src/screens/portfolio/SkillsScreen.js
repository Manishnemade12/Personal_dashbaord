import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { colors } from '../../constants/theme';
import { api } from '../../api/client';
import { Ionicons } from '@expo/vector-icons';

export default function SkillsScreen({ routeParams }) {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchSkills = async () => {
    try {
      const data = await api.getSkills();
      setSkills(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log('Error fetching skills:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSkills();
    if (routeParams?.openAdd) {
      openModal();
    }
  }, [routeParams]);

  const openModal = (skill = null) => {
    setEditingSkill(skill);
    if (skill) {
      setTitle(skill.title || '');
      setDescription(skill.description || '');
      setImages(Array.isArray(skill.images) ? skill.images.join(', ') : skill.images || '');
    } else {
      setTitle('');
      setDescription('');
      setImages('');
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter skill title.');
      return;
    }

    setSaving(true);
    try {
      const imgArray = images ? images.split(',').map((s) => s.trim()).filter(Boolean) : [];
      if (editingSkill?._id) {
        await api.updateSkill({
          _id: editingSkill._id,
          title: title.trim(),
          description: description.trim(),
          images: imgArray,
        });
        Alert.alert('Success', 'Skill updated successfully!');
      } else {
        await api.createSkill({
          title: title.trim(),
          description: description.trim(),
          images: imgArray,
        });
        Alert.alert('Success', 'Skill created successfully!');
      }
      setModalVisible(false);
      fetchSkills();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save skill');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id, skillTitle) => {
    Alert.alert(
      'Delete Skill',
      `Are you sure you want to delete "${skillTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteSkill(id);
              fetchSkills();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete skill.');
            }
          },
        },
      ]
    );
  };

  const filteredSkills = skills.filter((s) =>
    searchQuery.trim() === ''
      ? true
      : s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderSkillItem = ({ item }) => {
    const firstImg = Array.isArray(item.images) ? item.images[0] : item.images;

    return (
      <View style={styles.skillCard}>
        <View style={styles.cardTop}>
          <View style={styles.iconBox}>
            {firstImg ? (
              <Image source={{ uri: firstImg }} style={styles.skillImg} />
            ) : (
              <Ionicons name="code-slash" size={24} color="#7e37d8" />
            )}
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionBtnEdit}
              onPress={() => openModal(item)}
            >
              <Ionicons name="create-outline" size={16} color="#7e37d8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnDelete}
              onPress={() => handleDelete(item._id, item.title)}
            >
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.skillTitle}>{item.title}</Text>
        {item.description ? (
          <Text style={styles.skillDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headingTitle}>
            All <Text style={styles.headingSpan}>Skills</Text>
          </Text>
          <Text style={styles.headingSubtitle}>ADMIN PANEL</Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => openModal()}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text style={styles.addBtnText}>Add Skill</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBarWrap}>
        <Ionicons name="search-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search Skills..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#7e37d8" />
          <Text style={styles.loadingText}>Loading skills...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSkills}
          keyExtractor={(item) => item._id}
          renderItem={renderSkillItem}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchSkills} colors={['#7e37d8']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="code-slash-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No Skills found</Text>
            </View>
          }
        />
      )}

      {/* Add / Edit Skill Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSkill ? 'Edit Skill' : 'Add New Skill'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Skill Title *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. React Native, Node.js, Docker"
                placeholderTextColor="#94a3b8"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description / Level</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Advanced / 3+ Years Experience"
                placeholderTextColor="#94a3b8"
                value={description}
                onChangeText={setDescription}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Icon / Image URL</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="https://example.com/icon.png"
                placeholderTextColor="#94a3b8"
                value={images}
                onChangeText={setImages}
              />
            </View>

            <TouchableOpacity
              style={styles.saveModalBtn}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveModalBtnText}>
                {saving ? 'Saving...' : editingSkill ? 'Update Skill' : 'Create Skill'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(248, 250, 252)',
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headingTitle: {
    color: '#7e37d8',
    fontSize: 24,
    fontWeight: '800',
  },
  headingSpan: {
    color: '#000000',
  },
  headingSubtitle: {
    color: '#7e37d8',
    letterSpacing: 3,
    fontWeight: '700',
    fontSize: 12,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7e37d8',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 4,
  },
  addBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
  },
  listContent: {
    paddingBottom: 30,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  skillCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eee8fa',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  skillImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtnEdit: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#eee8fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnDelete: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skillTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  skillDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 15,
    color: '#7e37d8',
    fontWeight: '600',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#0f172a',
  },
  saveModalBtn: {
    backgroundColor: '#7e37d8',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  saveModalBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
