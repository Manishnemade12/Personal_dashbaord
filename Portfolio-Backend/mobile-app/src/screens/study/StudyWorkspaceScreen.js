import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  useWindowDimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StudyDao } from '../../db/dao/StudyDao';

import StudySidebarDrawer from '../../components/study/StudySidebarDrawer';
import AddContentModal from '../../components/study/AddContentModal';
import StudyQuickQuizModal from '../../components/study/StudyQuickQuizModal';

import StudyDashboardScreen from './StudyDashboardScreen';
import StudyChunkReaderScreen from './StudyChunkReaderScreen';
import DailyQuizHubScreen from './DailyQuizHubScreen';
import DailyQuizRunnerScreen from './DailyQuizRunnerScreen';
import DailyQuizResultScreen from './DailyQuizResultScreen';
import WeakTopicsScreen from './WeakTopicsScreen';
import RevisionReportScreen from './RevisionReportScreen';
import DailyQuizSettingsScreen from './DailyQuizSettingsScreen';
import StudySearchScreen from './StudySearchScreen';

export default function StudyWorkspaceScreen({ onExit, routeParams = null }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  // Study workspace internal route state
  const [activeView, setActiveView] = useState('dashboard');
  const [viewParams, setViewParams] = useState({});

  // Data cache
  const [subjects, setSubjects] = useState([]);
  const [chunks, setChunks] = useState([]);

  // UI state
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addTarget, setAddTarget] = useState(null);
  const [quickQuizModalVisible, setQuickQuizModalVisible] = useState(false);
  const [quickQuizSubjectId, setQuickQuizSubjectId] = useState(null);

  const refreshData = useCallback(async () => {
    try {
      const [subs, chs] = await Promise.all([
        StudyDao.getSubjects(),
        StudyDao.getChunks(),
      ]);
      setSubjects(subs || []);
      setChunks(chs || []);
    } catch (err) {
      console.warn('[StudyWorkspace] refreshData error:', err);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Handle chunk selection
  const handleSelectChunk = (chunkId) => {
    setViewParams({ chunkId });
    setActiveView('chunk');
    setMobileDrawerVisible(false);
  };

  // Handle general internal view navigation
  const handleNavigateView = (viewName, params = {}) => {
    setActiveView(viewName);
    setViewParams(params);
    setMobileDrawerVisible(false);
  };

  const handleOpenAddContent = (target = null) => {
    setAddTarget(target);
    setAddModalVisible(true);
    setMobileDrawerVisible(false);
  };

  const handleOpenQuickQuiz = (subjectId = null) => {
    setQuickQuizSubjectId(subjectId || subjects[0]?.id || null);
    setQuickQuizModalVisible(true);
    setMobileDrawerVisible(false);
  };

  const handleQuizReady = (subjectId, quizId) => {
    setActiveView('quiz_runner');
    setViewParams({ subjectId, quizId, timer: 10 });
    refreshData();
  };

  const handleAddSubject = async (name) => {
    try {
      await StudyDao.createSubject(name);
      await refreshData();
    } catch (e) {
      console.warn('[StudyWorkspace] Add subject error:', e);
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    try {
      await StudyDao.deleteSubject(subjectId);
      await refreshData();
      if (activeView === 'chunk') {
        setActiveView('dashboard');
      }
    } catch (e) {
      console.warn('[StudyWorkspace] Delete subject error:', e);
    }
  };

  const handleDeleteChunk = async () => {
    await refreshData();
    setActiveView('dashboard');
  };

  // Active view renderer
  const renderCurrentView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <StudyDashboardScreen
            subjects={subjects}
            chunks={chunks}
            onOpenAddContent={handleOpenAddContent}
            onOpenQuickQuiz={handleOpenQuickQuiz}
            onSelectChunk={handleSelectChunk}
          />
        );

      case 'chunk':
        return (
          <StudyChunkReaderScreen
            chunkId={viewParams.chunkId}
            subjects={subjects}
            chunks={chunks}
            onSelectChunk={handleSelectChunk}
            onNavigateHome={() => handleNavigateView('dashboard')}
            onOpenAddContent={handleOpenAddContent}
            onOpenQuickQuiz={handleOpenQuickQuiz}
            onChunkUpdated={refreshData}
            onChunkDeleted={handleDeleteChunk}
          />
        );

      case 'quiz_hub':
        return (
          <DailyQuizHubScreen
            subjects={subjects}
            onStartQuiz={(sId, qId) =>
              handleNavigateView('quiz_runner', { subjectId: sId, quizId: qId, timer: 10 })
            }
            onViewResult={(attemptId) =>
              handleNavigateView('quiz_result', { attemptId })
            }
            onNavigateWeakTopics={() => handleNavigateView('weak_topics')}
            onNavigateRevisionReport={() => handleNavigateView('revision')}
            onOpenQuickQuiz={handleOpenQuickQuiz}
          />
        );

      case 'quiz_runner':
        return (
          <DailyQuizRunnerScreen
            subjectId={viewParams.subjectId}
            quizId={viewParams.quizId}
            timerMin={viewParams.timer || 10}
            subjects={subjects}
            onQuizCompleted={(attemptId) =>
              handleNavigateView('quiz_result', { attemptId })
            }
            onBackToHub={() => handleNavigateView('quiz_hub')}
          />
        );

      case 'quiz_result':
        return (
          <DailyQuizResultScreen
            attemptId={viewParams.attemptId}
            subjects={subjects}
            onRetryQuiz={(sId, qId) =>
              handleNavigateView('quiz_runner', { subjectId: sId, quizId: qId, timer: 10 })
            }
            onBackToHub={() => handleNavigateView('quiz_hub')}
          />
        );

      case 'weak_topics':
        return (
          <WeakTopicsScreen
            subjects={subjects}
            onStartQuiz={(sId, qId) =>
              handleNavigateView('quiz_runner', { subjectId: sId, quizId: qId, timer: 10 })
            }
            onBackToHub={() => handleNavigateView('quiz_hub')}
          />
        );

      case 'revision':
        return (
          <RevisionReportScreen onBackToHub={() => handleNavigateView('quiz_hub')} />
        );

      case 'quiz_settings':
        return (
          <DailyQuizSettingsScreen onBackToHub={() => handleNavigateView('quiz_hub')} />
        );

      case 'search':
        return (
          <StudySearchScreen
            initialQuery={viewParams.query || ''}
            onSelectChunk={handleSelectChunk}
            onBack={() => handleNavigateView('dashboard')}
          />
        );

      default:
        return (
          <StudyDashboardScreen
            subjects={subjects}
            chunks={chunks}
            onOpenAddContent={handleOpenAddContent}
            onOpenQuickQuiz={handleOpenQuickQuiz}
            onSelectChunk={handleSelectChunk}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0f19" />

      {/* Top Header - Main Sidebar is Hidden! Dedicated Exit Button Provided */}
      <View style={styles.topHeader}>
        {/* Left: Prominent Exit to Dashboard Button */}
        <TouchableOpacity style={styles.exitBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={18} color="#ffffff" />
          <Text style={styles.exitBtnText}>Exit to Dashboard</Text>
        </TouchableOpacity>

        {/* Center: Brand */}
        <View style={styles.centerBrand}>
          <View style={styles.headerIconBubble}>
            <Ionicons name="book" size={15} color="#ffffff" />
          </View>
          <Text style={styles.headerBrandTitle}>SSC Study Flow</Text>
        </View>

        {/* Right: Quick Search & Mobile Drawer Hamburger */}
        <View style={styles.rightActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => handleNavigateView('search')}
            activeOpacity={0.7}
          >
            <Ionicons name="search" size={18} color="#cbd5e1" />
          </TouchableOpacity>

          {!isDesktop && (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setMobileDrawerVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="menu" size={20} color="#cbd5e1" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Workspace Frame */}
      <View style={styles.mainSplitBody}>
        {/* Desktop Left Persistent Sidebar */}
        {isDesktop && (
          <View style={styles.desktopSidebarWrap}>
            <StudySidebarDrawer
              subjects={subjects}
              chunks={chunks}
              activeChunkId={viewParams.chunkId}
              activeView={activeView}
              onSelectChunk={handleSelectChunk}
              onNavigateView={handleNavigateView}
              onOpenAddContent={handleOpenAddContent}
              onAddSubject={handleAddSubject}
              onDeleteSubject={handleDeleteSubject}
              onDeleteChunk={handleDeleteChunk}
            />
          </View>
        )}

        {/* Right Active View Area */}
        <View style={styles.activeViewWrap}>{renderCurrentView()}</View>
      </View>

      {/* Mobile Drawer Modal */}
      {!isDesktop && (
        <Modal
          visible={mobileDrawerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setMobileDrawerVisible(false)}
        >
          <View style={styles.mobileDrawerOverlay}>
            <TouchableOpacity
              style={styles.mobileBackdrop}
              activeOpacity={1}
              onPress={() => setMobileDrawerVisible(false)}
            />
            <View style={styles.mobileDrawerSheet}>
              <View style={styles.mobileDrawerTopRow}>
                <Text style={styles.mobileDrawerTitle}>Study Navigator</Text>
                <TouchableOpacity onPress={() => setMobileDrawerVisible(false)}>
                  <Ionicons name="close" size={22} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <StudySidebarDrawer
                subjects={subjects}
                chunks={chunks}
                activeChunkId={viewParams.chunkId}
                activeView={activeView}
                onSelectChunk={handleSelectChunk}
                onNavigateView={handleNavigateView}
                onOpenAddContent={handleOpenAddContent}
                onAddSubject={handleAddSubject}
                onDeleteSubject={handleDeleteSubject}
                onDeleteChunk={handleDeleteChunk}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Add Content Modal */}
      <AddContentModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        initialTarget={addTarget}
        subjects={subjects}
        chunks={chunks}
        onContentImported={() => {
          refreshData();
          setActiveView('dashboard');
        }}
      />

      {/* Quick Quiz Modal */}
      <StudyQuickQuizModal
        visible={quickQuizModalVisible}
        onClose={() => setQuickQuizModalVisible(false)}
        subjects={subjects}
        chunks={chunks}
        defaultSubjectId={quickQuizSubjectId}
        onQuizReady={handleQuizReady}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  topHeader: {
    height: 54,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  exitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  centerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBubble: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBrandTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainSplitBody: {
    flex: 1,
    flexDirection: 'row',
  },
  desktopSidebarWrap: {
    width: 280,
    height: '100%',
  },
  activeViewWrap: {
    flex: 1,
    height: '100%',
    backgroundColor: '#0b0f19',
  },
  mobileDrawerOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  mobileBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  mobileDrawerSheet: {
    width: 300,
    backgroundColor: '#0f172a',
    height: '100%',
  },
  mobileDrawerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  mobileDrawerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
});

