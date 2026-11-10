import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StudyDao } from '../../db/dao/StudyDao';

const isTableRow = (line) => /^\s*\|?.+\|.+\|?\s*$/.test(line);
const isTableSeparator = (line) =>
  /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);

const renderInlineMarkdown = (text, keyPrefix = '') => {
  const parts = String(text || '').split(/(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g);
  return parts.map((part, index) => {
    if (!part) return null;
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <Text key={key} style={styles.inlineCode} selectable>
          {part.slice(1, -1)}
        </Text>
      );
    }
    if (
      (part.startsWith('**') && part.endsWith('**')) ||
      (part.startsWith('__') && part.endsWith('__'))
    ) {
      return (
        <Text key={key} style={styles.mdStrong} selectable>
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (
      (part.startsWith('*') && part.endsWith('*')) ||
      (part.startsWith('_') && part.endsWith('_'))
    ) {
      return (
        <Text key={key} style={styles.mdEmphasis} selectable>
          {part.slice(1, -1)}
        </Text>
      );
    }
    return (
      <Text key={key} selectable>
        {part}
      </Text>
    );
  });
};

const getTableCells = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

function MarkdownContent({ value }) {
  const lines = String(value || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      const codeLines = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(
        <View key={`code-${index}`} style={styles.codeBlock}>
          {language ? <Text style={styles.codeLanguage}>{language}</Text> : null}
          <Text style={styles.codeText} selectable>
            {codeLines.join('\n')}
          </Text>
        </View>
      );
      continue;
    }

    if (
      isTableRow(trimmed) &&
      index + 1 < lines.length &&
      isTableSeparator(lines[index + 1])
    ) {
      const rows = [getTableCells(line)];
      index += 2;
      while (index < lines.length && isTableRow(lines[index].trim()) && lines[index].trim()) {
        rows.push(getTableCells(lines[index]));
        index += 1;
      }
      const columnCount = Math.max(...rows.map((row) => row.length));
      blocks.push(
        <ScrollView
          key={`table-${index}`}
          horizontal
          showsHorizontalScrollIndicator
          style={styles.tableScroll}
        >
          <View style={styles.table}>
            {rows.map((row, rowIndex) => (
              <View
                key={`row-${rowIndex}`}
                style={[styles.tableRow, rowIndex === 0 && styles.tableHeaderRow]}
              >
                {Array.from({ length: columnCount }).map((_, columnIndex) => (
                  <View
                    key={`cell-${rowIndex}-${columnIndex}`}
                    style={[styles.tableCell, rowIndex === 0 && styles.tableHeaderCell]}
                  >
                    <Text style={rowIndex === 0 ? styles.tableHeaderText : styles.tableText} selectable>
                      {renderInlineMarkdown(row[columnIndex] || '', `cell-${rowIndex}-${columnIndex}`)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      );
      continue;
    }

    if (!trimmed) {
      blocks.push(<View key={`space-${index}`} style={{ height: 8 }} />);
      index += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const headingStyle =
        heading[1].length === 1
          ? styles.mdH1
          : heading[1].length === 2
          ? styles.mdH2
          : styles.mdH3;
      blocks.push(
        <Text key={`heading-${index}`} style={headingStyle} selectable>
          {renderInlineMarkdown(heading[2], `heading-${index}`)}
        </Text>
      );
      index += 1;
      continue;
    }

    const bullet = trimmed.match(/^([-*+]|\u2022)\s+(.+)$/);
    if (bullet) {
      blocks.push(
        <View key={`bullet-${index}`} style={styles.bulletRow}>
          <Text style={styles.bulletDot} selectable>
            {'\u2022'}
          </Text>
          <Text style={styles.bulletText} selectable>
            {renderInlineMarkdown(bullet[2], `bullet-${index}`)}
          </Text>
        </View>
      );
      index += 1;
      continue;
    }

    blocks.push(
      <Text key={`paragraph-${index}`} style={styles.mdP} selectable>
        {renderInlineMarkdown(trimmed, `paragraph-${index}`)}
      </Text>
    );
    index += 1;
  }

  return <>{blocks}</>;
}

export default function StudyChunkReaderScreen({
  chunkId,
  subjects = [],
  chunks = [],
  onSelectChunk,
  onNavigateHome,
  onOpenAddContent,
  onOpenQuickQuiz,
  onChunkUpdated,
  onChunkDeleted,
}) {
  const { width } = useWindowDimensions();
  const isSmall = width < 480;

  const [activeTab, setActiveTab] = useState('notes'); // 'notes' | 'key' | 'terms' | 'quiz'
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftSummary, setDraftSummary] = useState('');
  const [draftNotes, setDraftNotes] = useState('');

  // Selected answers for in-chunk quiz
  const [chunkQuizAnswers, setChunkQuizAnswers] = useState({});
  const [showQuizResults, setShowQuizResults] = useState(false);

  const chunk = useMemo(() => {
    return chunks.find((c) => c.id === chunkId);
  }, [chunks, chunkId]);

  const subject = useMemo(() => {
    if (!chunk) return null;
    return subjects.find((s) => s.id === chunk.subjectId) || null;
  }, [chunk, subjects]);

  // Sequential order of chunks in this subject
  const subjectChunks = useMemo(() => {
    if (!subject) return [];
    return chunks
      .filter((c) => c.subjectId === subject.id && !c.isDeleted)
      .sort((a, b) => (a.orderIndex ?? a.order ?? 0) - (b.orderIndex ?? b.order ?? 0));
  }, [chunks, subject]);

  const nextChunk = useMemo(() => {
    if (!chunk) return null;
    const index = subjectChunks.findIndex((c) => c.id === chunk.id);
    return index >= 0 && index < subjectChunks.length - 1 ? subjectChunks[index + 1] : null;
  }, [chunk, subjectChunks]);

  // Breadcrumb trail
  const breadcrumb = useMemo(() => {
    if (!chunk) return [];
    const trail = [chunk.title];
    let cur = chunk;
    while (cur?.parentChunkId) {
      const parent = chunks.find((c) => c.id === cur.parentChunkId);
      if (!parent) break;
      trail.unshift(parent.title);
      cur = parent;
    }
    return trail;
  }, [chunk, chunks]);

  if (!chunk || !subject) {
    return (
      <View style={styles.notFoundContainer}>
        <Ionicons name="document-text-outline" size={40} color="#64748b" />
        <Text style={styles.notFoundTitle}>Chunk Not Found</Text>
        <Text style={styles.notFoundSub}>The requested study chunk does not exist or was deleted.</Text>
        <TouchableOpacity style={styles.goHomeBtn} onPress={onNavigateHome}>
          <Text style={styles.goHomeBtnText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleStartEdit = () => {
    setDraftTitle(chunk.title);
    setDraftSummary(chunk.summary || '');
    setDraftNotes(chunk.notes || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      await StudyDao.updateChunk(chunk.id, {
        title: draftTitle.trim() || 'Untitled',
        summary: draftSummary.trim(),
        notes: draftNotes.trim(),
      });
      setIsEditing(false);
      onChunkUpdated?.();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleToggleRevised = async () => {
    try {
      await StudyDao.updateChunk(chunk.id, {
        revised: !chunk.revised,
      });
      onChunkUpdated?.();
    } catch (e) {}
  };

  const handleDeleteChunk = () => {
    Alert.alert(
      'Delete Chunk',
      `Delete "${chunk.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await StudyDao.deleteChunk(chunk.id);
            onChunkDeleted?.();
            onNavigateHome();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentWrap}>
      {/* Breadcrumb Navigation Bar */}
      <View style={styles.breadcrumbBar}>
        <TouchableOpacity onPress={onNavigateHome}>
          <Text style={styles.breadcrumbLink}>Home</Text>
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={12} color="#64748b" />
        <Text style={styles.breadcrumbText}>{subject.name}</Text>
        {breadcrumb.map((title, i) => (
          <React.Fragment key={i}>
            <Ionicons name="chevron-forward" size={12} color="#64748b" />
            <Text
              style={[
                styles.breadcrumbText,
                i === breadcrumb.length - 1 && styles.breadcrumbActive,
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          </React.Fragment>
        ))}
      </View>

      {/* Header Area */}
      <View style={styles.header}>
        {isEditing ? (
          <TextInput
            style={styles.editTitleInput}
            value={draftTitle}
            onChangeText={setDraftTitle}
            placeholder="Chunk title..."
            placeholderTextColor="#64748b"
          />
        ) : (
          <Text style={styles.chunkTitleHeading}>{chunk.title}</Text>
        )}

        {/* Action Buttons Toolbar */}
        <View style={styles.toolbarRow}>
          <TouchableOpacity
            style={[styles.revisedBtn, chunk.revised && styles.revisedBtnActive]}
            onPress={handleToggleRevised}
            activeOpacity={0.7}
          >
            <Ionicons
              name={chunk.revised ? 'checkmark-circle' : 'ellipse-outline'}
              size={15}
              color={chunk.revised ? '#10b981' : '#94a3b8'}
            />
            <Text style={[styles.revisedBtnText, chunk.revised && styles.revisedBtnTextActive]}>
              {chunk.revised ? 'Revised' : 'Mark as revised'}
            </Text>
          </TouchableOpacity>

          {isEditing ? (
            <>
              <TouchableOpacity style={styles.toolBtnPrimary} onPress={handleSaveEdit}>
                <Ionicons name="save-outline" size={14} color="#ffffff" />
                <Text style={styles.toolBtnPrimaryText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolBtn} onPress={() => setIsEditing(false)}>
                <Ionicons name="close-outline" size={14} color="#94a3b8" />
                <Text style={styles.toolBtnText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.toolBtn} onPress={handleStartEdit}>
              <Ionicons name="create-outline" size={14} color="#94a3b8" />
              <Text style={styles.toolBtnText}>Edit</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => onOpenAddContent({ parentChunkId: chunk.id })}
          >
            <Ionicons name="add" size={14} color="#94a3b8" />
            <Text style={styles.toolBtnText}>Add sub-notes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => onOpenQuickQuiz(subject.id)}
          >
            <Ionicons name="sparkles" size={14} color="#f59e0b" />
            <Text style={styles.toolBtnText}>Generate quiz</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolBtn}
            onPress={handleDeleteChunk}
          >
            <Ionicons name="trash-outline" size={14} color="#f43f5e" />
            <Text style={[styles.toolBtnText, { color: '#f43f5e' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs - Horizontal Scroll Container to prevent mobile horizontal blowout */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabBar}
      >
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'notes' && styles.tabItemActive]}
          onPress={() => setActiveTab('notes')}
        >
          <Text style={[styles.tabItemText, activeTab === 'notes' && styles.tabItemTextActive]}>
            Notes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'key' && styles.tabItemActive]}
          onPress={() => setActiveTab('key')}
        >
          <Text style={[styles.tabItemText, activeTab === 'key' && styles.tabItemTextActive]}>
            Key points ({chunk.keyPoints?.length || 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'terms' && styles.tabItemActive]}
          onPress={() => setActiveTab('terms')}
        >
          <Text style={[styles.tabItemText, activeTab === 'terms' && styles.tabItemTextActive]}>
            Terms ({chunk.terms?.length || 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'quiz' && styles.tabItemActive]}
          onPress={() => setActiveTab('quiz')}
        >
          <Text style={[styles.tabItemText, activeTab === 'quiz' && styles.tabItemTextActive]}>
            Quiz ({chunk.quiz?.length || 0})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Tab 1: Notes Content */}
      {activeTab === 'notes' && (
        <View style={styles.tabBody}>
          {isEditing ? (
            <View style={{ gap: 14 }}>
              <View>
                <Text style={styles.inputLabel}>Summary (2-4 lines)</Text>
                <TextInput
                  style={styles.editTextArea}
                  multiline
                  value={draftSummary}
                  onChangeText={setDraftSummary}
                  placeholder="Summary..."
                  placeholderTextColor="#64748b"
                />
              </View>
              <View>
                <Text style={styles.inputLabel}>Notes (Markdown)</Text>
                <TextInput
                  style={[styles.editTextArea, { minHeight: 300, fontFamily: 'monospace' }]}
                  multiline
                  value={draftNotes}
                  onChangeText={setDraftNotes}
                  placeholder="Full markdown notes..."
                  placeholderTextColor="#64748b"
                />
              </View>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {chunk.summary ? (
                <View style={styles.summaryCallout}>
                  <Text style={styles.summaryText}>{chunk.summary}</Text>
                </View>
              ) : null}

              {/* Formatted Markdown Reader */}
              <View style={styles.notesContainer}>
                {chunk.notes ? (
                  <MarkdownContent value={chunk.notes} />
                ) : (
                  <Text style={styles.emptyNoteText} selectable>*No notes yet.*</Text>
                )}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Tab 2: Key Points */}
      {activeTab === 'key' && (
        <View style={styles.tabBody}>
          {(!chunk.keyPoints || chunk.keyPoints.length === 0) ? (
            <Text style={styles.emptyNoteText}>No key points extracted yet.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {chunk.keyPoints.map((kp, i) => (
                <View key={i} style={styles.keyPointCard}>
                  <Text style={styles.keyPointNum}>{i + 1}.</Text>
                  <Text style={styles.keyPointText}>{kp}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Tab 3: Terms & Definitions */}
      {activeTab === 'terms' && (
        <View style={styles.tabBody}>
          {(!chunk.terms || chunk.terms.length === 0) ? (
            <Text style={styles.emptyNoteText}>No key terms extracted yet.</Text>
          ) : (
            <View style={styles.termsGrid}>
              {chunk.terms.map((t, i) => (
                <View key={i} style={styles.termCard}>
                  <Text style={styles.termWord}>{t.term}</Text>
                  <Text style={styles.termMeaning}>{t.meaning}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Tab 4: In-Chunk Quiz */}
      {activeTab === 'quiz' && (
        <View style={styles.tabBody}>
          {(!chunk.quiz || chunk.quiz.length === 0) ? (
            <View style={styles.emptyQuizBox}>
              <Text style={styles.emptyNoteText}>No quiz questions for this chunk.</Text>
              <TouchableOpacity
                style={styles.genQuizBtn}
                onPress={() => onOpenQuickQuiz(subject.id)}
              >
                <Ionicons name="sparkles" size={14} color="#ffffff" />
                <Text style={styles.genQuizBtnText}>Generate with AI</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {chunk.quiz.map((q, qi) => {
                const selected = chunkQuizAnswers[qi];
                const isAnswered = selected !== undefined;
                return (
                  <View key={qi} style={styles.inChunkQuizCard}>
                    <View style={styles.quizQHeader}>
                      <View style={styles.qNumBadge}>
                        <Text style={styles.qNumBadgeText}>{qi + 1}</Text>
                      </View>
                      <Text style={styles.quizQText}>{q.question}</Text>
                    </View>

                    <View style={{ gap: 8, marginTop: 10 }}>
                      {q.options?.map((opt, oi) => {
                        const isChosen = selected === opt;
                        const isCorrect = q.answer === opt;
                        let optionStyle = styles.optionBtn;
                        if (showQuizResults && isCorrect) {
                          optionStyle = [styles.optionBtn, styles.optionCorrect];
                        } else if (showQuizResults && isChosen && !isCorrect) {
                          optionStyle = [styles.optionBtn, styles.optionWrong];
                        } else if (isChosen) {
                          optionStyle = [styles.optionBtn, styles.optionSelected];
                        }

                        return (
                          <TouchableOpacity
                            key={oi}
                            style={optionStyle}
                            onPress={() => {
                              if (!showQuizResults) {
                                setChunkQuizAnswers((prev) => ({ ...prev, [qi]: opt }));
                              }
                            }}
                            activeOpacity={0.8}
                          >
                            <View style={styles.optionLetterBadge}>
                              <Text style={styles.optionLetterText}>
                                {String.fromCharCode(65 + oi)}
                              </Text>
                            </View>
                            <Text style={styles.optionText}>{opt}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {showQuizResults && q.explanation ? (
                      <View style={styles.explanationBox}>
                        <Text style={styles.explanationLabel}>Explanation: </Text>
                        <Text style={styles.explanationText}>{q.explanation}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                <TouchableOpacity
                  style={styles.checkAnswersBtn}
                  onPress={() => setShowQuizResults((prev) => !prev)}
                >
                  <Text style={styles.checkAnswersBtnText}>
                    {showQuizResults ? 'Hide Answers' : 'Check Answers'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Next Chunk Navigation Button */}
      {nextChunk && (
        <View style={styles.nextChunkWrap}>
          <TouchableOpacity
            style={styles.nextChunkBtn}
            onPress={() => onSelectChunk(nextChunk.id)}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.nextChunkSub}>Next Section</Text>
              <Text style={styles.nextChunkTitle} numberOfLines={1}>
                {nextChunk.title}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
    width: '100%',
    maxWidth: '100%',
  },
  contentWrap: {
    padding: 14,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 60,
  },
  breadcrumbBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  breadcrumbLink: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
  },
  breadcrumbText: {
    fontSize: 12,
    color: '#64748b',
    maxWidth: 160,
  },
  breadcrumbActive: {
    color: '#cbd5e1',
    fontWeight: '600',
  },
  header: {
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    paddingBottom: 16,
  },
  chunkTitleHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 12,
    lineHeight: 30,
  },
  editTitleInput: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  revisedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#111827',
  },
  revisedBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  revisedBtnText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  revisedBtnTextActive: {
    color: '#10b981',
    fontWeight: '600',
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#111827',
  },
  toolBtnText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  toolBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#6366f1',
  },
  toolBtnPrimaryText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  tabScroll: {
    width: '100%',
    maxWidth: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: '100%',
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#6366f1',
  },
  tabItemText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  tabItemTextActive: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  tabBody: {
    paddingVertical: 8,
  },
  summaryCallout: {
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderRadius: 8,
    padding: 14,
  },
  summaryText: {
    fontSize: 13,
    color: '#e2e8f0',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  notesContainer: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 16,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  mdH1: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
    marginTop: 14,
    marginBottom: 8,
  },
  mdH2: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f1f5f9',
    marginTop: 12,
    marginBottom: 6,
  },
  mdH3: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e2e8f0',
    marginTop: 10,
    marginBottom: 4,
  },
  mdP: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 22,
    marginBottom: 8,
  },
  mdStrong: {
    fontWeight: '800',
    color: '#f8fafc',
  },
  mdEmphasis: {
    fontStyle: 'italic',
    color: '#e2e8f0',
  },
  inlineCode: {
    fontFamily: 'monospace',
    color: '#a5b4fc',
    backgroundColor: '#1e293b',
  },
  codeBlock: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    minWidth: '100%',
  },
  codeLanguage: {
    color: '#94a3b8',
    fontFamily: 'monospace',
    fontSize: 11,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  codeText: {
    color: '#dbeafe',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 19,
  },
  tableScroll: {
    marginBottom: 12,
    maxWidth: '100%',
  },
  table: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 520,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    backgroundColor: '#0f172a',
  },
  tableHeaderRow: {
    backgroundColor: '#1e293b',
  },
  tableCell: {
    width: 170,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: '#334155',
  },
  tableHeaderCell: {
    minHeight: 46,
  },
  tableText: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
  },
  tableHeaderText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  bulletDot: {
    color: '#6366f1',
    fontSize: 16,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 20,
  },
  emptyNoteText: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 6,
  },
  editTextArea: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: '#f8fafc',
  },
  keyPointCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 12,
  },
  keyPointNum: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366f1',
  },
  keyPointText: {
    flex: 1,
    fontSize: 13,
    color: '#e2e8f0',
    lineHeight: 19,
  },
  termsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    maxWidth: '100%',
  },
  termCard: {
    width: '100%',
    maxWidth: '100%',
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 14,
  },
  termWord: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366f1',
    marginBottom: 4,
  },
  termMeaning: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
  },
  emptyQuizBox: {
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  genQuizBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6366f1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  genQuizBtnText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  inChunkQuizCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 14,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  quizQHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  qNumBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qNumBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366f1',
  },
  quizQText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
    lineHeight: 20,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  optionSelected: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  optionCorrect: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  optionWrong: {
    borderColor: '#f43f5e',
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
  },
  optionLetterBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  optionText: {
    fontSize: 13,
    color: '#cbd5e1',
    flex: 1,
  },
  explanationBox: {
    marginTop: 10,
    backgroundColor: '#0f172a',
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  explanationLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f59e0b',
  },
  explanationText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 16,
  },
  checkAnswersBtn: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  checkAnswersBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  nextChunkWrap: {
    marginTop: 28,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    paddingTop: 18,
  },
  nextChunkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    padding: 16,
  },
  nextChunkSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  nextChunkTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    maxWidth: 500,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 12,
  },
  notFoundSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 20,
    textAlign: 'center',
  },
  goHomeBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  goHomeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
});
