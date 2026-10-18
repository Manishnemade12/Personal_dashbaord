import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/theme';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components/common';
import styles from './styles/socialLinksStyles';

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
      Alert.alert('Error', err.message || 'Error saving social links');
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
      Linking.openURL(fullUrl).catch(() => Alert.alert('Error', 'Could not open URL'));
    }
  };

  const filledCount = PLATFORMS.filter((p) => !!socialData[p.key]?.trim()).length;

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={{ flex: 1 }}>
          <ScreenHeader
            title="Social Media & Links"
            subtitle={`${filledCount} of ${PLATFORMS.length} profiles connected`}
            category="PORTFOLIO HUB"
            iconName="share-social-outline"
            onBack={() => onNavigate && onNavigate('Dashboard')}
            backText="Dashboard"
          />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      ) : (
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
          <ScreenHeader
            title="Social Media & Links"
            subtitle={`${filledCount} of ${PLATFORMS.length} profiles connected`}
            category="PORTFOLIO HUB"
            iconName="share-social-outline"
            onBack={() => onNavigate && onNavigate('Dashboard')}
            backText="Dashboard"
            rightAction={
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.refreshBtn}
                  onPress={fetchSocialLinks}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="refresh" size={16} color={colors.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtnTop, saving && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.textLight} />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={16} color={colors.textLight} />
                      <Text style={styles.saveBtnTopText}>Save Links</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            }
          />

          {successNotice && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.successBannerText}>Social links saved and published successfully!</Text>
            </View>
          )}

          {PLATFORMS.map((platform) => {
            const currentVal = socialData[platform.key] || '';
            const isFilled = !!currentVal.trim();

            return (
              <View key={platform.key} style={styles.platformCard}>
                <View style={styles.cardTopRow}>
                  <View style={styles.platformLabelWrap}>
                    <View style={[styles.platformIconWrap, { backgroundColor: platform.bg }]}>
                      <Ionicons name={platform.icon} size={16} color={platform.color} />
                    </View>
                    <Text style={styles.platformLabel}>{platform.label}</Text>
                  </View>

                  {isFilled && (
                    <View style={styles.statusConnectedPill}>
                      <Text style={styles.statusConnectedText}>Connected</Text>
                    </View>
                  )}
                </View>

                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.urlInput}
                    placeholder={platform.placeholder}
                    placeholderTextColor={colors.textMuted}
                    value={currentVal}
                    onChangeText={(val) => handleChange(platform.key, val)}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  {isFilled && (
                    <TouchableOpacity
                      style={styles.testLinkBtn}
                      onPress={() => handleOpenLink(currentVal)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="open-outline" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
