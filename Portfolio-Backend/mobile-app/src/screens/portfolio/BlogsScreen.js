import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { colors } from '../../styles/theme';
import { api } from '../../api/client';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, FilterTabs, SearchInput, EmptyState } from '../../components/common';
import styles from './styles/blogsStyles';

export default function BlogsScreen({ onNavigate, initialFilter = 'publish' }) {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState(initialFilter); // 'publish', 'draft', or 'all'
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBlogs = async () => {
    try {
      const data = await api.getBlogs();
      setBlogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log('Error fetching blogs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handleDelete = (id, title) => {
    Alert.alert(
      'Delete Blog',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteBlog(id);
              fetchBlogs();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete blog.');
            }
          },
        },
      ]
    );
  };

  const filteredBlogs = useMemo(() => {
    return blogs.filter((b) => {
      let matchesStatus = true;
      if (filter === 'publish') matchesStatus = b.status === 'publish';
      else if (filter === 'draft') matchesStatus = b.status === 'draft';

      const matchesSearch =
        searchQuery.trim() === '' ||
        b.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.slug?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [blogs, filter, searchQuery]);

  const filterTabs = [
    { key: 'all', label: 'All Articles', count: blogs.length },
    { key: 'publish', label: 'Published', count: blogs.filter((b) => b.status === 'publish').length },
    { key: 'draft', label: 'Drafts', count: blogs.filter((b) => b.status === 'draft').length },
  ];

  const renderBlogItem = ({ item, index }) => {
    const isPublished = item.status === 'publish';
    const firstImage = Array.isArray(item.images) ? item.images[0] : item.images;

    return (
      <View style={styles.blogCard}>
        <View style={styles.cardMainRow}>
          <View style={styles.thumbWrap}>
            {firstImage ? (
              <Image source={{ uri: firstImage }} style={styles.thumbImage} resizeMode="cover" />
            ) : (
              <View style={styles.thumbPlaceholder}>
                <Ionicons name="document-text-outline" size={20} color={colors.textMuted} />
              </View>
            )}
            {Array.isArray(item.images) && item.images.length > 1 && (
              <View style={styles.multiImgBadge}>
                <Ionicons name="images" size={8} color="#fff" />
                <Text style={styles.multiImgText}>{item.images.length}</Text>
              </View>
            )}
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {item.description ? (
              <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.cardFooterRow}>
          <View style={styles.tagsCol}>
            <View
              style={[
                styles.statusBadge,
                isPublished ? styles.statusBadgePublished : styles.statusBadgeDraft,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: isPublished ? colors.successText : colors.warningText },
                ]}
              >
                {isPublished ? 'Published' : 'Draft'}
              </Text>
            </View>

            {item.blogcategory ? (
              <Text style={styles.categoryBadge} numberOfLines={1}>
                {Array.isArray(item.blogcategory) ? item.blogcategory.join(', ') : item.blogcategory}
              </Text>
            ) : null}
          </View>

          <View style={styles.actionsCol}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.editBtn]}
              onPress={() => onNavigate && onNavigate('BlogForm', { blog: item })}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="create-outline" size={16} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={() => handleDelete(item._id, item.title)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={{ flex: 1 }}>
          <ScreenHeader
            title="Blog Articles"
            subtitle="Manage and organize published portfolio articles"
            category="CONTENT HUB"
            iconName="newspaper-outline"
            onBack={() => onNavigate && onNavigate('Dashboard')}
            backText="Dashboard"
          />
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading articles...</Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={filteredBlogs}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={renderBlogItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchBlogs();
              }}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            <View>
              <ScreenHeader
                title="Blog Articles"
                subtitle="Manage and organize published portfolio articles"
                category="CONTENT HUB"
                iconName="newspaper-outline"
                onBack={() => onNavigate && onNavigate('Dashboard')}
                backText="Dashboard"
                rightAction={
                  <TouchableOpacity
                    style={styles.createBtn}
                    onPress={() => onNavigate && onNavigate('BlogForm')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={13} color={colors.textLight} />
                    <Text style={styles.createBtnText}>New Article</Text>
                  </TouchableOpacity>
                }
              />
              <View style={styles.filterSection}>
                <SearchInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search articles by title or keyword..."
                />
                <FilterTabs
                  tabs={filterTabs}
                  activeTab={filter}
                  onSelectTab={setFilter}
                />
              </View>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="newspaper-outline"
              title="No Articles Found"
              description={
                searchQuery
                  ? `No blogs matching "${searchQuery}"`
                  : 'Start writing your first blog post to share tech knowledge.'
              }
              actionLabel="Write Blog"
              onAction={() => onNavigate && onNavigate('BlogForm')}
            />
          }
        />
      )}
    </View>
  );
}
