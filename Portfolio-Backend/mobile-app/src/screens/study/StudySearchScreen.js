import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StudyDao } from '../../db/dao/StudyDao';

export default function StudySearchScreen({
  initialQuery = '',
  onSelectChunk,
  onBack,
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);

  useEffect(() => {
    async function doSearch() {
      if (!query || !query.trim()) {
        setResults([]);
        return;
      }
      const matches = await StudyDao.searchAll(query);
      setResults(matches);
    }
    doSearch();
  }, [query]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentWrap}>
      {/* Top Search Bar */}
      <View style={styles.searchHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#94a3b8" />
        </TouchableOpacity>

        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={16} color="#64748b" />
          <TextInput
            style={styles.input}
            placeholder="Search notes, terms, questions..."
            placeholderTextColor="#64748b"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          {results.length} match{results.length === 1 ? '' : 'es'} found
        </Text>
      </View>

      {/* Results */}
      {results.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="search-outline" size={32} color="#64748b" />
          <Text style={styles.emptyTitle}>
            {query.trim() ? 'No matches found' : 'Type keywords to search'}
          </Text>
          <Text style={styles.emptySub}>
            Search across titles, markdown notes, key points, terms, and quizzes.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {results.map(({ chunk, subject }) => (
            <TouchableOpacity
              key={chunk.id}
              style={styles.resultCard}
              onPress={() => onSelectChunk(chunk.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.subjTag}>{subject?.name || 'Subject'}</Text>
              <Text style={styles.resultTitle}>{chunk.title}</Text>
              <Text style={styles.resultSummary} numberOfLines={2}>
                {chunk.summary || chunk.notes?.slice(0, 150) || ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  contentWrap: {
    padding: 20,
    maxWidth: 820,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 60,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  backBtn: {
    padding: 6,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
    paddingHorizontal: 12,
    gap: 8,
    height: 44,
  },
  input: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 14,
  },
  metaRow: {
    marginBottom: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyCard: {
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  resultCard: {
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 14,
  },
  subjTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  resultSummary: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
  },
});

