import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
  Linking,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/theme';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components/common';
import styles from './styles/aiColdEmailStyles';

const TONES = [
  { id: 'pitch', label: '⚡ Direct Pitch', desc: 'Fast, value-driven hook' },
  { id: 'professional', label: '💼 Professional', desc: 'Formal corporate tone' },
  { id: 'concise', label: '🚀 Short & Snappy', desc: 'Under 120 words' },
  { id: 'referral', label: '🤝 Referral Style', desc: 'Warm peer outreach' },
];

export default function AiColdEmailScreen({ onNavigate }) {
  // Conversation Sessions State
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [switchingConversation, setSwitchingConversation] = useState(false);

  // Form Inputs (bound to active conversation)
  const [inputMode, setInputMode] = useState('text'); // 'text' | 'image'
  const [jobDescription, setJobDescription] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [recipient, setRecipient] = useState('');
  const [selectedTone, setSelectedTone] = useState('pitch');

  // Screenshot Upload State
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);

  // Resume Upload / Edit Modal State
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [modalResumeText, setModalResumeText] = useState('');
  const [modalResumeFileName, setModalResumeFileName] = useState('');
  const [uploadingResume, setUploadingResume] = useState(false);
  const [savingResume, setSavingResume] = useState(false);

  // Rename Conversation Modal State
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTitleInput, setRenameTitleInput] = useState('');

  // AI Generation State
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // Generated Output State
  const [generatedResult, setGeneratedResult] = useState(null);
  const [editableSubject, setEditableSubject] = useState('');
  const [editableBody, setEditableBody] = useState('');
  const [editableRecipient, setEditableRecipient] = useState('');

  const scrollRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  // =========================================================================
  // 1. INITIAL LOAD & CONVERSATION SYNC
  // =========================================================================
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async (targetSelectId = null) => {
    setLoadingConversations(true);
    try {
      const res = await api.getAiConversations();
      const list = res?.conversations || [];
      setConversations(list);

      if (list.length > 0) {
        const idToSelect = targetSelectId || (list.some((c) => c._id === activeConversationId) ? activeConversationId : list[0]._id);
        await selectConversation(idToSelect);
      } else {
        // Create initial default conversation if none exist
        const newRes = await api.createAiConversation({ title: 'Application #1' });
        if (newRes?.conversation) {
          setConversations([newRes.conversation]);
          await selectConversation(newRes.conversation._id);
        }
      }
    } catch (err) {
      console.warn('Failed to load conversations:', err.message);
    } finally {
      setLoadingConversations(false);
    }
  };

  const selectConversation = async (conversationId) => {
    if (!conversationId) return;
    setSwitchingConversation(true);
    try {
      setActiveConversationId(conversationId);
      const res = await api.getAiConversation(conversationId);
      const convo = res?.conversation;
      if (convo) {
        setActiveConversation(convo);
        setCompany(convo.targetCompany || '');
        setRole(convo.targetRole || '');
        setRecipient(convo.recipient || '');
        setSelectedTone(convo.preferredTone || 'pitch');
        setJobDescription(convo.jdText || '');
        setImageUrl(convo.jdImageUrl || '');
        setOcrSuccess(!!(convo.jdImageUrl && convo.jdText));

        // Restore latest generated email draft if available
        if (Array.isArray(convo.emails) && convo.emails.length > 0) {
          const latest = convo.emails[0];
          setGeneratedResult(latest);
          setEditableSubject(latest.subject || '');
          setEditableBody(latest.emailBody || '');
          setEditableRecipient(latest.recipient || convo.recipient || '');
        } else {
          setGeneratedResult(null);
          setEditableSubject('');
          setEditableBody('');
          setEditableRecipient(convo.recipient || '');
        }
      }
    } catch (err) {
      console.error('Failed to select conversation:', err);
      showToast('Could not load application conversation.');
    } finally {
      setSwitchingConversation(false);
    }
  };

  // Create New Conversation Session
  const handleCreateNewConversation = async () => {
    try {
      const count = conversations.length + 1;
      const res = await api.createAiConversation({
        title: `Application #${count}`,
      });
      if (res?.conversation) {
        showToast('✨ New application chat created!');
        await loadConversations(res.conversation._id);
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create new conversation.');
    }
  };

  // Delete Conversation
  const handleDeleteConversation = (convoId, convoTitle) => {
    Alert.alert(
      'Delete Application Session',
      `Are you sure you want to delete "${convoTitle || 'this session'}" and its saved resume?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteAiConversation(convoId);
              showToast('Application session deleted.');
              const remaining = conversations.filter((c) => c._id !== convoId);
              setConversations(remaining);
              if (activeConversationId === convoId) {
                if (remaining.length > 0) {
                  await selectConversation(remaining[0]._id);
                } else {
                  await loadConversations();
                }
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not delete conversation.');
            }
          },
        },
      ]
    );
  };

  // Open Rename Modal
  const handleOpenRename = () => {
    setRenameTitleInput(activeConversation?.title || '');
    setShowRenameModal(true);
  };

  // Save Renamed Conversation
  const handleSaveRename = async () => {
    if (!renameTitleInput.trim() || !activeConversationId) return;
    try {
      const res = await api.updateAiConversation(activeConversationId, {
        title: renameTitleInput.trim(),
      });
      if (res?.conversation) {
        setActiveConversation(res.conversation);
        setConversations((prev) =>
          prev.map((c) => (c._id === activeConversationId ? { ...c, title: res.conversation.title } : c))
        );
        setShowRenameModal(false);
        showToast('✓ Session title updated!');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to rename conversation.');
    }
  };

  // =========================================================================
  // 2. RESUME UPLOAD & EXTRACTION (PER-CONVERSATION)
  // =========================================================================

  // Trigger File Picker to Upload Resume (PDF or Image)
  const handleUploadResumeFile = () => {
    if (typeof document === 'undefined') {
      Alert.alert('Notice', 'File upload is supported in web and mobile browsers.');
      return;
    }

    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,image/*';

      input.onchange = async (e) => {
        const file = e.target?.files?.[0];
        if (!file) return;

        setUploadingResume(true);
        showToast('⏳ Uploading resume & extracting text...');

        try {
          const isPdf = file.name?.toLowerCase().endsWith('.pdf') || file.type?.includes('pdf');

          // Read as Base64 Data URL
          const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = () => reject(new Error('Failed to read resume file'));
            reader.readAsDataURL(file);
          });

          // 1. Run high-performance local extraction directly on file base64Data
          let extractedText = '';
          try {
            const ocrRes = await api.extractTextFromImage({
              image: base64Data,
              fileType: isPdf ? 'pdf' : 'image',
              fileName: file.name,
            });
            extractedText = (ocrRes?.text || '').trim();
          } catch (ocrErr) {
            console.warn('Text extraction error on resume:', ocrErr.message);
          }

          // 2. Also backup / upload file to Cloudinary in background
          let uploadedUrl = '';
          try {
            const uploadRes = await api.uploadImage(base64Data, 'portfolio/resumes');
            uploadedUrl = uploadRes?.secure_url || uploadRes?.url || '';
          } catch (cloudErr) {
            console.warn('Cloudinary upload warning:', cloudErr.message);
          }

          if (!extractedText) {
            // If OCR returns empty, open modal so user can review or paste text directly
            setModalResumeFileName(file.name);
            setModalResumeText('');
            setShowResumeModal(true);
            showToast('Please paste your resume text to complete setup.');
            return;
          }

          // 3. Persist extracted resume text into Database for this conversation
          const saveRes = await api.updateAiConversationResume(activeConversationId, {
            resumeText: extractedText,
            resumeFileName: file.name,
            resumeFileUrl: uploadedUrl || '',
          });

          if (saveRes?.conversation) {
            setActiveConversation(saveRes.conversation);
            setConversations((prev) =>
              prev.map((c) =>
                c._id === activeConversationId
                  ? {
                      ...c,
                      hasResume: true,
                      resumeFileName: file.name,
                      resumeWordCount: saveRes.conversation.resumeWordCount,
                    }
                  : c
              )
            );
            showToast(`✓ Resume extracted (${saveRes.conversation.resumeWordCount} words) and saved!`);
          }
        } catch (err) {
          console.error('Resume upload error:', err);
          Alert.alert('Upload Error', err.message || 'Could not process resume file.');
        } finally {
          setUploadingResume(false);
        }
      };

      input.click();
    } catch (err) {
      Alert.alert('Error', 'Could not open file picker on this device.');
    }
  };

  // Open Modal to View or Edit Resume Text
  const handleOpenResumeModal = () => {
    setModalResumeText(activeConversation?.resumeText || '');
    setModalResumeFileName(activeConversation?.resumeFileName || '');
    setShowResumeModal(true);
  };

  // Save Edited / Pasted Resume Text in Modal
  const handleSaveModalResume = async () => {
    if (!activeConversationId) return;
    setSavingResume(true);
    try {
      const res = await api.updateAiConversationResume(activeConversationId, {
        resumeText: modalResumeText.trim(),
        resumeFileName: modalResumeFileName.trim() || 'Custom Resume Text',
      });

      if (res?.conversation) {
        setActiveConversation(res.conversation);
        setConversations((prev) =>
          prev.map((c) =>
            c._id === activeConversationId
              ? {
                  ...c,
                  hasResume: !!res.conversation.resumeWordCount,
                  resumeFileName: res.conversation.resumeFileName,
                  resumeWordCount: res.conversation.resumeWordCount,
                }
              : c
          )
        );
        setShowResumeModal(false);
        showToast('✓ Resume text saved to this conversation!');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save resume.');
    } finally {
      setSavingResume(false);
    }
  };

  // Remove Resume from active conversation
  const handleRemoveResume = async () => {
    if (!activeConversationId) return;
    Alert.alert(
      'Remove Resume',
      'Are you sure you want to remove the resume attached to this application?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.updateAiConversationResume(activeConversationId, {
                resumeText: '',
                resumeFileName: '',
                resumeFileUrl: '',
              });
              if (res?.conversation) {
                setActiveConversation(res.conversation);
                setConversations((prev) =>
                  prev.map((c) =>
                    c._id === activeConversationId
                      ? { ...c, hasResume: false, resumeFileName: '', resumeWordCount: 0 }
                      : c
                  )
                );
                showToast('Resume removed.');
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to remove resume.');
            }
          },
        },
      ]
    );
  };

  // =========================================================================
  // 3. JOB DESCRIPTION SCREENSHOT UPLOAD & OCR
  // =========================================================================
  const handlePickScreenshot = () => {
    if (typeof document === 'undefined') {
      Alert.alert('Notice', 'File upload is supported in web and mobile browsers.');
      return;
    }

    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      input.onchange = async (e) => {
        const file = e.target?.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        setOcrSuccess(false);

        try {
          const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = () => reject(new Error('Failed to read screenshot file'));
            reader.readAsDataURL(file);
          });

          // 1. Extract text directly from screenshot base64Data
          try {
            const ocrRes = await api.extractTextFromImage({
              image: base64Data,
              fileType: 'image',
              fileName: file.name,
            });
            if (ocrRes?.text) {
              setJobDescription(ocrRes.text);
              setOcrSuccess(true);
              showToast('✓ Job details extracted from screenshot!');
            }
          } catch (ocrErr) {
            console.warn('OCR error on screenshot:', ocrErr.message);
          }

          // 2. Upload to Cloudinary for preview image
          try {
            const uploadRes = await api.uploadImage(base64Data, 'portfolio/job-screenshots');
            const uploadedUrl = uploadRes?.secure_url || uploadRes?.url;
            if (uploadedUrl) {
              setImageUrl(uploadedUrl);
            }
          } catch (uploadErr) {
            console.warn('Screenshot upload warning:', uploadErr.message);
          }
        } catch (err) {
          Alert.alert('Upload Error', err.message || 'Failed to upload screenshot.');
        } finally {
          setUploadingImage(false);
        }
      };

      input.click();
    } catch (err) {
      Alert.alert('Error', 'Could not open file picker on this device.');
    }
  };

  // =========================================================================
  // 4. CONTEXTUAL COLD EMAIL GENERATION
  // =========================================================================
  const handleGenerate = async () => {
    if (!jobDescription.trim() && !imageUrl && !role.trim()) {
      Alert.alert(
        'Missing Input',
        'Please enter a job description, upload a JD screenshot, or enter the target role.'
      );
      return;
    }

    if (!activeConversationId) {
      Alert.alert('Error', 'Please select or create an application conversation first.');
      return;
    }

    // Check if resume is present in this conversation
    const hasResume = !!(activeConversation?.resumeText && activeConversation.resumeText.trim());

    setLoading(true);
    setStatusText(
      hasResume
        ? 'Matching your conversation resume with JD requirements...'
        : 'Analyzing job requirements with candidate profile...'
    );

    try {
      const payload = {
        jobDescription: jobDescription.trim(),
        image: imageUrl || '',
        company: company.trim(),
        role: role.trim(),
        recipient: recipient.trim(),
        tone: selectedTone,
      };

      const res = await api.generateAiColdEmailForConversation(activeConversationId, payload);

      if (res?.success) {
        const draft = res.email;
        setGeneratedResult(draft);
        setEditableSubject(draft.subject || '');
        setEditableBody(draft.emailBody || '');
        setEditableRecipient(draft.recipient || recipient || '');

        if (res.conversation) {
          setActiveConversation(res.conversation);
          setConversations((prev) =>
            prev.map((c) => (c._id === activeConversationId ? { ...c, title: res.conversation.title, emailCount: res.conversation.emails?.length || 1 } : c))
          );
        }

        showToast('✨ Cold email generated using your resume!');

        // Scroll to results
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 300);
      } else {
        throw new Error(res?.error || 'Failed to generate email');
      }
    } catch (err) {
      console.error('Generation failed:', err);
      Alert.alert('Generation Error', err.message || 'Could not generate email.');
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  // =========================================================================
  // 5. EMAIL ACTIONS (GMAIL, CLIPBOARD)
  // =========================================================================
  const handleOpenGmail = () => {
    const to = editableRecipient.trim();
    const su = editableSubject.trim();
    const body = editableBody.trim();

    const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      to
    )}&su=${encodeURIComponent(su)}&body=${encodeURIComponent(body)}`;

    const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(su)}&body=${encodeURIComponent(
      body
    )}`;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const win = window.open(gmailWebUrl, '_blank');
      if (!win) {
        window.location.href = mailtoUrl;
      }
      showToast('Opening Gmail composer...');
    } else {
      Linking.canOpenURL(gmailWebUrl)
        .then((supported) => {
          if (supported) {
            Linking.openURL(gmailWebUrl);
          } else {
            Linking.openURL(mailtoUrl);
          }
        })
        .catch(() => {
          Linking.openURL(mailtoUrl);
        });
      showToast('Opening email app...');
    }
  };

  const handleCopyText = (text, label) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    showToast(`✓ ${label} copied to clipboard!`);
  };

  const handleCopyAll = () => {
    const combined = `Subject: ${editableSubject}\nTo: ${editableRecipient}\n\n${editableBody}`;
    handleCopyText(combined, 'Full email');
  };

  // Load a past draft back into the editor
  const handleLoadPastDraft = (draft) => {
    setGeneratedResult(draft);
    setEditableSubject(draft.subject || '');
    setEditableBody(draft.emailBody || '');
    setEditableRecipient(draft.recipient || '');
    if (draft.company && !company) setCompany(draft.company);
    if (draft.role && !role) setRole(draft.role);
    showToast('Loaded draft into editor.');
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  // Delete a specific email draft from this conversation
  const handleDeleteDraft = (draftId, draftSubject) => {
    if (!activeConversationId || !draftId) return;

    Alert.alert(
      'Delete Email Draft',
      `Are you sure you want to delete "${draftSubject || 'this email'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.deleteAiConversationEmail(activeConversationId, draftId);
              if (res?.success && res.conversation) {
                setActiveConversation(res.conversation);
                setConversations((prev) =>
                  prev.map((c) =>
                    c._id === activeConversationId
                      ? { ...c, emailCount: res.conversation.emails?.length || 0 }
                      : c
                  )
                );

                // If currently viewing the deleted draft, switch to the latest remaining or clear
                if (generatedResult?._id === draftId) {
                  const remainingDrafts = res.conversation.emails || [];
                  if (remainingDrafts.length > 0) {
                    const nextDraft = remainingDrafts[0];
                    setGeneratedResult(nextDraft);
                    setEditableSubject(nextDraft.subject || '');
                    setEditableBody(nextDraft.emailBody || '');
                    setEditableRecipient(nextDraft.recipient || '');
                  } else {
                    setGeneratedResult(null);
                    setEditableSubject('');
                    setEditableBody('');
                    setEditableRecipient('');
                  }
                }
                showToast('✓ Email draft deleted.');
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not delete draft.');
            }
          },
        },
      ]
    );
  };

  // Format Date and Time for draft items
  const formatDraftDateTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const datePart = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${datePart} • ${timePart}`;
  };

  const hasAttachedResume = !!(
    activeConversation?.resumeText && activeConversation.resumeText.trim().length > 0
  );
  const resumeWordCount = activeConversation?.resumeWordCount || 0;

  return (
    <View style={styles.container}>
      {/* Screen Header */}
      <ScreenHeader
        title="AI Cold Email Assistant"
        subtitle="Multi-application copilot with dedicated resume memory per chat"
        category="AI CAREER COPILOT"
        iconName="sparkles-outline"
        onBack={() => onNavigate && onNavigate('Dashboard')}
        backText="Dashboard"
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        keyboardShouldPersistTaps="handled"
      >
        {/* Grok Info Pill */}
        <View style={styles.grokBadgeRow}>
          <Ionicons name="flash" size={13} color="#7e37d8" />
          <Text style={styles.grokBadgeText}>
            Powered by Grok LLM • Automatically cross-references conversation resume with JD
          </Text>
        </View>

        {/* ============================================================ */}
        {/* 1. CONVERSATION MANAGEMENT BAR                               */}
        {/* ============================================================ */}
        <View style={styles.convoBarWrapper}>
          <View style={styles.convoBarHeader}>
            <View style={styles.convoBarTitleRow}>
              <Ionicons name="chatbubbles-outline" size={16} color="#7e37d8" />
              <Text style={styles.convoBarTitle}>Application Chats</Text>
              <View style={styles.convoCountBadge}>
                <Text style={styles.convoCountText}>{conversations.length}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.newConvoBtn}
              onPress={handleCreateNewConversation}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={14} color="#ffffff" />
              <Text style={styles.newConvoBtnText}>New Chat</Text>
            </TouchableOpacity>
          </View>

          {/* Horizontal Conversation Pills */}
          {loadingConversations ? (
            <ActivityIndicator size="small" color="#7e37d8" style={{ paddingVertical: 8 }} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.convoScroll}
            >
              {conversations.map((c) => {
                const isActive = c._id === activeConversationId;
                return (
                  <TouchableOpacity
                    key={c._id}
                    style={[styles.convoPill, isActive && styles.convoPillActive]}
                    onPress={() => selectConversation(c._id)}
                    activeOpacity={0.75}
                  >
                    {/* Resume Indicator Dot */}
                    {c.hasResume && <View style={styles.resumeIndicatorDot} />}
                    <Text
                      numberOfLines={1}
                      style={[styles.convoPillTitle, isActive && styles.convoPillTitleActive]}
                    >
                      {c.title || 'Application'}
                    </Text>

                    {/* Delete conversation icon */}
                    {conversations.length > 1 && (
                      <TouchableOpacity
                        style={styles.convoPillDelBtn}
                        onPress={() => handleDeleteConversation(c._id, c.title)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name="close-circle"
                          size={13}
                          color={isActive ? 'rgba(255,255,255,0.7)' : colors.textMuted}
                        />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Active Conversation Quick Meta Bar */}
          {activeConversation && (
            <View style={styles.activeConvoInfoRow}>
              <Text style={styles.activeConvoTitleText}>
                Active Session: {activeConversation.title}
              </Text>
              <TouchableOpacity style={styles.renameBtn} onPress={handleOpenRename}>
                <Ionicons name="pencil-outline" size={11} color={colors.textSecondary} />
                <Text style={styles.renameBtnText}>Rename</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ============================================================ */}
        {/* 2. DEDICATED PER-CONVERSATION RESUME CARD                   */}
        {/* ============================================================ */}
        <View style={[styles.resumeCard, hasAttachedResume && styles.resumeCardAttached]}>
          <View style={styles.resumeHeaderRow}>
            <View style={styles.resumeHeaderLeft}>
              <View
                style={[
                  styles.resumeIconWrap,
                  hasAttachedResume && styles.resumeIconWrapSuccess,
                ]}
              >
                <Ionicons
                  name={hasAttachedResume ? 'document-text' : 'cloud-upload-outline'}
                  size={18}
                  color={hasAttachedResume ? '#10b981' : '#7e37d8'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.resumeTitle}>
                  {hasAttachedResume
                    ? `Resume Attached: ${activeConversation.resumeFileName || 'Custom Resume'}`
                    : 'Resume for this Application'}
                </Text>
                <Text style={styles.resumeSubtitle}>
                  {hasAttachedResume
                    ? `${resumeWordCount} words stored in database • Ready for matching`
                    : 'Upload or paste resume so Grok cites your exact projects and skills'}
                </Text>
              </View>
            </View>

            {hasAttachedResume && (
              <View style={styles.resumeStatusBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#059669" />
                <Text style={styles.resumeStatusBadgeText}>Stored</Text>
              </View>
            )}
          </View>

          {/* If resume is attached, show preview snippet */}
          {hasAttachedResume ? (
            <>
              <View style={styles.resumeSnippetBox}>
                <Text numberOfLines={2} style={styles.resumeSnippetText}>
                  {activeConversation.resumeText}
                </Text>
              </View>

              <View style={styles.resumeActionsRow}>
                <TouchableOpacity
                  style={styles.resumeActionBtn}
                  onPress={handleOpenResumeModal}
                  activeOpacity={0.75}
                >
                  <Ionicons name="eye-outline" size={13} color={colors.textPrimary} />
                  <Text style={styles.resumeActionText}>View / Edit Text</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resumeActionBtn}
                  onPress={handleUploadResumeFile}
                  disabled={uploadingResume}
                  activeOpacity={0.75}
                >
                  {uploadingResume ? (
                    <ActivityIndicator size="small" color="#7e37d8" />
                  ) : (
                    <>
                      <Ionicons name="swap-horizontal-outline" size={13} color={colors.textPrimary} />
                      <Text style={styles.resumeActionText}>Replace File</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.resumeActionBtn, { flex: 0.5, borderColor: 'rgba(239, 68, 68, 0.3)' }]}
                  onPress={handleRemoveResume}
                  activeOpacity={0.75}
                >
                  <Ionicons name="trash-outline" size={13} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.resumeNoticeBox}>
                <Text style={styles.resumeNoticeText}>
                  💡 Each application chat saves its own resume! Upload a targeted resume version (e.g. Frontend vs Backend) for higher response rates.
                </Text>
              </View>

              <View style={styles.resumeActionsRow}>
                <TouchableOpacity
                  style={[styles.resumeActionBtn, styles.resumeActionBtnPrimary]}
                  onPress={handleUploadResumeFile}
                  disabled={uploadingResume}
                  activeOpacity={0.8}
                >
                  {uploadingResume ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="document-attach-outline" size={14} color="#ffffff" />
                      <Text style={[styles.resumeActionText, styles.resumeActionTextPrimary]}>
                        Upload PDF / Image (OCR)
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resumeActionBtn}
                  onPress={handleOpenResumeModal}
                  activeOpacity={0.75}
                >
                  <Ionicons name="pencil-outline" size={13} color={colors.textPrimary} />
                  <Text style={styles.resumeActionText}>Paste Text Directly</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* ============================================================ */}
        {/* 3. TARGET JOB & JD SECTION                                   */}
        {/* ============================================================ */}
        <View style={styles.card}>
          {/* Mode Switch Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, inputMode === 'text' && styles.tabBtnActive]}
              onPress={() => setInputMode('text')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="document-text-outline"
                size={14}
                color={inputMode === 'text' ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.tabText, inputMode === 'text' && styles.tabTextActive]}>
                Paste Job Description
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, inputMode === 'image' && styles.tabBtnActive]}
              onPress={() => setInputMode('image')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="image-outline"
                size={14}
                color={inputMode === 'image' ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.tabText, inputMode === 'image' && styles.tabTextActive]}>
                Upload JD Screenshot
              </Text>
            </TouchableOpacity>
          </View>

          {/* Option A: Paste Text */}
          {inputMode === 'text' ? (
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Job Description / Requirements *</Text>
                <Text style={styles.sublabel}>Paste JD text or LinkedIn/Indeed post</Text>
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Paste the job description here... (e.g. responsibilities, required skills, about the company, recruiter email if mentioned)"
                value={jobDescription}
                onChangeText={setJobDescription}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={6}
              />
            </View>
          ) : (
            /* Option B: Upload Screenshot */
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Screenshot of Job Posting *</Text>
                <Text style={styles.sublabel}>OCR will extract text automatically</Text>
              </View>

              {imageUrl ? (
                <View style={styles.previewWrap}>
                  <Image source={{ uri: imageUrl }} style={styles.previewImage} resizeMode="contain" />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => {
                      setImageUrl('');
                      setOcrSuccess(false);
                    }}
                  >
                    <Ionicons name="trash-outline" size={12} color="#ffffff" />
                    <Text style={styles.removeImageText}>Remove</Text>
                  </TouchableOpacity>

                  {ocrSuccess && (
                    <View style={styles.ocrSuccessTag}>
                      <Ionicons name="checkmark-circle" size={13} color="#34d399" />
                      <Text style={styles.ocrSuccessText}>Text extracted from screenshot</Text>
                    </View>
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadZone}
                  onPress={handlePickScreenshot}
                  disabled={uploadingImage}
                  activeOpacity={0.75}
                >
                  {uploadingImage ? (
                    <View style={{ alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#7e37d8" />
                      <Text style={[styles.uploadZoneTitle, { marginTop: 8 }]}>
                        Uploading & scanning with OCR...
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.uploadZoneIcon}>
                        <Ionicons name="camera-outline" size={22} color="#7e37d8" />
                      </View>
                      <Text style={styles.uploadZoneTitle}>Upload Job Posting Screenshot</Text>
                      <Text style={styles.uploadZoneSub}>
                        Snap or select image from LinkedIn, Twitter, Indeed, or YC
                      </Text>
                      <View style={styles.uploadPillBtn}>
                        <Ionicons name="folder-open-outline" size={12} color="#ffffff" />
                        <Text style={styles.uploadPillBtnText}>Choose Image</Text>
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Extracted text input */}
              {jobDescription ? (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.label, { marginBottom: 4 }]}>
                    Extracted Job Text (Editable):
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea, { minHeight: 80 }]}
                    value={jobDescription}
                    onChangeText={setJobDescription}
                    multiline
                  />
                </View>
              ) : null}
            </View>
          )}

          {/* Meta inputs: Company & Role */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Company Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Zepto, Google, Stripe"
                value={company}
                onChangeText={setCompany}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Target Role</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Full Stack Developer"
                value={role}
                onChangeText={setRole}
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          {/* Recruiter Email */}
          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Recruiter / Hiring Email (Optional)</Text>
              <Text style={styles.sublabel}>Auto-fills in Gmail if provided</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="e.g. hr@company.com, founder@startup.io"
              value={recipient}
              onChangeText={setRecipient}
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Tone Selector */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { marginBottom: 6 }]}>Email Tone & Angle</Text>
            <View style={styles.toneRow}>
              {TONES.map((t) => {
                const isSelected = selectedTone === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.tonePill, isSelected && styles.tonePillActive]}
                    onPress={() => setSelectedTone(t.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.toneText, isSelected && styles.toneTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity
            style={[styles.generateBtn, loading && styles.generateBtnDisabled]}
            onPress={handleGenerate}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="sparkles" size={16} color="#ffffff" />
                <Text style={styles.generateBtnText}>
                  {hasAttachedResume ? 'Generate Cold Email from Resume' : 'Generate Application Email'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {loading && statusText ? (
            <Text
              style={{
                fontSize: 11,
                color: '#7e37d8',
                textAlign: 'center',
                marginTop: 8,
                fontWeight: '600',
              }}
            >
              {statusText}
            </Text>
          ) : null}
        </View>

        {/* ============================================================ */}
        {/* 4. GENERATED RESULT OUTPUT SECTION                           */}
        {/* ============================================================ */}
        {generatedResult && (
          <View style={styles.resultSection}>
            <View style={styles.resultHeaderRow}>
              <Text style={styles.resultTitle}>Generated Application Email</Text>
              <View style={styles.statusPillSuccess}>
                <Ionicons name="checkmark-circle" size={12} color={colors.successText} />
                <Text style={styles.statusTextSuccess}>Ready to Send</Text>
              </View>
            </View>

            {/* Recipient Email Input */}
            <View style={styles.subjectBox}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Send To (Recruiter Email):</Text>
                <TouchableOpacity
                  onPress={() => handleCopyText(editableRecipient, 'Recipient email')}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>
                    Copy
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.subjectInput}
                placeholder="Enter recipient email (e.g. founder@company.com)"
                value={editableRecipient}
                onChangeText={setEditableRecipient}
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Subject Line */}
            <View style={styles.subjectBox}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Subject Line (Auto-Generated):</Text>
                <TouchableOpacity
                  onPress={() => handleCopyText(editableSubject, 'Subject')}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>
                    Copy Subject
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.subjectInput}
                value={editableSubject}
                onChangeText={setEditableSubject}
                placeholder="Email Subject"
              />
            </View>

            {/* Email Body */}
            <View style={styles.bodyBox}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Email Body (Editable):</Text>
                <TouchableOpacity
                  onPress={() => handleCopyText(editableBody, 'Body')}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>
                    Copy Body
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.bodyInput}
                value={editableBody}
                onChangeText={setEditableBody}
                multiline
                numberOfLines={11}
              />
            </View>

            {/* Matching Highlights */}
            {generatedResult.keyHighlights?.length > 0 && (
              <View style={styles.highlightsBox}>
                <Text style={styles.highlightsTitle}>Why You Match This Role (from Resume):</Text>
                {generatedResult.keyHighlights.map((highlight, idx) => (
                  <Text key={idx} style={styles.highlightItem}>
                    • {highlight}
                  </Text>
                ))}
              </View>
            )}

            {/* HERO ACTION: Open & Send in Gmail */}
            <TouchableOpacity
              style={styles.gmailHeroBtn}
              onPress={handleOpenGmail}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-google" size={17} color="#ffffff" />
              <Text style={styles.gmailHeroBtnText}>Open & Send via Gmail</Text>
            </TouchableOpacity>

            {/* Secondary Actions */}
            <View style={styles.secondaryRow}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleCopyAll}
                activeOpacity={0.7}
              >
                <Ionicons name="copy-outline" size={14} color={colors.textPrimary} />
                <Text style={styles.secondaryBtnText}>Copy All Text</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleGenerate}
                activeOpacity={0.7}
                disabled={loading}
              >
                <Ionicons name="refresh-outline" size={14} color={colors.textPrimary} />
                <Text style={styles.secondaryBtnText}>Regenerate</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* 5. PAST EMAILS IN THIS CONVERSATION                         */}
        {/* ============================================================ */}
        {activeConversation?.emails && activeConversation.emails.length > 0 && (
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>
                Drafts in this Application ({activeConversation.emails.length})
              </Text>
            </View>

            {activeConversation.emails.map((draft, idx) => (
              <View key={draft._id || idx} style={styles.draftCard}>
                <View style={styles.draftHeader}>
                  <Text numberOfLines={1} style={styles.draftSubject}>
                    {draft.subject || 'Cold Application Email'}
                  </Text>
                  <Text style={styles.draftDate}>
                    {formatDraftDateTime(draft.createdAt)}
                  </Text>
                </View>
                <Text numberOfLines={2} style={styles.draftSnippet}>
                  {draft.emailBody}
                </Text>
                <View style={styles.draftFooter}>
                  <TouchableOpacity
                    style={styles.draftActionBtn}
                    onPress={() => handleLoadPastDraft(draft)}
                  >
                    <Ionicons name="create-outline" size={12} color={colors.primary} />
                    <Text style={styles.draftActionText}>Load in Editor</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.draftActionBtn}
                    onPress={() =>
                      handleCopyText(
                        `Subject: ${draft.subject}\n\n${draft.emailBody}`,
                        'Saved draft'
                      )
                    }
                  >
                    <Ionicons name="copy-outline" size={12} color={colors.primary} />
                    <Text style={styles.draftActionText}>Copy</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.draftActionBtn, { backgroundColor: '#fee2e2' }]}
                    onPress={() => handleDeleteDraft(draft._id, draft.subject)}
                  >
                    <Ionicons name="trash-outline" size={12} color="#dc2626" />
                    <Text style={[styles.draftActionText, { color: '#dc2626', fontWeight: '700' }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ============================================================ */}
      {/* MODAL: VIEW / EDIT RESUME TEXT                               */}
      {/* ============================================================ */}
      <Modal
        visible={showResumeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResumeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Application Resume Text</Text>
                <Text style={styles.modalSubtitle}>
                  Attached to "{activeConversation?.title || 'This Session'}"
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowResumeModal(false)}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalTextArea}
              placeholder="Paste or edit candidate resume text here (e.g. Work Experience, Education, Projects, Skills)..."
              value={modalResumeText}
              onChangeText={setModalResumeText}
              multiline
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.modalWordCountRow}>
              <Text style={styles.modalWordCountText}>
                {modalResumeText.trim()
                  ? `${modalResumeText.trim().split(/\s+/).filter(Boolean).length} words`
                  : '0 words'}
              </Text>
              <Text style={styles.modalWordCountText}>
                Stored in MongoDB for this conversation
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowResumeModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveModalResume}
                disabled={savingResume}
              >
                {savingResume ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={14} color="#ffffff" />
                    <Text style={styles.modalSaveText}>Save to Conversation</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: RENAME CONVERSATION                                   */}
      {/* ============================================================ */}
      <Modal
        visible={showRenameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRenameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 420 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rename Application Chat</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowRenameModal(false)}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { marginVertical: 12 }]}
              placeholder="e.g. Google - SDE Intern"
              value={renameTitleInput}
              onChangeText={setRenameTitleInput}
              placeholderTextColor={colors.textMuted}
              autoFocus
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowRenameModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveRename}>
                <Text style={styles.modalSaveText}>Save Title</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={15} color="#34d399" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </View>
  );
}
