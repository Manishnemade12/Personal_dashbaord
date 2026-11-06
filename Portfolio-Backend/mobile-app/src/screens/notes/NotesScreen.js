import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/theme';
import api from '../../api/client';
import { NoteDao } from '../../db/dao/NoteDao';
import { ScreenHeader } from '../../components/common';
import styles from './styles/notesStyles';
import NoteModal from './components/NoteModal';
import CategoryModal from './components/CategoryModal';

/**
 * Format timestamp into readable Date & Time (e.g. "6 Nov, 2026 • 5:15 PM")
 */
function formatNoteDateTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const datePart = d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timePart = d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${datePart} • ${timePart}`;
  } catch (e) {
    return String(dateStr);
  }
}

export default function NotesScreen({ onNavigate }) {
  const [notes, setNotes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Instantly read from local SQLite (Offline Single Source of Truth)
      const [localNotes, localCats] = await Promise.all([
        NoteDao.getNotes(),
        NoteDao.getCategories(),
      ]);

      if (localNotes) setNotes(localNotes);
      if (localCats && localCats.length > 0) setCategories(localCats);

      // 2. Background sync from remote MongoDB if online
      try {
        const [remoteNotes, remoteCatsRes] = await Promise.all([
          api.getNotes(),
          api.getNoteCategories(),
        ]);

        if (Array.isArray(remoteNotes)) {
          for (const n of remoteNotes) {
            await NoteDao.saveNote(n, true);
          }
          const updatedNotes = await NoteDao.getNotes();
          setNotes(updatedNotes);
        }

        if (remoteCatsRes?.categories && Array.isArray(remoteCatsRes.categories)) {
          for (const c of remoteCatsRes.categories) {
            await NoteDao.saveCategory(c, true);
          }
          const updatedCats = await NoteDao.getCategories();
          setCategories(updatedCats);
        }
      } catch (netErr) {
        // Offline: continue seamlessly with SQLite local data
      }
    } catch (err) {
      console.warn('[Notes Load Error]', err.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } catch (err) {
      console.warn('[Notes Refresh Error]', err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await NoteDao.getCategories();
      if (Array.isArray(cats)) setCategories(cats);
    } catch (e) {}
  };

  // Filter notes in real-time according to Title, Description, and Category
  const filteredNotes = useMemo(() => {
    let result = notes;

    // Filter by Category
    if (selectedCategory && selectedCategory !== 'All') {
      result = result.filter(
        (n) => (n.category || 'General').toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Filter by Search Query (Title + Description + Tags keywords)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((n) => {
        const titleMatch = (n.title || '').toLowerCase().includes(q);
        const descMatch = (n.description || '').toLowerCase().includes(q);
        const catMatch = (n.category || '').toLowerCase().includes(q);
        const tagMatch = Array.isArray(n.tags) && n.tags.some((t) => t.toLowerCase().includes(q));
        return titleMatch || descMatch || catMatch || tagMatch;
      });
    }

    return result;
  }, [notes, selectedCategory, searchQuery]);

  // Split into pinned and non-pinned
  const pinnedNotes = useMemo(
    () => filteredNotes.filter((n) => n.isPinned),
    [filteredNotes]
  );
  const unpinnedNotes = useMemo(
    () => filteredNotes.filter((n) => !n.isPinned),
    [filteredNotes]
  );

  // Toggle Pin handler (Offline-First)
  const handleTogglePin = async (noteId) => {
    try {
      // 1. Immediately update in local SQLite
      const updated = await NoteDao.togglePin(noteId);
      if (updated) {
        setNotes((prev) =>
          prev.map((n) => (n._id === noteId || n.client_id === noteId ? updated : n))
        );
      }

      // 2. Background remote sync if reachable
      if (noteId && String(noteId).length === 24) {
        api.togglePinNote(noteId).catch(() => {});
      }
    } catch (err) {
      Alert.alert('Error', 'Could not update pin status.');
    }
  };

  // Save Note handler (Offline-First)
  const handleSaveNote = async (data) => {
    try {
      const noteToSave = {
        title: data.title.trim(),
        description: data.description.trim(),
        category: data.category || 'General',
        color: data.color || '#7e37d8',
        isPinned: !!data.isPinned,
        client_id: data.client_id || (data.id && data.id.length !== 24 ? data.id : undefined),
        server_id: data.server_id || (data.id && data.id.length === 24 ? data.id : undefined),
        _id: data.id,
      };

      // 1. Save directly into local SQLite (Immediate Offline Persistence)
      const savedLocal = await NoteDao.saveNote(noteToSave);

      // 2. Optimistically update local UI state immediately
      if (data.id) {
        setNotes((prev) =>
          prev.map((n) => (n._id === data.id || n.client_id === data.id ? savedLocal : n))
        );
      } else {
        setNotes((prev) => [savedLocal, ...prev]);
      }

      const updatedCats = await NoteDao.getCategories();
      setCategories(updatedCats);

      // 3. Background remote sync if reachable
      if (data.id && String(data.id).length === 24) {
        api.updateNote(data.id, data).catch(() => {});
      } else {
        api.createNote(data).then(async (remoteDoc) => {
          if (remoteDoc?._id && savedLocal?.client_id) {
            await NoteDao.saveNote({
              ...remoteDoc,
              client_id: savedLocal.client_id,
              server_id: remoteDoc._id,
            }, true);
          }
        }).catch(() => {});
      }
    } catch (err) {
      throw err;
    }
  };

  // Delete Note handler (Offline-First)
  const handleDeleteNote = (note) => {
    Alert.alert(
      'Delete Note',
      `Are you sure you want to delete "${note.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const noteId = note._id || note.client_id;
              // 1. Instantly delete from local SQLite
              await NoteDao.deleteNote(noteId);
              setNotes((prev) =>
                prev.filter((n) => n._id !== noteId && n.client_id !== noteId)
              );
              const updatedCats = await NoteDao.getCategories();
              setCategories(updatedCats);

              // 2. Background remote delete
              if (note._id && String(note._id).length === 24) {
                api.deleteNote(note._id).catch(() => {});
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not delete note.');
            }
          },
        },
      ]
    );
  };

  const renderNoteCard = (item) => {
    const cardColor = item.color || '#7e37d8';
    const timeFormatted = formatNoteDateTime(item.updatedAt || item.createdAt);

    return (
      <View
        key={item._id}
        style={[
          styles.noteCard,
          item.isPinned && [styles.noteCardPinned, { borderLeftColor: cardColor }],
        ]}
      >
        {/* Top Row: Title + Pin Button */}
        <View style={styles.noteTopRow}>
          <View style={styles.noteTitleBlock}>
            <Text style={styles.noteTitle}>{item.title}</Text>
          </View>

          <View style={styles.noteActionsTop}>
            <TouchableOpacity
              style={styles.pinBtn}
              onPress={() => handleTogglePin(item._id)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={item.isPinned ? 'pin' : 'pin-outline'}
                size={18}
                color={item.isPinned ? cardColor : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Badge */}
        <View style={[styles.categoryBadge, { backgroundColor: `${cardColor}15` }]}>
          <View style={[styles.categoryBadgeDot, { backgroundColor: cardColor }]} />
          <Text style={[styles.categoryBadgeText, { color: cardColor }]}>
            {item.category || 'General'}
          </Text>
        </View>

        {/* Description / Content */}
        {item.description ? (
          <Text style={styles.noteDescription} numberOfLines={8}>
            {item.description}
          </Text>
        ) : null}

        {/* Footer: Date & Time + Action Buttons */}
        <View style={styles.noteFooter}>
          <View style={styles.noteDateWrap}>
            <Ionicons name="time-outline" size={12} color={colors.textMuted} />
            <Text style={styles.noteDateText}>{timeFormatted}</Text>
          </View>

          <View style={styles.noteActionButtons}>
            <TouchableOpacity
              style={styles.iconActionBtn}
              onPress={() => {
                setEditingNote(item);
                setNoteModalVisible(true);
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="pencil-outline" size={14} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconActionBtnDanger}
              onPress={() => handleDeleteNote(item)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="trash-outline" size={14} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Screen Header */}
      <ScreenHeader
        title="Notes & Ideas"
        subtitle="Quick thoughts, meeting logs, plans & categorized ideas"
        category="CALENDAR & PRODUCTIVITY"
        iconName="document-text-outline"
        onBack={() => onNavigate && onNavigate('Calendar')}
        backText="Calendar"
      />

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7e37d8']} />
        }
      >
        {/* Search Bar + Add Note Button Row */}
        <View style={styles.controlsRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search notes by title or keywords..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.addNoteBtn}
            onPress={() => {
              setEditingNote(null);
              setNoteModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.addNoteBtnText}>Add Note</Text>
          </TouchableOpacity>
        </View>

        {/* Categories Filter Row */}
        <View style={styles.categoryScrollWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {/* 'All' category chip */}
            <TouchableOpacity
              style={[styles.categoryChip, selectedCategory === 'All' && styles.categoryChipActive]}
              onPress={() => setSelectedCategory('All')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === 'All' && styles.categoryChipTextActive,
                ]}
              >
                All
              </Text>
              <Text
                style={[
                  styles.categoryChipCount,
                  selectedCategory === 'All' && styles.categoryChipCountActive,
                ]}
              >
                {notes.length}
              </Text>
            </TouchableOpacity>

            {/* User Categories Chips */}
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.name;
              return (
                <TouchableOpacity
                  key={cat._id || cat.name}
                  style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(cat.name)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.categoryChipDot,
                      { backgroundColor: isActive ? '#ffffff' : cat.color || '#7e37d8' },
                    ]}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      isActive && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                  {cat.count !== undefined && (
                    <Text
                      style={[
                        styles.categoryChipCount,
                        isActive && styles.categoryChipCountActive,
                      ]}
                    >
                      {cat.count}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* "+ Add Category" button */}
            <TouchableOpacity
              style={styles.addCategoryChip}
              onPress={() => setCategoryModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={14} color={colors.primary} />
              <Text style={styles.addCategoryChipText}>New Category</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Body content */}
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={{ marginTop: 8, fontSize: 12, color: colors.textMuted }}>
              Loading your notes & ideas...
            </Text>
          </View>
        ) : filteredNotes.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="document-text-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No Matching Notes' : 'No Notes in this Category'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No notes match "${searchQuery}". Try different keywords or search in All categories.`
                : 'Create your first note with a title, description, and custom category!'}
            </Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => {
                setEditingNote(null);
                setNoteModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#ffffff" />
              <Text style={styles.emptyActionBtnText}>Create Note</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.notesGrid}>
            {/* Pinned Notes Section */}
            {pinnedNotes.length > 0 && (
              <View style={{ marginBottom: 4 }}>
                <View style={styles.sectionDivider}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="pin" size={13} color={colors.primary} />
                    <Text style={styles.sectionTitle}>PINNED NOTES ({pinnedNotes.length})</Text>
                  </View>
                </View>
                {pinnedNotes.map(renderNoteCard)}
              </View>
            )}

            {/* Other Notes Section */}
            {unpinnedNotes.length > 0 && (
              <View>
                {pinnedNotes.length > 0 && (
                  <View style={styles.sectionDivider}>
                    <Text style={styles.sectionTitle}>ALL NOTES ({unpinnedNotes.length})</Text>
                  </View>
                )}
                {unpinnedNotes.map(renderNoteCard)}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Note Modal: Create / Edit */}
      <NoteModal
        visible={noteModalVisible}
        onClose={() => setNoteModalVisible(false)}
        editingNote={editingNote}
        categories={categories}
        onSave={handleSaveNote}
        onOpenCategoryModal={() => setCategoryModalVisible(true)}
      />

      {/* Category Modal: Manage / Create Categories */}
      <CategoryModal
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        categories={categories}
        onRefresh={loadCategories}
        onSelectCategory={(catName) => setSelectedCategory(catName)}
      />
    </View>
  );
}

