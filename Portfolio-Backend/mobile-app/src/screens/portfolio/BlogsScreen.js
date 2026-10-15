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
  Image,
} from 'react-native';
import { colors } from '../../constants/theme';
import { api } from '../../api/client';
import { Ionicons } from '@expo/vector-icons';

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

  const filteredBlogs = blogs.filter((b) => {
    let matchesStatus = true;
    if (filter === 'publish') matchesStatus = b.status === 'publish';
    else if (filter === 'draft') matchesStatus = b.status === 'draft';

    const matchesSearch =
      searchQuery.trim() === '' ||
      b.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.slug?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const renderBlogItem = ({ item, index }) => {
    const isPublished = item.status === 'publish';
    const firstImage = Array.isArray(item.images) ? item.images[0] : item.images;

    return (
      <View style={styles.blogRowCard}>
        {/* Index number & Thumbnail */}
        <View style={styles.indexCol}>
          <Text style={styles.indexNum}>#{index + 1}</Text>
        </View>

        <View style={styles.thumbWrap}>
          {firstImage ? (
            <Image source={{ uri: firstImage }} style={styles.thumbImage} />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <Ionicons name="image-outline" size={24} color="#94a3b8" />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoCol}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.tagsRow}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: isPublished ? '#ecfdf5' : '#fef3c7' },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: isPublished ? '#059669' : '#d97706' },
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
        </View>

        {/* Edit / Delete actions */}
        <View style={styles.actionsCol}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => onNavigate && onNavigate('BlogForm', { blog: item })}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={18} color="#7e37d8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item._id, item.title)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 1. Header with Breadcrumb */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headingTitle}>
            {filter === 'draft' ? 'Draft' : 'All Published'} <Text style={styles.headingSpan}>Blogs</Text>
          </Text>
          <Text style={styles.headingSubtitle}>ADMIN PANEL</Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => onNavigate && onNavigate('BlogForm')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text style={styles.addBtnText}>Add Blog</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Filter Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, filter === 'publish' && styles.tabActive]}
          onPress={() => setFilter('publish')}
        >
          <Text style={[styles.tabText, filter === 'publish' && styles.tabTextActive]}>
            Published ({blogs.filter((b) => b.status === 'publish').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, filter === 'draft' && styles.tabActive]}
          onPress={() => setFilter('draft')}
        >
          <Text style={[styles.tabText, filter === 'draft' && styles.tabTextActive]}>
            Drafts ({blogs.filter((b) => b.status === 'draft').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, filter === 'all' && styles.tabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.tabText, filter === 'all' && styles.tabTextActive]}>
            All ({blogs.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Search Bar */}
      <View style={styles.searchBarWrap}>
        <Ionicons name="search-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search By Title..."
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

      {/* 4. List / Table */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#7e37d8" />
          <Text style={styles.loadingText}>Loading blogs...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBlogs}
          keyExtractor={(item) => item._id}
          renderItem={renderBlogItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchBlogs} colors={['#7e37d8']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="document-text-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No Blogs found</Text>
            </View>
          }
        />
      )}
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
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#7e37d8',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ffffff',
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
  blogRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  indexCol: {
    width: 28,
    alignItems: 'center',
  },
  indexNum: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
  },
  thumbWrap: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    marginRight: 12,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  categoryBadge: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  actionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#eee8fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
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
});
