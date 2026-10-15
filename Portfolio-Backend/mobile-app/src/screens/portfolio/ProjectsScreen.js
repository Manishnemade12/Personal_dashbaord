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
  Linking,
} from 'react-native';
import { colors } from '../../styles/theme';
import { api } from '../../api/client';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, FilterTabs, SearchInput, EmptyState } from '../../components/common';
import styles from './styles/projectsStyles';

export default function ProjectsScreen({ onNavigate, initialFilter = 'publish' }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState(initialFilter); // 'publish', 'draft', or 'all'
  const [searchQuery, setSearchQuery] = useState('');

  const fetchProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log('Error fetching projects:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = (id, title) => {
    Alert.alert(
      'Delete Project',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteProject(id);
              fetchProjects();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete project.');
            }
          },
        },
      ]
    );
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      let matchesStatus = true;
      if (filter === 'publish') matchesStatus = p.status === 'publish';
      else if (filter === 'draft') matchesStatus = p.status === 'draft';

      const matchesSearch =
        searchQuery.trim() === '' ||
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.client?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [projects, filter, searchQuery]);

  const filterTabs = [
    { key: 'all', label: 'All Projects', count: projects.length },
    { key: 'publish', label: 'Published', count: projects.filter((p) => p.status === 'publish').length },
    { key: 'draft', label: 'Drafts', count: projects.filter((p) => p.status === 'draft').length },
  ];

  const renderProjectItem = ({ item }) => {
    const isPublished = item.status === 'publish';
    const firstImage = Array.isArray(item.images) ? item.images[0] : item.images;

    return (
      <View style={styles.projectCard}>
        <View style={styles.cardMainRow}>
          <View style={styles.thumbWrap}>
            {firstImage ? (
              <Image source={{ uri: firstImage }} style={styles.thumbImage} resizeMode="cover" />
            ) : (
              <View style={styles.thumbPlaceholder}>
                <Ionicons name="briefcase-outline" size={20} color={colors.textMuted} />
              </View>
            )}
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {item.client ? (
              <Text style={styles.clientText} numberOfLines={1}>
                Client: {item.client}
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

            {item.projectcategory ? (
              <Text style={styles.categoryBadge} numberOfLines={1}>
                {Array.isArray(item.projectcategory) ? item.projectcategory.join(', ') : item.projectcategory}
              </Text>
            ) : null}
          </View>

          <View style={styles.actionsCol}>
            {item.livepreview ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.linkBtn]}
                onPress={() => Linking.openURL(item.livepreview).catch(() => {})}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="open-outline" size={15} color={colors.info} />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.actionBtn, styles.editBtn]}
              onPress={() => onNavigate && onNavigate('ProjectForm', { project: item })}
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
      <ScreenHeader
        title="Project Showcases"
        subtitle="Manage portfolio work, live demos & repositories"
        category="PORTFOLIO HUB"
        iconName="briefcase-outline"
        onBack={() => onNavigate && onNavigate('Dashboard')}
        backText="Dashboard"
        rightAction={
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => onNavigate && onNavigate('ProjectForm')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color={colors.textLight} />
            <Text style={styles.createBtnText}>New Project</Text>
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading projects...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProjects}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={renderProjectItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchProjects();
              }}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            <View style={styles.filterSection}>
              <SearchInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search projects by title, client or tech..."
              />
              <FilterTabs
                tabs={filterTabs}
                activeTab={filter}
                onSelectTab={setFilter}
              />
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="briefcase-outline"
              title="No Projects Found"
              description={
                searchQuery
                  ? `No projects matching "${searchQuery}"`
                  : 'Add your deployed applications and showcase your engineering capabilities.'
              }
              actionLabel="Add Project"
              onAction={() => onNavigate && onNavigate('ProjectForm')}
            />
          }
        />
      )}
    </View>
  );
}
