import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  useWindowDimensions,
} from 'react-native';
import { colors } from '../../styles/theme';
import { api } from '../../api/client';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, SearchInput, EmptyState, ImageUploader } from '../../components/common';
import styles from './styles/skillsStyles';

export default function SkillsScreen({ routeParams, onNavigate }) {
  const { width } = useWindowDimensions();
  const numColumns = width < 480 ? 1 : width < 800 ? 2 : 3;

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

  const filteredSkills = useMemo(() => {
    return skills.filter((s) =>
      searchQuery.trim() === ''
        ? true
        : s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [skills, searchQuery]);

  const renderSkillItem = ({ item }) => {
    const firstImg = Array.isArray(item.images) ? item.images[0] : item.images;

    return (
      <View style={styles.skillCard}>
        <View style={styles.cardTop}>
          <View style={styles.iconBox}>
            {firstImg ? (
              <Image source={{ uri: firstImg }} style={styles.skillImg} />
            ) : (
              <Ionicons name="code-slash" size={20} color={colors.primary} />
            )}
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnEdit]}
              onPress={() => openModal(item)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="create-outline" size={14} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDelete]}
              onPress={() => handleDelete(item._id, item.title)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="trash-outline" size={14} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.skillTitle} numberOfLines={1}>{item.title}</Text>
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
      {loading ? (
        <View style={{ flex: 1 }}>
          <ScreenHeader
            title="Technical Skills"
            subtitle="Manage programming languages, frameworks & tech tools"
            category="PORTFOLIO HUB"
            iconName="code-slash-outline"
            onBack={() => onNavigate && onNavigate('Dashboard')}
            backText="Dashboard"
          />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      ) : (
        <FlatList
          key={`skills-grid-${numColumns}`}
          data={filteredSkills}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={renderSkillItem}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchSkills}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            <View>
              <ScreenHeader
                title="Technical Skills"
                subtitle="Manage programming languages, frameworks & tech tools"
                category="PORTFOLIO HUB"
                iconName="code-slash-outline"
                onBack={() => onNavigate && onNavigate('Dashboard')}
                backText="Dashboard"
                rightAction={
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => openModal()}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={13} color={colors.textLight} />
                    <Text style={styles.addBtnText}>Add Skill</Text>
                  </TouchableOpacity>
                }
              />
              <View style={{ marginBottom: 8, paddingHorizontal: 2 }}>
                <SearchInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search tech stack or skill level..."
                />
              </View>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="code-slash-outline"
              title="No Skills Added"
              description="Add your core engineering competencies, libraries, and tools."
              actionLabel="Add Skill"
              onAction={() => openModal()}
            />
          }
        />
      )}

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSkill ? 'Edit Skill' : 'Add New Skill'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Skill Title *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. React Native, TypeScript, Docker"
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description / Proficiency</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Advanced / 4+ Years Experience"
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            <ImageUploader
              label="Icon / Image"
              value={images}
              onChange={setImages}
              folder="portfolio/skills"
              aspectRatio="square"
              placeholder="https://res.cloudinary.com/..."
            />

            <TouchableOpacity
              style={styles.saveModalBtn}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
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
