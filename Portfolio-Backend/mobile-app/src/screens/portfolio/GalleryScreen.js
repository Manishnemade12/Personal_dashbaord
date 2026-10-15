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

export default function GalleryScreen() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [images, setImages] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPhotos = async () => {
    try {
      const data = await api.getPhotos();
      setPhotos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log('Error fetching photos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  const handleSave = async () => {
    if (!title.trim() && !images.trim()) {
      Alert.alert('Required', 'Please enter a title and image URL.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        images: images ? images.split(',').map((img) => img.trim()).filter(Boolean) : [],
      };

      await api.createPhoto(payload);
      Alert.alert('Success', 'Photo uploaded to gallery!');
      setTitle('');
      setImages('');
      setModalVisible(false);
      fetchPhotos();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save photo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id, photoTitle) => {
    Alert.alert(
      'Delete Photo',
      `Delete "${photoTitle || 'photo'}" from gallery?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deletePhoto(id);
              fetchPhotos();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete photo.');
            }
          },
        },
      ]
    );
  };

  const renderPhotoItem = ({ item }) => {
    const imgUrl = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : item.images;

    return (
      <View style={styles.card}>
        {imgUrl ? (
          <Image source={{ uri: imgUrl }} style={styles.photoImage} resizeMode="cover" />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="image-outline" size={36} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.cardFooter}>
          <Text style={styles.photoTitle} numberOfLines={1}>
            {item.title || 'Untitled'}
          </Text>
          <TouchableOpacity onPress={() => handleDelete(item._id, item.title)} style={styles.trashBtn}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Bar with Admin Breadcrumb */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.headingTitle}>
            All <Text style={styles.headingSpan}>Photos</Text>
          </Text>
          <Text style={styles.headingSubtitle}>ADMIN PANEL</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text style={styles.addBtnText}>Add Photo</Text>
        </TouchableOpacity>
      </View>

      {/* Grid */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={renderPhotoItem}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchPhotos(); }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No photos in gallery</Text>
            </View>
          }
        />
      )}

      {/* Add Photo Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Photo to Gallery</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Photo Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Workspace Setup, Award Event"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Image URL *</Text>
              <TextInput
                style={styles.input}
                placeholder="https://example.com/photo.jpg"
                value={images}
                onChangeText={setImages}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>Add to Gallery</Text>
              )}
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
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
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
  screenHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  addBtn: {
    backgroundColor: '#7e37d8',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 4,
  },
  addBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  listContent: {
    padding: 12,
    paddingBottom: 40,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  photoImage: {
    width: '100%',
    height: 130,
    backgroundColor: '#f1f5f9',
  },
  photoPlaceholder: {
    width: '100%',
    height: 130,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
  },
  photoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
  },
  trashBtn: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 15,
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 14,
    color: colors.textPrimary,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
