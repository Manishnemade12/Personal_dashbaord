import React, { useState } from 'react';
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
  // Input Mode: 'text' or 'image'
  const [inputMode, setInputMode] = useState('text');

  // Form Inputs
  const [jobDescription, setJobDescription] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [recipient, setRecipient] = useState('');
  const [selectedTone, setSelectedTone] = useState('pitch');

  // Image / Screenshot Upload State
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);

  // AI Generation State
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // Generated Output State
  const [generatedResult, setGeneratedResult] = useState(null);
  const [editableSubject, setEditableSubject] = useState('');
  const [editableBody, setEditableBody] = useState('');
  const [editableRecipient, setEditableRecipient] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Pick Screenshot from Device and Upload to Cloudinary
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
          // Read as Base64
          const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
          });

          // 1. Upload to Cloudinary
          const uploadRes = await api.uploadImage(base64Data, 'portfolio/job-screenshots');
          const uploadedUrl = uploadRes?.secure_url || uploadRes?.url;

          if (uploadedUrl) {
            setImageUrl(uploadedUrl);
            showToast('✓ Screenshot uploaded! Extracting text...');

            // 2. Perform OCR to extract text
            try {
              const ocrRes = await api.extractTextFromImage({ image: uploadedUrl });
              if (ocrRes?.text) {
                setJobDescription(ocrRes.text);
                setOcrSuccess(true);
                showToast('✓ Job details extracted from screenshot!');
              }
            } catch (ocrErr) {
              console.warn('OCR error:', ocrErr.message);
            }
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

  // Generate Email using Grok LLM
  const handleGenerate = async () => {
    if (!jobDescription.trim() && !imageUrl) {
      Alert.alert(
        'Missing Input',
        'Please paste the job description text or upload a screenshot of the job posting.'
      );
      return;
    }

    setLoading(true);
    setStatusText('Grok LLM is analyzing job requirements & matching candidate profile...');

    try {
      const payload = {
        jobDescription: jobDescription.trim(),
        image: imageUrl || '',
        company: company.trim(),
        role: role.trim(),
        recipient: recipient.trim(),
        tone: selectedTone,
      };

      const res = await api.generateColdEmail(payload);

      if (res?.success) {
        setGeneratedResult(res);
        setEditableSubject(res.subject || '');
        setEditableBody(res.emailBody || '');
        setEditableRecipient(res.recipient || recipient || '');

        if (res.company && !company) setCompany(res.company);
        if (res.role && !role) setRole(res.role);

        showToast('✨ Cold email generated with Grok LLM!');
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

  // Open & Send in Gmail
  const handleOpenGmail = () => {
    const to = editableRecipient.trim();
    const su = editableSubject.trim();
    const body = editableBody.trim();

    // 1. Web / Desktop Gmail URL
    const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      to
    )}&su=${encodeURIComponent(su)}&body=${encodeURIComponent(body)}`;

    // 2. Native mailto URL fallback
    const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(su)}&body=${encodeURIComponent(
      body
    )}`;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Try opening Gmail web composer in new tab
      const win = window.open(gmailWebUrl, '_blank');
      if (!win) {
        // Pop-up blocker fallback: use location.href with mailto
        window.location.href = mailtoUrl;
      }
      showToast('Opening Gmail composer...');
    } else {
      // Mobile native app
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

  // Copy to clipboard helpers
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

  return (
    <View style={styles.container}>
      {/* 1. Screen Header */}
      <ScreenHeader
        title="Grok AI Job Mailer"
        subtitle="Turn job descriptions into high-converting application emails"
        category="AI CAREER COPILOT"
        iconName="sparkles-outline"
        onBack={() => onNavigate && onNavigate('Dashboard')}
        backText="Dashboard"
      />

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        keyboardShouldPersistTaps="handled"
      >
        {/* Model Info Badge */}
        <View style={styles.grokBadgeRow}>
          <Ionicons name="flash" size={13} color="#7e37d8" />
          <Text style={styles.grokBadgeText}>
            Powered by Grok LLM • Automatically personalizes with Manish's Portfolio
          </Text>
        </View>

        {/* 2. Main Input Card */}
        <View style={styles.card}>
          {/* Input Mode Tabs */}
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
                <Text style={styles.sublabel}>Grok OCR will auto-extract details</Text>
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

              {/* Show extracted text if any */}
              {jobDescription && (
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
              )}
            </View>
          )}

          {/* Optional Meta fields */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Company Name (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Zepto, Razorpay"
                value={company}
                onChangeText={setCompany}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Target Role (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Full Stack Developer"
                value={role}
                onChangeText={setRole}
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          {/* Recipient Email Input */}
          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Recruiter / Hiring Email (Optional)</Text>
              <Text style={styles.sublabel}>Auto-fills in Gmail if provided</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="e.g. hr@company.com, careers@startup.io"
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

          {/* Generate Button */}
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
                <Text style={styles.generateBtnText}>Generate Application Email</Text>
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

        {/* 3. Generated Result Output Section */}
        {generatedResult && (
          <View style={styles.resultSection}>
            <View style={styles.resultHeaderRow}>
              <Text style={styles.resultTitle}>Generated Application Email</Text>
              <View style={styles.statusPillSuccess}>
                <Ionicons name="checkmark-circle" size={12} color={colors.successText} />
                <Text style={styles.statusTextSuccess}>Ready to Send</Text>
              </View>
            </View>

            {/* Recipient Email (Editable) */}
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

            {/* Generated Subject Line */}
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

            {/* Generated Body */}
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
                numberOfLines={10}
              />
            </View>

            {/* Key Matching Highlights */}
            {generatedResult.keyHighlights?.length > 0 && (
              <View style={styles.highlightsBox}>
                <Text style={styles.highlightsTitle}>Why You Match This Role:</Text>
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
      </ScrollView>

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
