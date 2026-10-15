import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Linking,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';

const PLATFORMS = [
  {
    key: 'Linkedin',
    label: 'LinkedIn',
    icon: 'logo-linkedin',
    color: '#0a66c2',
    bg: '#eff6ff',
    placeholder: 'https://linkedin.com/in/username',
  },
  {
    key: 'Github',
    label: 'GitHub',
    icon: 'logo-github',
    color: '#1e293b',
    bg: '#f1f5f9',
    placeholder: 'https://github.com/username',
  },
  {
    key: 'Twitter',
    label: 'Twitter / X',
    icon: 'logo-twitter',
    color: '#0284c7',
    bg: '#f0f9ff',
    placeholder: 'https://x.com/username',
  },
  {
    key: 'Instagram',
    label: 'Instagram',
    icon: 'logo-instagram',
    color: '#e1306c',
    bg: '#fdf2f8',
    placeholder: 'https://instagram.com/username',
  },
  {
    key: 'personalweb',
    label: 'Personal Website',
    icon: 'globe-outline',
    color: '#7e37d8',
    bg: '#faf5ff',
    placeholder: 'https://yourportfolio.com',
  },
  {
    key: 'youtube',
    label: 'YouTube Channel',
    icon: 'logo-youtube',
    color: '#ef4444',
    bg: '#fef2f2',
    placeholder: 'https://youtube.com/@channel',
  },
  {
    key: 'discord',
    label: 'Discord Server',
    icon: 'logo-discord',
    color: '#5865f2',
    bg: '#eef2ff',
    placeholder: 'https://discord.gg/invite',
  },
  {
    key: 'telegram',
    label: 'Telegram',
    icon: 'paper-plane-outline',
    color: '#0ea5e9',
    bg: '#f0f9ff',
    placeholder: 'https://t.me/username',
  },
];

export default function SocialLinksScreen({ onNavigate }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);
  const [socialData, setSocialData] = useState({
    Instagram: '',
    Twitter: '',
    Linkedin: '',
    Github: '',
    personalweb: '',
    youtube: '',
    discord: '',
    telegram: '',
  });

  const fetchSocialLinks = async () => {
    try {
      setLoading(true);
      const res = await api.getSocialLinks();
      if (res) {
        setSocialData((prev) => ({
          ...prev,
          Instagram: res.Instagram || '',
          Twitter: res.Twitter || '',
          Linkedin: res.Linkedin || '',
          Github: res.Github || '',
          personalweb: res.personalweb || '',
          youtube: res.youtube || '',
          discord: res.discord || '',
          telegram: res.telegram || '',
          _id: res._id,
        }));
      }
    } catch (err) {
      console.error('Error fetching social links:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSocialLinks();
  }, []);

  const handleChange = (key, val) => {
    setSocialData((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.saveSocialLinks(socialData);
      setSuccessNotice(true);
      setTimeout(() => setSuccessNotice(false), 3000);
      fetchSocialLinks();
    } catch (err) {
      alert(err.message || 'Error saving social links');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenLink = (url) => {
    if (!url) return;
    let fullUrl = url.trim();
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = 'https://' + fullUrl;
    }
    if (Platform.OS === 'web') {
      window.open(fullUrl, '_blank');
    } else {
      Linking.openURL(fullUrl).catch(() => alert('Could not open URL'));
    }
  };

  const filledCount = PLATFORMS.filter((p) => !!socialData[p.key]?.trim()).length;

  return (
    <View style={styles.container}>
      {/* 1. Header Toolbar */}
      <View style={[styles.headerToolbar, isMobile && styles.headerToolbarMobile]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => onNavigate && onNavigate('Dashboard')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={16} color="#0f172a" />
            <Text style={styles.backBtnText}>Dashboard</Text>
          </TouchableOpacity>
          <View style={styles.titleDivider} />
          <View>
            <Text style={styles.screenTitle}>Social Media & Links</Text>
            <Text style={styles.screenSubtitle}>
              {filledCount} of {PLATFORMS.length} profiles connected
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={fetchSocialLinks}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={15} color="#3b82f6" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtnTop, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={16} color="#ffffff" />
                <Text style={styles.saveBtnTopText}>Save Links</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Success Banner */}
      {successNotice && (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
          <Text style={styles.successBannerText}>
            Social media profiles updated and synced to database!
          </Text>
        </View>
      )}

      {/* 2. Form Body */}
      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading profile links...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
          <View style={styles.platformsGrid}>
            {PLATFORMS.map((platform) => {
              const val = socialData[platform.key] || '';
              const isConfigured = !!val.trim();

              return (
                <View key={platform.key} style={styles.platformCard}>
                  <View style={styles.platformHeader}>
                    <View style={styles.platformHeaderLeft}>
                      <View style={[styles.platformIconWrap, { backgroundColor: platform.bg }]}>
                        <Ionicons name={platform.icon} size={20} color={platform.color} />
                      </View>
                      <View>
                        <Text style={styles.platformTitle}>{platform.label}</Text>
                        <Text style={[styles.statusPillText, { color: isConfigured ? '#16a34a' : '#94a3b8' }]}>
                          {isConfigured ? 'Connected' : 'Not configured'}
                        </Text>
                      </View>
                    </View>

                    {isConfigured ? (
                      <TouchableOpacity
                        style={styles.openLinkBtn}
                        onPress={() => handleOpenLink(val)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.openLinkText}>Open</Text>
                        <Ionicons name="open-outline" size={12} color="#3b82f6" />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.urlInput}
                      placeholder={platform.placeholder}
                      placeholderTextColor="#94a3b8"
                      value={val}
                      onChangeText={(text) => handleChange(platform.key, text)}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {val ? (
                      <TouchableOpacity onPress={() => handleChange(platform.key, '')} style={styles.clearBtn}>
                        <Ionicons name="close-circle" size={16} color="#94a3b8" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Bottom Save Button */}
          <TouchableOpacity
            style={[styles.bigSaveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color="#ffffff" />
                <Text style={styles.bigSaveBtnText}>Save All Social Links</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerToolbar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerToolbarMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  titleDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
  screenTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  screenSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  saveBtnTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7e37d8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnTopText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Success Banner
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderBottomWidth: 1,
    borderBottomColor: '#bbf7d0',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  successBannerText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '700',
  },

  // Content
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
  },
  platformsGrid: {
    gap: 12,
  },
  platformCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    gap: 10,
  },
  platformHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  platformHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  platformIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  openLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  openLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3b82f6',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  urlInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },
  bigSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7e37d8',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#7e37d8',
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  bigSaveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
});
