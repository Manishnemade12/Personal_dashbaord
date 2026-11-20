import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NqtQuizDao } from '../../db/dao/NqtQuizDao';
import { api } from '../../api/client';

const COLORS = {
  background: '#07111f',
  panel: '#101d2d',
  panelRaised: '#152438',
  border: '#25374c',
  text: '#edf4ff',
  muted: '#91a2b8',
  teal: '#36d6bd',
  blue: '#65a8ff',
  amber: '#f7bf62',
  red: '#ff727f',
  green: '#54d69a',
};

const MODES = [
  { id: 'mixed', title: 'Mixed practice', subtitle: 'Adaptive set across subjects', icon: 'shuffle-outline' },
  { id: 'subject', title: 'Subject quiz', subtitle: 'Focus on one section', icon: 'layers-outline' },
  { id: 'topic', title: 'Topic practice', subtitle: 'Drill a specific concept', icon: 'pricetag-outline' },
  { id: 'full_mock', title: 'Full mock', subtitle: '190-minute integrated pattern', icon: 'timer-outline' },
];

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
  { id: 'exam', label: 'TCS NQT level' },
];

const COUNTS = [5, 10, 15, 20, 30];

function formatTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function percentage(value) {
  return `${Math.round(Number(value || 0))}%`;
}

function mergeRemoteDashboard(remote, localOnlyAttempts) {
  const topics = (remote.topics || []).map((topic) => ({ ...topic }));
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  const missedByQuestion = new Map((remote.questionMistakes || []).map((item) => [item.id, { ...item }]));
  const attempts = [...(remote.attempts || [])];
  for (const attempt of localOnlyAttempts) {
    attempts.push(attempt);
    for (const question of attempt.questions || []) {
      const topic = topicById.get(question.topicId);
      if (topic) {
        const seen = Number(topic.seen || 0) + 1;
        const correct = question.selectedOption === question.answer;
        const totalTimeSeconds = Number(topic.averageSeconds || 0) * Number(topic.seen || 0)
          + Number(question.timeSpentSeconds || 0);
        topic.seen = seen;
        topic.correct = Number(topic.correct || 0) + (correct ? 1 : 0);
        topic.incorrect = Number(topic.incorrect || 0) + (question.selectedOption && !correct ? 1 : 0);
        topic.unanswered = Number(topic.unanswered || 0) + (!question.selectedOption ? 1 : 0);
        topic.accuracy = Math.round((topic.correct / seen) * 1000) / 10;
        topic.averageSeconds = Math.round(totalTimeSeconds / seen);
        topic.lastAttemptAt = attempt.completed_at || topic.lastAttemptAt;
      }
      if (question.selectedOption && question.selectedOption !== question.answer) {
        const current = missedByQuestion.get(question.id) || {
          id: question.id,
          prompt: question.prompt,
          topic_id: question.topicId,
          topic_name: question.topicName,
          subject_name: question.subjectName,
          wrong_count: 0,
          correct_count: 0,
        };
        current.wrong_count += 1;
        missedByQuestion.set(question.id, current);
      }
    }
  }
  attempts.sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0));
  const subjectTotals = new Map();
  for (const topic of topics) {
    const subject = subjectTotals.get(topic.subjectId) || {
      subjectId: topic.subjectId,
      name: topic.subjectName,
      section: topic.section,
      seen: 0,
      correct: 0,
    };
    subject.seen += Number(topic.seen || 0);
    subject.correct += Number(topic.correct || 0);
    subjectTotals.set(topic.subjectId, subject);
  }
  const weakTopics = topics.filter((topic) => topic.seen > 0)
    .sort((a, b) => (a.accuracy - b.accuracy) || (b.importance - a.importance));
  const totalQuestions = attempts.reduce((sum, item) => sum + Number(item.question_count || 0), 0);
  const totalCorrect = attempts.reduce((sum, item) => sum + Number(item.correct_count || 0), 0);
  const average = (items) => items.length
    ? items.reduce((sum, item) => sum + Number(item.accuracy || 0), 0) / items.length
    : null;
  const recentAverage = attempts.length >= 3 ? average(attempts.slice(0, 3)) : null;
  const previousAverage = attempts.length >= 6 ? average(attempts.slice(3, 6)) : null;
  return {
    ...remote,
    attempts,
    topics,
    weakTopics,
    weakestTopic: weakTopics[0] || null,
    strongestTopic: [...weakTopics].reverse().find((topic) => topic.seen >= 2) || null,
    questionMistakes: Array.from(missedByQuestion.values()).filter((item) => item.wrong_count >= 2)
      .sort((a, b) => b.wrong_count - a.wrong_count).slice(0, 5),
    subjects: Array.from(subjectTotals.values()).map((subject) => ({
      ...subject,
      accuracy: subject.seen ? Math.round((subject.correct / subject.seen) * 1000) / 10 : null,
    })),
    totals: {
      ...remote.totals,
      attempts: attempts.length,
      averageAccuracy: totalQuestions ? Math.round((totalCorrect / totalQuestions) * 1000) / 10 : 0,
      bestAccuracy: attempts.reduce((best, item) => Math.max(best, Number(item.accuracy || 0)), 0),
      questionsAnswered: totalQuestions,
      topicsPracticed: topics.filter((topic) => topic.seen > 0).length,
      recentTrend: recentAverage !== null && previousAverage !== null
        ? Math.round((recentAverage - previousAverage) * 10) / 10
        : null,
    },
  };
}

function Pill({ label, selected, onPress, compact = false, tone }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.pill,
        compact && styles.pillCompact,
        selected && styles.pillSelected,
        tone === 'teal' && selected && styles.pillTeal,
      ]}
    >
      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatCard({ icon, label, value, detail, color = COLORS.teal }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {detail ? <Text style={styles.statDetail}>{detail}</Text> : null}
    </View>
  );
}

function SectionHeading({ eyebrow, title, trailing }) {
  return (
    <View style={styles.sectionHeadingRow}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {trailing || null}
    </View>
  );
}

function AttemptRow({ attempt, onPress }) {
  const scoreTone = Number(attempt.accuracy || 0) >= 75
    ? COLORS.green
    : Number(attempt.accuracy || 0) >= 50
      ? COLORS.amber
      : COLORS.red;
  const date = attempt.completed_at ? new Date(attempt.completed_at).toLocaleDateString() : 'Recent';
  const modeName = MODES.find((mode) => mode.id === attempt.mode)?.title || 'Practice';
  return (
    <TouchableOpacity style={styles.historyRow} onPress={onPress} activeOpacity={0.76}>
      <View style={[styles.historyScore, { borderColor: `${scoreTone}65` }]}>
        <Text style={[styles.historyScoreText, { color: scoreTone }]}>{percentage(attempt.accuracy)}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={styles.historyTitle}>{modeName} · {attempt.question_count || 0} questions</Text>
        <Text style={styles.historyMeta}>{date} · {attempt.difficulty || 'mixed'} · {formatTime(attempt.time_taken_seconds)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color={COLORS.muted} />
    </TouchableOpacity>
  );
}

export default function TcsNqtQuizScreen({ userId = 'admin', onExitToDashboard }) {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [view, setView] = useState('home');
  const [tab, setTab] = useState('overview');
  const [mode, setMode] = useState('mixed');
  const [difficulty, setDifficulty] = useState('exam');
  const [questionCount, setQuestionCount] = useState(10);
  const [selectedSubjectId, setSelectedSubjectId] = useState('nqt_numerical');
  const [selectedTopicId, setSelectedTopicId] = useState('num_percent');
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState({});
  const [attempt, setAttempt] = useState(null);
  const [clockNow, setClockNow] = useState(0);
  const [quizEndTime, setQuizEndTime] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [questionTime, setQuestionTime] = useState({});

  const scrollRef = useRef(null);
  const timeByQuestionRef = useRef({});
  const startTimeRef = useRef(null);
  const finishingRef = useRef(false);
  const finishRef = useRef(null);

  const reloadDashboard = useCallback(async () => {
    const [localData, subjectRows] = await Promise.all([
      NqtQuizDao.getDashboard(userId),
      NqtQuizDao.getSubjects(),
    ]);
    const pending = await NqtQuizDao.getPendingAttemptUploads(userId);
    for (const item of pending) {
      try {
        await api.submitNqtQuizAttempt(item.payload);
        await NqtQuizDao.removePendingAttemptUpload(item.attempt_id);
      } catch (_error) {
        break;
      }
    }
    let data = localData;
    try {
      const remoteData = await api.getNqtQuizAnalytics(userId);
      const remoteAttemptIds = new Set((remoteData.attempts || []).map((item) => item.id));
      const localOnlyRows = (localData.attempts || []).filter((item) => !remoteAttemptIds.has(item.id));
      const localOnlyAttempts = await Promise.all(localOnlyRows.map((item) => NqtQuizDao.getAttempt(item.id, userId)));
      data = mergeRemoteDashboard(remoteData, localOnlyAttempts.filter(Boolean));
    } catch (_error) {
      // Keep the independently stored local dashboard usable while offline.
    }
    setDashboard(data);
    setSubjects(subjectRows || []);
  }, [userId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        await NqtQuizDao.initialize();
        try {
          const catalog = await api.getNqtQuizCatalog(userId);
          await NqtQuizDao.syncCatalog(catalog);
        } catch (_error) {
          // The curated local catalog keeps practice setup available offline.
        }
        const subjectRows = await NqtQuizDao.getSubjects();
        if (mounted) {
          setSubjects(subjectRows || []);
          await reloadDashboard();
        }
      } catch (error) {
        Alert.alert('Could not load quizzes', error?.message || 'Please reopen the quiz workspace.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [reloadDashboard, userId]);

  const topics = dashboard?.topics || [];
  const recentAttempts = dashboard?.attempts || [];
  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId);
  const currentQuestion = activeQuiz?.questionSnapshot?.[currentQuestionIndex] || null;
  const answeredCount = activeQuiz
    ? activeQuiz.questionSnapshot.filter((question) => Boolean(answers[question.id])).length
    : 0;
  const markedCount = activeQuiz
    ? activeQuiz.questionSnapshot.filter((question) => Boolean(marked[question.id])).length
    : 0;
  const remainingSeconds = activeQuiz && quizEndTime
    ? Math.max(0, Math.ceil((quizEndTime - clockNow) / 1000))
    : 0;

  useEffect(() => {
    if (view === 'home') scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [tab, view]);
  useEffect(() => {
    if (view === 'quiz') scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentQuestionIndex, view]);

  const startQuiz = useCallback(async () => {
    setGenerating(true);
    try {
      const effectiveCount = mode === 'full_mock'
        ? 30
        : questionCount;
      const config = {
        mode,
        difficulty,
        questionCount: effectiveCount,
        subjectId: selectedSubjectId,
        topicId: selectedTopicId,
      };
      const adaptation = await NqtQuizDao.getGenerationContext(userId);
      const generatedQuiz = await api.generateNqtQuiz({ userId, config, adaptation });
      const quiz = await NqtQuizDao.saveGeneratedQuiz(generatedQuiz, userId);
      timeByQuestionRef.current = {};
      finishingRef.current = false;
      setAnswers({});
      setMarked({});
      setQuestionTime({});
      setCurrentQuestionIndex(0);
      setAttempt(null);
      setActiveQuiz(quiz);
      const start = Date.now();
      startTimeRef.current = start;
      setQuizEndTime(start + quiz.durationSeconds * 1000);
      setClockNow(start);
      setView('quiz');
    } catch (error) {
      Alert.alert('Could not generate quiz', error?.message || 'Please try another selection.');
    } finally {
      setGenerating(false);
    }
  }, [difficulty, mode, questionCount, selectedSubjectId, selectedTopicId, userId]);

  const finishQuiz = useCallback(async () => {
    if (!activeQuiz || finishingRef.current) return;
    finishingRef.current = true;
    setSubmitting(true);
    try {
      const elapsed = Math.min(
        activeQuiz.durationSeconds,
        Math.max(0, Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000))
      );
      const result = await NqtQuizDao.finishAttempt({
        quiz: activeQuiz,
        answers,
        marked,
        timeByQuestion: timeByQuestionRef.current,
        startedAt: new Date(startTimeRef.current || Date.now()).toISOString(),
        timeTakenSeconds: elapsed,
      }, userId);
      const uploadPayload = {
        userId,
        attemptId: result.id,
        quizId: activeQuiz.id,
        answers,
        marked,
        timeByQuestion: timeByQuestionRef.current,
        startedAt: result.started_at,
        completedAt: result.completed_at,
        timeTakenSeconds: elapsed,
      };
      try {
        await api.submitNqtQuizAttempt(uploadPayload);
      } catch (_error) {
        await NqtQuizDao.queueAttemptUpload(result.id, userId, uploadPayload);
      }
      setAttempt(result);
      setActiveQuiz(null);
      setQuizEndTime(null);
      setView('result');
      await reloadDashboard();
    } catch (error) {
      finishingRef.current = false;
      Alert.alert('Could not save your attempt', error?.message || 'Your quiz is still open. Please submit again.');
    } finally {
      setSubmitting(false);
    }
  }, [activeQuiz, answers, marked, reloadDashboard, userId]);
  useEffect(() => { finishRef.current = finishQuiz; }, [finishQuiz]);

  useEffect(() => {
    if (view !== 'quiz' || !activeQuiz) return undefined;
    const activeQuestionId = activeQuiz.questionSnapshot[currentQuestionIndex]?.id;
    const interval = setInterval(() => {
      const now = Date.now();
      setClockNow(now);
      if (activeQuestionId) {
        const next = { ...timeByQuestionRef.current };
        next[activeQuestionId] = Number(next[activeQuestionId] || 0) + 1;
        timeByQuestionRef.current = next;
        setQuestionTime(next);
      }
      if (quizEndTime && now >= quizEndTime) finishRef.current?.();
    }, 1000);
    return () => clearInterval(interval);
  }, [activeQuiz, currentQuestionIndex, quizEndTime, view]);

  const changeQuestion = (index) => {
    if (!activeQuiz) return;
    const nextIndex = Math.max(0, Math.min(index, activeQuiz.questionSnapshot.length - 1));
    setCurrentQuestionIndex(nextIndex);
  };

  const selectAnswer = (questionId, label) => {
    setAnswers((previous) => ({ ...previous, [questionId]: label }));
  };

  const toggleMarked = (questionId) => {
    setMarked((previous) => ({ ...previous, [questionId]: !previous[questionId] }));
  };

  const requestSubmit = () => {
    const unanswered = (activeQuiz?.questionCount || 0) - answeredCount;
    Alert.alert(
      'Submit this quiz?',
      `${answeredCount} answered · ${unanswered} unanswered · ${markedCount} marked for review. You can still return to questions before submitting.`,
      [
        { text: 'Keep practicing', style: 'cancel' },
        { text: 'Submit quiz', onPress: () => finishRef.current?.() },
      ]
    );
  };

  const leaveQuiz = () => {
    Alert.alert(
      'Leave this quiz?',
      'This in-progress attempt will not be added to your history.',
      [
        { text: 'Continue quiz', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            setActiveQuiz(null);
            setQuizEndTime(null);
            setView('home');
          },
        },
      ]
    );
  };

  const openAttempt = async (attemptId) => {
    try {
      let item = await NqtQuizDao.getAttempt(attemptId, userId);
      if (!item) item = await api.getNqtQuizAttempt(attemptId, userId);
      if (item) {
        setAttempt(item);
        setView('review');
      }
    } catch (error) {
      Alert.alert('Could not open result', error?.message || 'Try again.');
    }
  };

  const beginTopicPractice = (topic) => {
    setMode('topic');
    setSelectedTopicId(topic.id);
    setSelectedSubjectId(topic.subjectId);
    setTab('overview');
    setView('home');
  };

  const resultQuestionStats = useMemo(() => {
    if (!attempt?.questions) return [];
    const byTopic = new Map();
    for (const question of attempt.questions) {
      const current = byTopic.get(question.topicId) || {
        topicId: question.topicId,
        topicName: question.topicName,
        subjectName: question.subjectName,
        correct: 0,
        total: 0,
      };
      current.total += 1;
      if (question.selectedOption === question.answer) current.correct += 1;
      byTopic.set(question.topicId, current);
    }
    return Array.from(byTopic.values()).map((item) => ({
      ...item,
      accuracy: item.total ? (item.correct / item.total) * 100 : 0,
    }));
  }, [attempt]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.teal} />
        <Text style={styles.loadingText}>Loading your NQT workspace…</Text>
      </SafeAreaView>
    );
  }

  const renderTopbar = () => (
    <View style={styles.topbar}>
      <TouchableOpacity onPress={view === 'quiz' ? leaveQuiz : onExitToDashboard} style={styles.backButton} activeOpacity={0.7}>
        <Ionicons name={view === 'quiz' ? 'close' : 'arrow-back'} size={19} color={COLORS.text} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.brandOverline}>STUDYFLOW · EXAM PRACTICE</Text>
        <Text style={styles.brandTitle}>{view === 'quiz' ? 'TCS NQT Mock' : 'TCS NQT Quizzes'}</Text>
      </View>
      {view === 'quiz' ? (
        <View style={[styles.timerBadge, remainingSeconds < 300 && styles.timerBadgeUrgent]}>
          <Ionicons name="time-outline" size={16} color={remainingSeconds < 300 ? COLORS.red : COLORS.teal} />
          <Text style={[styles.timerText, remainingSeconds < 300 && { color: COLORS.red }]}>{formatTime(remainingSeconds)}</Text>
        </View>
      ) : (
        <View style={styles.patternPill}><Text style={styles.patternPillText}>2026 pattern</Text></View>
      )}
    </View>
  );

  const renderHome = () => {
    const totals = dashboard?.totals || {};
    return (
      <>
        <View style={styles.hero}>
          <View style={styles.heroOrbOne} />
          <View style={styles.heroOrbTwo} />
          <View style={styles.heroTag}>
            <Ionicons name="sparkles" size={13} color={COLORS.teal} />
            <Text style={styles.heroTagText}>PERSONALIZED PREPARATION</Text>
          </View>
          <Text style={styles.heroTitle}>Build your NQT edge.</Text>
          <Text style={styles.heroCopy}>
            Practice high-priority concepts, review every solution, and let your attempt history shape the next question set.
          </Text>
          <View style={styles.heroPattern}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroPatternLabel}>INTEGRATED TEST FORMAT</Text>
              <Text style={styles.heroPatternText}>190 min · Foundation 75 min · Advanced 115 min</Text>
            </View>
            <Ionicons name="time-outline" size={20} color={COLORS.teal} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard icon="document-text-outline" label="Attempts" value={totals.attempts || 0} detail="completed" />
          <StatCard
            icon="speedometer-outline"
            label="Average accuracy"
            value={percentage(totals.averageAccuracy)}
            detail={totals.recentTrend === null || totals.recentTrend === undefined
              ? 'all questions'
              : `${totals.recentTrend >= 0 ? '+' : ''}${totals.recentTrend} pts vs prev. 3`}
            color={COLORS.blue}
          />
          <StatCard icon="trophy-outline" label="Best accuracy" value={percentage(totals.bestAccuracy)} detail="personal best" color={COLORS.amber} />
        </View>

        {dashboard?.weakestTopic ? (
          <View style={styles.adaptiveCard}>
            <View style={styles.adaptiveHeader}>
              <View style={styles.adaptiveIcon}><Ionicons name="analytics-outline" size={16} color={COLORS.teal} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.adaptiveTitle}>Your performance signals</Text>
                <Text style={styles.adaptiveSubtitle}>These signals influence your next quiz.</Text>
              </View>
            </View>
            <View style={styles.adaptiveSignals}>
              <TouchableOpacity style={styles.adaptiveSignal} onPress={() => beginTopicPractice(dashboard.weakestTopic)}>
                <Text style={styles.adaptiveSignalLabel}>FOCUS NEXT</Text>
                <Text numberOfLines={1} style={styles.adaptiveSignalTopic}>{dashboard.weakestTopic.name}</Text>
                <Text style={[styles.adaptiveSignalValue, { color: COLORS.red }]}>{percentage(dashboard.weakestTopic.accuracy)} accuracy · {dashboard.weakestTopic.seen} answers</Text>
              </TouchableOpacity>
              <View style={styles.adaptiveDivider} />
              <View style={styles.adaptiveSignal}>
                <Text style={styles.adaptiveSignalLabel}>STRONG AREA</Text>
                <Text numberOfLines={1} style={styles.adaptiveSignalTopic}>{dashboard.strongestTopic?.name || 'Keep building data'}</Text>
                <Text style={[styles.adaptiveSignalValue, { color: COLORS.green }]}>
                  {dashboard.strongestTopic ? `${percentage(dashboard.strongestTopic.accuracy)} accuracy` : 'Practice 2+ questions per topic'}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {dashboard?.questionMistakes?.length ? (
          <View style={styles.panel}>
            <SectionHeading eyebrow="REPEATED MISSES" title="Questions to revisit" />
            <Text style={styles.panelIntro}>These questions have been missed more than once. The associated topics get extra weight in adaptive practice.</Text>
            <View style={styles.mistakeList}>
              {dashboard.questionMistakes.slice(0, 3).map((mistake) => (
                <TouchableOpacity
                  key={mistake.id}
                  style={styles.mistakeRow}
                  onPress={() => beginTopicPractice(topics.find((topic) => topic.id === mistake.topic_id) || dashboard.weakestTopic)}
                  activeOpacity={0.78}
                >
                  <View style={styles.mistakeCount}><Text style={styles.mistakeCountText}>{mistake.wrong_count}×</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={2} style={styles.mistakePrompt}>{mistake.prompt}</Text>
                    <Text style={styles.mistakeMeta}>{mistake.subject_name} · {mistake.topic_name}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={15} color={COLORS.teal} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.tabs}>
          {[
            { id: 'overview', label: 'Practice', icon: 'flash-outline' },
            { id: 'topics', label: 'Topics', icon: 'grid-outline' },
            { id: 'history', label: 'History', icon: 'time-outline' },
          ].map((item) => (
            <TouchableOpacity key={item.id} onPress={() => setTab(item.id)} style={[styles.tabButton, tab === item.id && styles.tabButtonActive]}>
              <Ionicons name={item.icon} size={15} color={tab === item.id ? COLORS.teal : COLORS.muted} />
              <Text style={[styles.tabText, tab === item.id && styles.tabTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'overview' ? (
          <>
            <View style={styles.panel}>
              <SectionHeading eyebrow="BUILD A SESSION" title="Choose your practice mode" />
              <View style={styles.modeGrid}>
                {MODES.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setMode(item.id)}
                    activeOpacity={0.78}
                    style={[styles.modeCard, mode === item.id && styles.modeCardSelected]}
                  >
                    <View style={[styles.modeIcon, mode === item.id && styles.modeIconSelected]}>
                      <Ionicons name={item.icon} size={17} color={mode === item.id ? COLORS.teal : COLORS.muted} />
                    </View>
                    <Text style={styles.modeTitle}>{item.title}</Text>
                    <Text style={styles.modeSubtitle}>{item.subtitle}</Text>
                    {mode === item.id ? <Ionicons name="checkmark-circle" size={17} color={COLORS.teal} style={styles.modeCheck} /> : null}
                  </TouchableOpacity>
                ))}
              </View>

              {mode === 'subject' ? (
                <View style={styles.selectorBlock}>
                  <Text style={styles.fieldLabel}>SUBJECT</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                    {subjects.map((subject) => (
                      <Pill
                        key={subject.id}
                        label={subject.name}
                        selected={selectedSubjectId === subject.id}
                        onPress={() => {
                          setSelectedSubjectId(subject.id);
                          const topic = topics.find((entry) => entry.subjectId === subject.id);
                          if (topic) setSelectedTopicId(topic.id);
                        }}
                      />
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              {mode === 'topic' ? (
                <View style={styles.selectorBlock}>
                  <Text style={styles.fieldLabel}>TOPIC</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                    {topics.map((topic) => (
                      <Pill
                        key={topic.id}
                        label={topic.name}
                        selected={selectedTopicId === topic.id}
                        onPress={() => {
                          setSelectedTopicId(topic.id);
                          setSelectedSubjectId(topic.subjectId);
                        }}
                      />
                    ))}
                  </ScrollView>
                  <Text style={styles.selectorHint}>
                    {selectedTopic?.name || 'Selected topic'} · {selectedTopic?.bankCount || 0} saved question{selectedTopic?.bankCount === 1 ? '' : 's'}; new sets are generated for you
                  </Text>
                </View>
              ) : null}

              <View style={styles.selectorBlock}>
                <Text style={styles.fieldLabel}>DIFFICULTY</Text>
                <View style={styles.pillRowWrap}>
                  {DIFFICULTIES.map((item) => (
                    <Pill key={item.id} label={item.label} selected={difficulty === item.id} onPress={() => setDifficulty(item.id)} compact />
                  ))}
                </View>
              </View>

              {mode !== 'full_mock' ? (
                <View style={styles.selectorBlock}>
                  <Text style={styles.fieldLabel}>QUESTIONS</Text>
                  <View style={styles.pillRowWrap}>
                    {COUNTS.map((count) => (
                      <Pill key={count} label={`${count}`} selected={questionCount === count} onPress={() => setQuestionCount(count)} compact />
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.mockNotice}>
                  <Ionicons name="information-circle-outline" size={18} color={COLORS.blue} />
                  <Text style={styles.mockNoticeText}>A 30-question practice mix with the official 190-minute section timing. The official test does not publish a fixed question count.</Text>
                </View>
              )}

              <TouchableOpacity style={styles.startButton} onPress={startQuiz} activeOpacity={0.82} disabled={generating}>
                {generating ? <ActivityIndicator color="#04131a" size="small" /> : null}
                <Text style={styles.startButtonText}>{generating ? 'Generating with AI…' : mode === 'full_mock' ? 'Start full mock' : 'Generate adaptive quiz'}</Text>
                {!generating ? <Ionicons name="arrow-forward" size={17} color="#04131a" /> : null}
              </TouchableOpacity>
              <Text style={styles.dataNote}>{totals.questionBankSize || 0} AI-generated questions in your history · Adaptive weighting uses your answer history and curated topic priorities.</Text>
            </View>

            <View style={styles.examPatternCard}>
              <View style={styles.patternHeader}>
                <View style={styles.patternIcon}><Ionicons name="clipboard-outline" size={18} color={COLORS.blue} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.patternTitle}>TCS All India NQT · integrated pattern</Text>
                  <Text style={styles.patternSub}>Pattern profile shown for the 2026 hiring cycle</Text>
                </View>
              </View>
              <View style={styles.patternRows}>
                <View style={styles.patternRow}><Text style={styles.patternPart}>Foundation</Text><Text style={styles.patternDuration}>75 min</Text></View>
                <View style={styles.patternSubrow}><Text style={styles.patternSubpart}>Numerical · Verbal · Reasoning</Text><Text style={styles.patternDurationSmall}>25 min each</Text></View>
                <View style={styles.patternRow}><Text style={styles.patternPart}>Advanced</Text><Text style={styles.patternDuration}>115 min</Text></View>
                <View style={styles.patternSubrow}><Text style={styles.patternSubpart}>Advanced Quant & Reasoning · Coding</Text><Text style={styles.patternDurationSmall}>25 + 90 min</Text></View>
              </View>
              <Text style={styles.patternFootnote}>Coding Logic cards here are short self-check drills; the app does not execute code solutions.</Text>
            </View>

            {recentAttempts.length ? (
              <View style={styles.panel}>
                <SectionHeading
                  eyebrow="YOUR TRACK RECORD"
                  title="Recent attempts"
                  trailing={<TouchableOpacity onPress={() => setTab('history')}><Text style={styles.seeAll}>See all</Text></TouchableOpacity>}
                />
                <View style={styles.historyList}>
                  {recentAttempts.slice(0, 3).map((item) => (
                    <AttemptRow key={item.id} attempt={item} onPress={() => openAttempt(item.id)} />
                  ))}
                </View>
              </View>
            ) : null}
          </>
        ) : null}

        {tab === 'topics' ? (
          <View style={styles.panel}>
            <SectionHeading eyebrow="SECTION-WISE" title="Subject performance" />
            <View style={styles.subjectSummaryList}>
              {(dashboard?.subjects || []).map((subject) => {
                const practiced = subject.seen > 0;
                const value = Number(subject.accuracy || 0);
                const tone = value >= 75 ? COLORS.green : value >= 50 ? COLORS.amber : COLORS.red;
                return (
                  <View key={subject.subjectId} style={styles.subjectSummaryRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subjectSummaryName}>{subject.name}</Text>
                      <Text style={styles.subjectSummaryMeta}>{subject.section} · {subject.seen} questions answered</Text>
                      <View style={styles.subjectProgressTrack}>
                        {practiced ? <View style={[styles.subjectProgressFill, { width: `${value}%`, backgroundColor: tone }]} /> : null}
                      </View>
                    </View>
                    <Text style={[styles.subjectSummaryAccuracy, { color: practiced ? tone : COLORS.blue }]}>{practiced ? percentage(value) : 'NEW'}</Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.topicListDivider} />
            <SectionHeading eyebrow="WEIGHTED BY EXAM RELEVANCE" title="Topic priority map" />
            <Text style={styles.panelIntro}>Importance and frequency guide quiz selection. Your accuracy and recent mistakes raise a topic’s adaptive priority.</Text>
            {topics.map((topic) => {
              const weak = topic.accuracy !== null && topic.accuracy < 60;
              const fresh = topic.seen === 0;
              const tone = fresh ? COLORS.blue : weak ? COLORS.red : topic.accuracy >= 80 ? COLORS.green : COLORS.amber;
              return (
                <View style={styles.topicRow} key={topic.id}>
                  <View style={styles.topicInfo}>
                    <Text style={styles.topicName}>{topic.name}</Text>
                    <Text style={styles.topicSubject}>{topic.subjectName} · {topic.difficulty}</Text>
                    <View style={styles.topicMetaLine}>
                      <Text style={styles.topicMeta}>Importance {topic.importance}/5</Text>
                      <Text style={styles.topicDot}>·</Text>
                      <Text style={styles.topicMeta}>Frequency {topic.frequency}/5</Text>
                    </View>
                  </View>
                  <View style={styles.topicResult}>
                    <Text style={[styles.topicAccuracy, { color: tone }]}>{fresh ? 'NEW' : percentage(topic.accuracy)}</Text>
                    <Text style={styles.topicAttempts}>{topic.bankCount} bank · {topic.seen ? `${topic.seen} answered` : 'new'}</Text>
                  </View>
                  <TouchableOpacity style={styles.topicPracticeButton} onPress={() => beginTopicPractice(topic)}>
                    <Ionicons name="arrow-forward" size={16} color={COLORS.teal} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ) : null}

        {tab === 'history' ? (
          <View style={styles.panel}>
            <SectionHeading eyebrow="SAVED TO YOUR NQT HISTORY" title="Quiz history" />
            {recentAttempts.length ? (
              <View style={styles.historyList}>
                {recentAttempts.map((item) => (
                  <AttemptRow key={item.id} attempt={item} onPress={() => openAttempt(item.id)} />
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="file-tray-outline" size={26} color={COLORS.muted} />
                <Text style={styles.emptyTitle}>Your history starts with your first attempt.</Text>
                <Text style={styles.emptyCopy}>Completed quizzes and answers are stored separately in the NQT history. Offline attempts sync when your connection returns.</Text>
              </View>
            )}
          </View>
        ) : null}
      </>
    );
  };

  const renderQuiz = () => {
    if (!currentQuestion) return null;
    const questions = activeQuiz.questionSnapshot;
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    const currentAnswer = answers[currentQuestion.id];
    const questionNumber = String(currentQuestionIndex + 1).padStart(2, '0');
    return (
      <>
        <View style={styles.quizProgressWrap}>
          <View style={styles.quizProgressInfo}>
            <Text style={styles.quizProgressText}>QUESTION {questionNumber} OF {questions.length}</Text>
            <Text style={styles.quizProgressText}>{answeredCount} answered</Text>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
        </View>

        <View style={styles.questionCard}>
          <View style={styles.questionMetaRow}>
            <View style={styles.questionSectionTag}><Text style={styles.questionSectionText}>{currentQuestion.section}</Text></View>
            <Text style={styles.questionTopic}>{currentQuestion.topicName}</Text>
            <View style={styles.difficultyTag}><Text style={styles.difficultyText}>{currentQuestion.difficulty}</Text></View>
          </View>
          <Text style={styles.questionPrompt}>{currentQuestion.prompt}</Text>

          <View style={styles.optionsList}>
            {currentQuestion.options.map((option) => {
              const selected = currentAnswer === option.label;
              return (
                <TouchableOpacity
                  key={option.label}
                  onPress={() => selectAnswer(currentQuestion.id, option.label)}
                  activeOpacity={0.78}
                  style={[styles.optionButton, selected && styles.optionButtonSelected]}
                >
                  <View style={[styles.optionLetter, selected && styles.optionLetterSelected]}>
                    {selected ? <Ionicons name="checkmark" size={15} color="#04131a" /> : <Text style={styles.optionLetterText}>{option.label}</Text>}
                  </View>
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.questionActions}>
            <TouchableOpacity onPress={() => toggleMarked(currentQuestion.id)} style={[styles.markButton, marked[currentQuestion.id] && styles.markButtonActive]}>
              <Ionicons name={marked[currentQuestion.id] ? 'bookmark' : 'bookmark-outline'} size={16} color={marked[currentQuestion.id] ? COLORS.amber : COLORS.muted} />
              <Text style={[styles.markButtonText, marked[currentQuestion.id] && { color: COLORS.amber }]}>{marked[currentQuestion.id] ? 'Marked for review' : 'Mark for review'}</Text>
            </TouchableOpacity>
            <Text style={styles.questionTimeHint}>{formatTime(questionTime[currentQuestion.id] || 0)} on this question</Text>
          </View>
        </View>

        <View style={styles.questionNavCard}>
          <View style={styles.questionNavHeader}>
            <Text style={styles.navCardTitle}>Question navigator</Text>
            <Text style={styles.navCardMeta}>{markedCount} marked</Text>
          </View>
          <View style={styles.questionGrid}>
            {questions.map((question, index) => {
              const selected = index === currentQuestionIndex;
              const done = Boolean(answers[question.id]);
              return (
                <TouchableOpacity
                  key={question.id}
                  onPress={() => changeQuestion(index)}
                  style={[
                    styles.questionGridItem,
                    done && styles.questionGridDone,
                    selected && styles.questionGridCurrent,
                    marked[question.id] && styles.questionGridMarked,
                  ]}
                >
                  <Text style={[styles.questionGridText, done && styles.questionGridTextDone, selected && styles.questionGridTextCurrent]}>{index + 1}</Text>
                  {marked[question.id] ? <View style={styles.questionGridBookmark} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.teal }]} /><Text style={styles.legendText}>Answered</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { borderWidth: 1, borderColor: COLORS.amber }]} /><Text style={styles.legendText}>Review</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { borderWidth: 1, borderColor: COLORS.border }]} /><Text style={styles.legendText}>Unanswered</Text></View>
          </View>
        </View>

        <View style={styles.quizBottomNav}>
          <TouchableOpacity
            onPress={() => changeQuestion(currentQuestionIndex - 1)}
            disabled={currentQuestionIndex === 0}
            style={[styles.navArrowButton, currentQuestionIndex === 0 && styles.navArrowDisabled]}
          >
            <Ionicons name="arrow-back" size={16} color={currentQuestionIndex === 0 ? COLORS.muted : COLORS.text} />
            <Text style={[styles.navArrowText, currentQuestionIndex === 0 && { color: COLORS.muted }]}>Previous</Text>
          </TouchableOpacity>
          {currentQuestionIndex < questions.length - 1 ? (
            <TouchableOpacity onPress={() => changeQuestion(currentQuestionIndex + 1)} style={styles.nextButton}>
              <Text style={styles.nextButtonText}>Next question</Text><Ionicons name="arrow-forward" size={16} color="#04131a" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={requestSubmit} style={styles.submitButton} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#04131a" size="small" /> : <Text style={styles.nextButtonText}>Review & submit</Text>}
              {!submitting ? <Ionicons name="checkmark-circle-outline" size={17} color="#04131a" /> : null}
            </TouchableOpacity>
          )}
        </View>
      </>
    );
  };

  const renderAttempt = (isReview = false) => {
    if (!attempt) return null;
    const correct = Number(attempt.correct_count || 0);
    const wrong = Number(attempt.incorrect_count || 0);
    const unanswered = Number(attempt.unanswered_count || 0);
    const questions = attempt.questions || [];
    const modeName = MODES.find((item) => item.id === attempt.mode)?.title || 'Practice';
    return (
      <>
        <View style={styles.resultHero}>
          <View style={styles.resultIcon}><Ionicons name={isReview ? 'document-text-outline' : 'ribbon-outline'} size={23} color={COLORS.teal} /></View>
          <Text style={styles.resultEyebrow}>{isReview ? 'ATTEMPT REVIEW' : 'QUIZ COMPLETE'}</Text>
          <Text style={styles.resultTitle}>{isReview ? 'Review your answers' : 'One step stronger.'}</Text>
          <Text style={styles.resultSubtitle}>{modeName} · {attempt.difficulty || 'exam'} · {formatTime(attempt.time_taken_seconds)}</Text>
          <View style={styles.resultScoreRing}>
            <Text style={styles.resultAccuracy}>{percentage(attempt.accuracy)}</Text>
            <Text style={styles.resultAccuracyLabel}>accuracy</Text>
          </View>
          <Text style={styles.scoreLine}>{correct} correct of {attempt.question_count || questions.length} questions</Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard icon="checkmark-circle-outline" label="Correct" value={correct} color={COLORS.green} />
          <StatCard icon="close-circle-outline" label="Incorrect" value={wrong} color={COLORS.red} />
          <StatCard icon="remove-circle-outline" label="Unanswered" value={unanswered} color={COLORS.muted} />
        </View>

        <View style={styles.timeAnalysisCard}>
          <SectionHeading eyebrow="PACE ANALYSIS" title="Time breakdown" />
          <View style={styles.timeAnalysisRows}>
            <View style={styles.timeAnalysisRow}><Text style={styles.timeAnalysisLabel}>Time used</Text><Text style={styles.timeAnalysisValue}>{formatTime(attempt.time_taken_seconds)}</Text></View>
            <View style={styles.timeAnalysisRow}><Text style={styles.timeAnalysisLabel}>Time allowed</Text><Text style={styles.timeAnalysisValue}>{formatTime(attempt.duration_seconds)}</Text></View>
            <View style={styles.timeAnalysisRow}><Text style={styles.timeAnalysisLabel}>Average per question</Text><Text style={styles.timeAnalysisValue}>{formatTime(questions.length ? Math.round(Number(attempt.time_taken_seconds || 0) / questions.length) : 0)}</Text></View>
          </View>
        </View>

        <View style={styles.panel}>
          <SectionHeading eyebrow="PERFORMANCE BY CONCEPT" title="Topic breakdown" />
          {resultQuestionStats.map((item) => {
            const value = item.total ? (item.correct / item.total) * 100 : 0;
            const tone = value >= 75 ? COLORS.green : value >= 50 ? COLORS.amber : COLORS.red;
            return (
              <View key={item.topicId} style={styles.breakdownRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.breakdownTopic}>{item.topicName}</Text>
                  <Text style={styles.breakdownSubject}>{item.subjectName} · {item.correct}/{item.total} correct</Text>
                  <View style={styles.breakdownTrack}><View style={[styles.breakdownFill, { width: `${value}%`, backgroundColor: tone }]} /></View>
                </View>
                <Text style={[styles.breakdownPct, { color: tone }]}>{percentage(value)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.reviewHeading}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>LEARN FROM EVERY RESPONSE</Text>
            <Text style={styles.sectionTitle}>Detailed solutions</Text>
          </View>
          {!isReview ? <Text style={styles.solutionCount}>{questions.length} questions</Text> : null}
        </View>

        {questions.map((question, index) => {
          const selectedOption = question.selectedOption;
          const optionText = question.options.find((option) => option.label === selectedOption)?.text;
          const correctText = question.options.find((option) => option.label === question.answer)?.text;
          const solutionData = question.solution || {};
          const optionAnalysis = solutionData.optionAnalysis || {};
          return (
            <View key={`${attempt.id}-${question.id}`} style={styles.solutionCard}>
              <View style={styles.solutionTopline}>
                <View style={[
                  styles.solutionStatus,
                  selectedOption === question.answer ? styles.solutionStatusCorrect : selectedOption ? styles.solutionStatusWrong : styles.solutionStatusBlank,
                ]}>
                  <Ionicons
                    name={selectedOption === question.answer ? 'checkmark' : selectedOption ? 'close' : 'remove'}
                    size={13}
                    color={selectedOption === question.answer ? COLORS.green : selectedOption ? COLORS.red : COLORS.muted}
                  />
                  <Text style={[
                    styles.solutionStatusText,
                    selectedOption === question.answer ? { color: COLORS.green } : selectedOption ? { color: COLORS.red } : { color: COLORS.muted },
                  ]}>{selectedOption === question.answer ? 'Correct' : selectedOption ? 'Incorrect' : 'Unanswered'}</Text>
                </View>
                <Text style={styles.solutionQuestionNo}>QUESTION {String(index + 1).padStart(2, '0')}</Text>
              </View>
              <View style={styles.solutionMeta}>
                <Text style={styles.solutionTopic}>{question.topicName}</Text>
                <Text style={styles.solutionMetaDot}>·</Text>
                <Text style={styles.solutionDifficulty}>{question.difficulty}</Text>
                <Text style={styles.solutionMetaDot}>·</Text>
                <Text style={styles.solutionDifficulty}>{question.subjectName}</Text>
              </View>
              <Text style={styles.solutionPrompt}>{question.prompt}</Text>
              <View style={styles.answerCompare}>
                <View style={[styles.answerCompareBox, selectedOption === question.answer ? styles.answerCompareRight : styles.answerCompareWrong]}>
                  <Text style={styles.answerCompareLabel}>YOUR ANSWER</Text>
                  <Text style={styles.answerCompareValue}>{selectedOption ? `${selectedOption}. ${optionText}` : 'Not answered'}</Text>
                </View>
                <View style={[styles.answerCompareBox, styles.answerCompareCorrect]}>
                  <Text style={styles.answerCompareLabel}>CORRECT ANSWER</Text>
                  <Text style={styles.answerCompareValue}>{question.answer}. {correctText}</Text>
                </View>
              </View>

              <View style={styles.solutionSection}>
                <Text style={styles.solutionSectionTitle}>Why this is correct</Text>
                <Text style={styles.solutionBody}>{solutionData.overview || 'Review the rule and apply it to the values in the question.'}</Text>
              </View>
              <View style={styles.solutionSection}>
                <Text style={styles.solutionSectionTitle}>Step-by-step</Text>
                {(solutionData.steps || []).map((step, stepIndex) => (
                  <View style={styles.stepRow} key={`${question.id}-step-${stepIndex}`}>
                    <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{stepIndex + 1}</Text></View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.tipBox}>
                <Ionicons name="flash-outline" size={15} color={COLORS.amber} />
                <View style={{ flex: 1 }}><Text style={styles.tipLabel}>QUICK METHOD</Text><Text style={styles.tipText}>{solutionData.shortcut}</Text></View>
              </View>
              <View style={styles.formulaBox}>
                <Text style={styles.formulaLabel}>FORMULA / CONCEPT</Text>
                <Text style={styles.formulaText}>{solutionData.formula}</Text>
              </View>
              {solutionData.alternatives?.length ? (
                <View style={styles.solutionSection}>
                  <Text style={styles.solutionSectionTitle}>Other ways to reason</Text>
                  {solutionData.alternatives.map((item, altIndex) => <Text key={`${question.id}-alt-${altIndex}`} style={styles.bulletText}>• {item}</Text>)}
                </View>
              ) : null}
              <View style={styles.solutionSection}>
                <Text style={styles.solutionSectionTitle}>Option analysis</Text>
                {question.options.map((option) => (
                  <View style={styles.optionAnalysisRow} key={`${question.id}-analysis-${option.label}`}>
                    <Text style={[styles.optionAnalysisLetter, option.label === question.answer && { color: COLORS.green }]}>{option.label}</Text>
                    <Text style={styles.optionAnalysisText}>
                      <Text style={styles.optionAnalysisChoice}>{option.text} — </Text>
                      {optionAnalysis[option.label] || (option.label === question.answer ? 'Correct answer.' : 'This choice does not fit the stated conditions.')}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.trapBox}>
                <Ionicons name="warning-outline" size={15} color={COLORS.red} />
                <View style={{ flex: 1 }}><Text style={styles.trapLabel}>COMMON TRAP</Text><Text style={styles.trapText}>{solutionData.commonMistakes}</Text></View>
              </View>
              <View style={styles.solutionFoot}>
                <Text style={styles.solutionFootText}>Time on question: {formatTime(question.timeSpentSeconds)} · {question.pattern || 'NQT-style practice'}</Text>
              </View>
            </View>
          );
        })}
        <TouchableOpacity style={styles.secondaryButton} onPress={() => { setAttempt(null); setView('home'); setTab('overview'); }}>
          <Ionicons name="home-outline" size={17} color={COLORS.text} /><Text style={styles.secondaryButtonText}>Back to quiz dashboard</Text>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderTopbar()}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {view === 'home' ? renderHome() : null}
        {view === 'quiz' ? renderQuiz() : null}
        {view === 'result' ? renderAttempt(false) : null}
        {view === 'review' ? renderAttempt(true) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 12, color: COLORS.muted, fontSize: 13 },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: '#1c2b3d' },
  backButton: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border },
  brandOverline: { fontSize: 9, lineHeight: 13, letterSpacing: 1.3, color: COLORS.muted, fontWeight: '800' },
  brandTitle: { color: COLORS.text, fontWeight: '800', fontSize: 16, lineHeight: 20 },
  patternPill: { borderRadius: 20, backgroundColor: '#15352f', borderWidth: 1, borderColor: '#236b5d', paddingHorizontal: 10, paddingVertical: 6 },
  patternPillText: { color: COLORS.teal, fontSize: 10, fontWeight: '800' },
  timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12, backgroundColor: '#15352f', borderWidth: 1, borderColor: '#236b5d' },
  timerBadgeUrgent: { backgroundColor: '#3a202b', borderColor: '#793245' },
  timerText: { color: COLORS.teal, fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: 960, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 42, gap: 16 },
  hero: { overflow: 'hidden', position: 'relative', padding: 20, borderRadius: 22, backgroundColor: '#112b3b', borderWidth: 1, borderColor: '#245264' },
  heroOrbOne: { position: 'absolute', width: 190, height: 190, borderRadius: 95, top: -110, right: -30, backgroundColor: 'rgba(54,214,189,0.08)' },
  heroOrbTwo: { position: 'absolute', width: 130, height: 130, borderRadius: 65, bottom: -90, right: 70, backgroundColor: 'rgba(101,168,255,0.07)' },
  heroTag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, backgroundColor: 'rgba(54,214,189,0.12)', paddingHorizontal: 10, paddingVertical: 6 },
  heroTagText: { color: COLORS.teal, fontSize: 9, letterSpacing: 1, fontWeight: '800' },
  heroTitle: { color: COLORS.text, fontSize: 27, lineHeight: 34, fontWeight: '900', marginTop: 13, letterSpacing: -0.5 },
  heroCopy: { color: '#b2c5d5', fontSize: 13, lineHeight: 20, marginTop: 7, maxWidth: 560 },
  heroPattern: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(191,221,232,0.16)' },
  heroPatternLabel: { fontSize: 9, color: '#85a4b5', letterSpacing: 1, fontWeight: '800' },
  heroPatternText: { color: COLORS.text, fontSize: 12, fontWeight: '700', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 9 },
  statCard: { flex: 1, minWidth: 0, padding: 12, backgroundColor: COLORS.panel, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  statIcon: { width: 29, height: 29, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { color: COLORS.text, fontSize: 20, fontWeight: '900' },
  statLabel: { color: '#c1cfdd', fontSize: 10, lineHeight: 14, fontWeight: '700', marginTop: 2 },
  statDetail: { color: COLORS.muted, fontSize: 9, marginTop: 3 },
  adaptiveCard: { padding: 14, borderRadius: 16, backgroundColor: '#101f2d', borderWidth: 1, borderColor: '#254458' },
  adaptiveHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  adaptiveIcon: { width: 29, height: 29, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#153b38' },
  adaptiveTitle: { color: COLORS.text, fontSize: 11, fontWeight: '900' },
  adaptiveSubtitle: { color: COLORS.muted, fontSize: 9, marginTop: 3 },
  adaptiveSignals: { flexDirection: 'row', alignItems: 'stretch', gap: 12, marginTop: 13 },
  adaptiveSignal: { flex: 1, minWidth: 0 },
  adaptiveSignalLabel: { color: '#89a0b4', fontSize: 8, letterSpacing: 0.8, fontWeight: '900' },
  adaptiveSignalTopic: { color: COLORS.text, fontSize: 10, fontWeight: '800', marginTop: 5 },
  adaptiveSignalValue: { fontSize: 8, marginTop: 4 },
  adaptiveDivider: { width: 1, backgroundColor: COLORS.border },
  mistakeList: { gap: 8 },
  mistakeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: '#0b1726', borderWidth: 1, borderColor: '#29374b' },
  mistakeCount: { minWidth: 36, height: 31, borderRadius: 9, backgroundColor: '#40232c', alignItems: 'center', justifyContent: 'center' },
  mistakeCountText: { color: COLORS.red, fontSize: 10, fontWeight: '900' },
  mistakePrompt: { color: '#d9e4ed', fontSize: 10, lineHeight: 15, fontWeight: '700' },
  mistakeMeta: { color: COLORS.muted, fontSize: 8, marginTop: 4 },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.panel, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: COLORS.border },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabButtonActive: { backgroundColor: '#16342f' },
  tabText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: COLORS.teal },
  panel: { backgroundColor: COLORS.panel, padding: 16, borderRadius: 19, borderWidth: 1, borderColor: COLORS.border },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  eyebrow: { color: COLORS.teal, fontSize: 9, letterSpacing: 1.2, fontWeight: '900', marginBottom: 4 },
  sectionTitle: { color: COLORS.text, fontSize: 18, lineHeight: 23, fontWeight: '800' },
  seeAll: { color: COLORS.teal, fontSize: 11, fontWeight: '800', paddingLeft: 10 },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  modeCard: { position: 'relative', width: '48%', minHeight: 102, flexGrow: 1, padding: 12, borderRadius: 14, backgroundColor: '#0b1726', borderWidth: 1, borderColor: COLORS.border },
  modeCardSelected: { borderColor: '#2fae9a', backgroundColor: '#102b2b' },
  modeIcon: { width: 29, height: 29, borderRadius: 10, backgroundColor: '#19283a', alignItems: 'center', justifyContent: 'center' },
  modeIconSelected: { backgroundColor: '#1b493e' },
  modeTitle: { color: COLORS.text, fontSize: 12, fontWeight: '800', marginTop: 8 },
  modeSubtitle: { color: COLORS.muted, fontSize: 10, lineHeight: 14, marginTop: 3, paddingRight: 9 },
  modeCheck: { position: 'absolute', top: 11, right: 10 },
  selectorBlock: { marginTop: 17 },
  fieldLabel: { color: '#8ea2b9', fontSize: 9, letterSpacing: 1.05, fontWeight: '900', marginBottom: 8 },
  selectorHint: { color: '#8095aa', fontSize: 9, marginTop: 8 },
  pillRow: { gap: 7, paddingRight: 3 },
  pillRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  pill: { paddingHorizontal: 11, paddingVertical: 8, backgroundColor: '#0b1726', borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  pillCompact: { paddingHorizontal: 13, paddingVertical: 7 },
  pillSelected: { backgroundColor: '#1b293c', borderColor: '#4a7db0' },
  pillTeal: { backgroundColor: '#123b35', borderColor: '#2fae9a' },
  pillText: { color: '#a9b8c9', fontSize: 11, fontWeight: '700' },
  pillTextSelected: { color: COLORS.text },
  mockNotice: { flexDirection: 'row', gap: 9, padding: 11, marginTop: 15, backgroundColor: '#10263a', borderRadius: 12, borderWidth: 1, borderColor: '#224969' },
  mockNoticeText: { color: '#bad0e5', fontSize: 10, lineHeight: 15, flex: 1 },
  startButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9, marginTop: 18, backgroundColor: COLORS.teal, minHeight: 48, borderRadius: 13 },
  startButtonText: { color: '#04131a', fontSize: 13, fontWeight: '900' },
  dataNote: { color: '#8195a9', fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 9 },
  examPatternCard: { padding: 16, borderRadius: 18, backgroundColor: '#101d2d', borderWidth: 1, borderColor: COLORS.border },
  patternHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  patternIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#152d47', alignItems: 'center', justifyContent: 'center' },
  patternTitle: { color: COLORS.text, fontWeight: '800', fontSize: 12 },
  patternSub: { color: COLORS.muted, fontSize: 10, marginTop: 4 },
  patternRows: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 14, paddingTop: 11, gap: 9 },
  patternRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  patternPart: { color: COLORS.text, fontSize: 12, fontWeight: '800' },
  patternDuration: { color: COLORS.teal, fontSize: 12, fontWeight: '900' },
  patternSubrow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: -5, marginBottom: 2 },
  patternSubpart: { color: '#9fb0c2', fontSize: 10, flex: 1 },
  patternDurationSmall: { color: '#9fb0c2', fontSize: 10 },
  patternFootnote: { color: '#8296aa', fontSize: 9, lineHeight: 14, marginTop: 13 },
  panelIntro: { color: COLORS.muted, fontSize: 11, lineHeight: 17, marginTop: -5, marginBottom: 8 },
  subjectSummaryList: { marginTop: -4, marginBottom: 3 },
  subjectSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#203147' },
  subjectSummaryName: { color: COLORS.text, fontSize: 10, fontWeight: '800' },
  subjectSummaryMeta: { color: COLORS.muted, fontSize: 8, marginTop: 3 },
  subjectProgressTrack: { height: 3, backgroundColor: '#27364a', borderRadius: 3, marginTop: 7, overflow: 'hidden' },
  subjectProgressFill: { height: '100%', borderRadius: 3 },
  subjectSummaryAccuracy: { fontSize: 10, fontWeight: '900', minWidth: 35, textAlign: 'right' },
  topicListDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 13 },
  topicRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#203147' },
  topicInfo: { flex: 1, minWidth: 0 },
  topicName: { color: COLORS.text, fontSize: 12, fontWeight: '800' },
  topicSubject: { color: '#a6b6c8', fontSize: 10, marginTop: 4 },
  topicMetaLine: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 5 },
  topicMeta: { color: '#8094a9', fontSize: 9 },
  topicDot: { color: '#50627a', fontSize: 10 },
  topicResult: { minWidth: 62, alignItems: 'flex-end' },
  topicAccuracy: { fontSize: 12, fontWeight: '900' },
  topicAttempts: { color: COLORS.muted, fontSize: 8, marginTop: 3 },
  topicPracticeButton: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#15352f' },
  historyList: { gap: 8 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#0b1726', borderWidth: 1, borderColor: '#203147', borderRadius: 13, padding: 10 },
  historyScore: { width: 48, height: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#132133' },
  historyScoreText: { fontSize: 13, fontWeight: '900' },
  historyTitle: { color: COLORS.text, fontSize: 11, fontWeight: '800' },
  historyMeta: { color: COLORS.muted, fontSize: 9, marginTop: 4 },
  emptyState: { minHeight: 145, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18 },
  emptyTitle: { color: COLORS.text, fontSize: 13, fontWeight: '800', textAlign: 'center', marginTop: 10 },
  emptyCopy: { color: COLORS.muted, fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 6 },
  quizProgressWrap: { paddingVertical: 6 },
  quizProgressInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  quizProgressText: { color: '#92a5bb', fontSize: 9, fontWeight: '800', letterSpacing: 0.65 },
  progressTrack: { height: 5, borderRadius: 5, overflow: 'hidden', backgroundColor: '#1b2b3f' },
  progressFill: { height: '100%', backgroundColor: COLORS.teal, borderRadius: 5 },
  questionCard: { padding: 16, borderRadius: 18, backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border },
  questionMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  questionSectionTag: { backgroundColor: '#183348', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7 },
  questionSectionText: { color: '#8fc5fb', fontSize: 9, fontWeight: '800' },
  questionTopic: { color: '#a9bbcf', fontSize: 10, flex: 1 },
  difficultyTag: { borderWidth: 1, borderColor: '#46607e', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  difficultyText: { color: '#b4c4d5', fontSize: 9, fontWeight: '800', textTransform: 'capitalize' },
  questionPrompt: { color: COLORS.text, fontSize: 17, lineHeight: 25, fontWeight: '700', marginTop: 18, marginBottom: 17 },
  optionsList: { gap: 8 },
  optionButton: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#0b1726', borderWidth: 1, borderColor: '#263950' },
  optionButtonSelected: { backgroundColor: '#12372f', borderColor: '#31b89f' },
  optionLetter: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1b293a' },
  optionLetterSelected: { backgroundColor: COLORS.teal },
  optionLetterText: { color: '#bac9d7', fontSize: 11, fontWeight: '900' },
  optionText: { flex: 1, color: '#c3d0dd', fontSize: 12, lineHeight: 18 },
  optionTextSelected: { color: COLORS.text, fontWeight: '700' },
  questionActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 13, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#23344a' },
  markButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5 },
  markButtonActive: { opacity: 1 },
  markButtonText: { color: COLORS.muted, fontSize: 10, fontWeight: '700' },
  questionTimeHint: { color: '#8194aa', fontSize: 9 },
  questionNavCard: { padding: 14, borderRadius: 17, backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border },
  questionNavHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  navCardTitle: { color: COLORS.text, fontSize: 12, fontWeight: '800' },
  navCardMeta: { color: COLORS.amber, fontSize: 10, fontWeight: '700' },
  questionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  questionGridItem: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#0b1726', borderWidth: 1, borderColor: '#2a3c52', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  questionGridDone: { backgroundColor: '#16463d', borderColor: '#287764' },
  questionGridCurrent: { borderWidth: 2, borderColor: COLORS.blue },
  questionGridMarked: { borderColor: COLORS.amber },
  questionGridText: { color: '#97a9bc', fontSize: 10, fontWeight: '800' },
  questionGridTextDone: { color: COLORS.teal },
  questionGridTextCurrent: { color: COLORS.text },
  questionGridBookmark: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.amber, position: 'absolute', top: 4, right: 4 },
  legendRow: { flexDirection: 'row', gap: 14, marginTop: 13, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { color: COLORS.muted, fontSize: 9 },
  quizBottomNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  navArrowButton: { minHeight: 44, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 12, backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border },
  navArrowDisabled: { opacity: 0.55 },
  navArrowText: { color: COLORS.text, fontSize: 11, fontWeight: '700' },
  nextButton: { flex: 1, minHeight: 46, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 12, backgroundColor: COLORS.teal },
  submitButton: { flex: 1, minHeight: 46, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 12, backgroundColor: COLORS.amber },
  nextButtonText: { color: '#04131a', fontSize: 11, fontWeight: '900' },
  resultHero: { padding: 20, alignItems: 'center', backgroundColor: '#102b31', borderRadius: 20, borderWidth: 1, borderColor: '#276457' },
  resultIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#1b493e', marginBottom: 12 },
  resultEyebrow: { color: COLORS.teal, fontSize: 9, letterSpacing: 1.4, fontWeight: '900' },
  resultTitle: { color: COLORS.text, fontSize: 24, fontWeight: '900', marginTop: 5 },
  resultSubtitle: { color: '#9fb6c5', fontSize: 10, marginTop: 6, textAlign: 'center' },
  resultScoreRing: { width: 116, height: 116, borderRadius: 58, borderWidth: 5, borderColor: '#32b89f', alignItems: 'center', justifyContent: 'center', marginTop: 19, backgroundColor: '#102229' },
  resultAccuracy: { color: COLORS.text, fontSize: 27, fontWeight: '900' },
  resultAccuracyLabel: { color: '#a5bac5', fontSize: 10, marginTop: 1 },
  scoreLine: { color: '#d3e3e5', fontSize: 12, fontWeight: '700', marginTop: 12 },
  timeAnalysisCard: { padding: 15, borderRadius: 17, backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border },
  timeAnalysisRows: { marginTop: -4 },
  timeAnalysisRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#203147' },
  timeAnalysisLabel: { color: COLORS.muted, fontSize: 10 },
  timeAnalysisValue: { color: COLORS.text, fontSize: 10, fontWeight: '800' },
  breakdownRow: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 11, borderTopWidth: 1, borderTopColor: '#203147' },
  breakdownTopic: { color: COLORS.text, fontSize: 11, fontWeight: '800' },
  breakdownSubject: { color: COLORS.muted, fontSize: 9, marginTop: 4 },
  breakdownTrack: { height: 4, borderRadius: 4, backgroundColor: '#26374b', marginTop: 8, overflow: 'hidden' },
  breakdownFill: { height: '100%', borderRadius: 4 },
  breakdownPct: { width: 43, textAlign: 'right', fontSize: 12, fontWeight: '900' },
  reviewHeading: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2, marginTop: 2 },
  solutionCount: { color: COLORS.muted, fontSize: 10 },
  solutionCard: { padding: 14, backgroundColor: COLORS.panel, borderRadius: 17, borderWidth: 1, borderColor: COLORS.border },
  solutionTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  solutionStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9 },
  solutionStatusCorrect: { backgroundColor: '#163c32' },
  solutionStatusWrong: { backgroundColor: '#40232c' },
  solutionStatusBlank: { backgroundColor: '#263246' },
  solutionStatusText: { fontSize: 9, fontWeight: '900' },
  solutionQuestionNo: { color: '#8296ab', fontSize: 9, letterSpacing: 0.8, fontWeight: '800' },
  solutionMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 11 },
  solutionTopic: { color: COLORS.teal, fontSize: 9, fontWeight: '800' },
  solutionMetaDot: { color: '#61758c', fontSize: 10 },
  solutionDifficulty: { color: COLORS.muted, fontSize: 9, textTransform: 'capitalize' },
  solutionPrompt: { color: COLORS.text, fontSize: 14, lineHeight: 21, fontWeight: '700', marginTop: 10 },
  answerCompare: { gap: 7, marginTop: 13 },
  answerCompareBox: { padding: 10, borderRadius: 11, borderWidth: 1 },
  answerCompareRight: { backgroundColor: '#12362f', borderColor: '#236b56' },
  answerCompareWrong: { backgroundColor: '#351f2a', borderColor: '#70404b' },
  answerCompareCorrect: { backgroundColor: '#12362f', borderColor: '#236b56' },
  answerCompareLabel: { color: '#8ca3b3', fontSize: 8, letterSpacing: 0.8, fontWeight: '900' },
  answerCompareValue: { color: COLORS.text, fontSize: 10, lineHeight: 15, fontWeight: '700', marginTop: 4 },
  solutionSection: { marginTop: 14 },
  solutionSectionTitle: { color: '#d9e6f0', fontSize: 10, fontWeight: '900', marginBottom: 7 },
  solutionBody: { color: '#aab9c8', fontSize: 10, lineHeight: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 6 },
  stepNumber: { width: 19, height: 19, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#20344b' },
  stepNumberText: { color: COLORS.blue, fontSize: 9, fontWeight: '900' },
  stepText: { flex: 1, color: '#aab9c8', fontSize: 10, lineHeight: 16, paddingTop: 1 },
  tipBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 11, backgroundColor: '#302a1b', borderWidth: 1, borderColor: '#5b4a25', marginTop: 14 },
  tipLabel: { color: COLORS.amber, fontSize: 8, letterSpacing: 0.7, fontWeight: '900', marginBottom: 4 },
  tipText: { color: '#ddd0b2', fontSize: 10, lineHeight: 15 },
  formulaBox: { padding: 10, borderRadius: 11, backgroundColor: '#142337', borderWidth: 1, borderColor: '#263f5d', marginTop: 8 },
  formulaLabel: { color: '#8ebcf0', fontSize: 8, letterSpacing: 0.7, fontWeight: '900', marginBottom: 4 },
  formulaText: { color: '#c7d9e9', fontSize: 10, lineHeight: 15 },
  bulletText: { color: '#aab9c8', fontSize: 10, lineHeight: 16, marginTop: 3 },
  optionAnalysisRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 5 },
  optionAnalysisLetter: { width: 16, color: '#95a9be', fontSize: 9, fontWeight: '900' },
  optionAnalysisText: { flex: 1, color: '#aab9c8', fontSize: 9, lineHeight: 14 },
  optionAnalysisChoice: { color: '#dae5ed', fontWeight: '800' },
  trapBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 10, borderRadius: 11, backgroundColor: '#321f2a', borderWidth: 1, borderColor: '#643344', marginTop: 14 },
  trapLabel: { color: COLORS.red, fontSize: 8, letterSpacing: 0.7, fontWeight: '900', marginBottom: 4 },
  trapText: { color: '#ddbdc5', fontSize: 10, lineHeight: 15 },
  solutionFoot: { borderTopWidth: 1, borderTopColor: '#26374b', marginTop: 13, paddingTop: 9 },
  solutionFootText: { color: '#8194a9', fontSize: 8 },
  secondaryButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, minHeight: 45, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.panel },
  secondaryButtonText: { color: COLORS.text, fontSize: 11, fontWeight: '800' },
});
