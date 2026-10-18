import React, { useEffect, useState } from 'react';
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
import { ScreenHeader, EmptyState, ImageUploader } from '../../components/common';
import styles from './styles/galleryStyles';

export default function GalleryScreen({ onNavigate }) {
  const { width } = useWindowDimensions();
  const numColumns = width < 500 ? 2 : width < 850 ? 3 : 4;

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
            <Ionicons name="image-outline" size={28} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.cardFooter}>
          <Text style={styles.photoTitle} numberOfLines={1}>
            {item.title || 'Untitled'}
          </Text>
          <TouchableOpacity
            onPress={() => handleDelete(item._id, item.title)}
            style={styles.trashBtn}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="trash-outline" size={15} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Photo Gallery"
        subtitle="Visual portfolio, event captures & media gallery"
        category="PORTFOLIO HUB"
        iconName="images-outline"
        onBack={() => onNavigate && onNavigate('Dashboard')}
        backText="Dashboard"
        rightAction={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color={colors.textLight} />
            <Text style={styles.addBtnText}>Add Photo</Text>
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          key={`gallery-grid-${numColumns}`}
          data={photos}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={renderPhotoItem}
          numColumns={numColumns}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchPhotos();
              }}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="images-outline"
              title="No Photos in Gallery"
              description="Add photos of workspaces, hackathons, and certifications."
              actionLabel="Add Photo"
              onAction={() => setModalVisible(true)}
            />
          }
        />
      )}

      {/* Add Photo Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Photo to Gallery</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Photo Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Workspace Setup, Hackathon Demo"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <ImageUploader
              label="Photo Image"
              value={images}
              onChange={setImages}
              folder="portfolio/gallery"
              aspectRatio="wide"
              placeholder="https://res.cloudinary.com/..."
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
              <Text style={styles.submitBtnText}>
                {saving ? 'Adding...' : 'Add to Gallery'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
