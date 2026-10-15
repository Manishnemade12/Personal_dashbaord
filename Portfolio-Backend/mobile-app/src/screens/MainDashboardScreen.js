import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../constants/theme';
import { api } from '../api/client';
import {
  Ionicons,
  MaterialIcons,
  FontAwesome5,
  MaterialCommunityIcons,
  Feather,
} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function MainDashboardScreen({ onNavigate }) {
  const [stats, setStats] = useState({
    blogs: 0,
    projects: 0,
    skills: 0,
    photos: 0,
    contacts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOverallStats = async () => {
    try {
      const [blogsRes, projectsRes, skillsRes, photosRes, contactsRes] =
        await Promise.allSettled([
          api.getBlogs(),
          api.getProjects(),
          api.getSkills(),
          api.getPhotos(),
          api.getContacts(),
        ]);

      setStats({
        blogs: blogsRes.status === 'fulfilled' && Array.isArray(blogsRes.value) ? blogsRes.value.length : 0,
        projects: projectsRes.status === 'fulfilled' && Array.isArray(projectsRes.value) ? projectsRes.value.length : 0,
        skills: skillsRes.status === 'fulfilled' && Array.isArray(skillsRes.value) ? skillsRes.value.length : 0,
        photos: photosRes.status === 'fulfilled' && Array.isArray(photosRes.value) ? photosRes.value.length : 0,
        contacts: contactsRes.status === 'fulfilled' && Array.isArray(contactsRes.value) ? contactsRes.value.length : 0,
      });
    } catch (e) {
      console.log('Error loading master dashboard stats:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverallStats();
  }, []);

  const totalPortfolioItems =
    stats.blogs + stats.projects + stats.skills + stats.photos;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchOverallStats();
          }}
          colors={[colors.primary]}
        />
      }
    >
      {/* Hero Welcome Banner */}
      <LinearGradient
        colors={['#7e37d8', '#4c1d95']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroBanner}
      >
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.heroGreeting}>Control Center</Text>
            <Text style={styles.heroTitle}>Master Admin Hub</Text>
          </View>
          <View style={styles.systemStatusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusPillText}>System Live</Text>
          </View>
        </View>

        <Text style={styles.heroSubtext}>
          Unified dashboard managing all apps, portfolio CMS, and system services.
        </Text>

        {/* Quick KPI Strip inside Hero */}
        <View style={styles.kpiStrip}>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiNumber}>{totalPortfolioItems}</Text>
            <Text style={styles.kpiLabel}>Portfolio Items</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiItem}>
            <Text style={styles.kpiNumber}>{stats.contacts}</Text>
            <Text style={styles.kpiLabel}>Inquiries</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiItem}>
            <Text style={styles.kpiNumber}>5</Text>
            <Text style={styles.kpiLabel}>Active Modules</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Primary Gateway: Portfolio Management Module */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Main Modules</Text>
        <Text style={styles.sectionSubtitle}>Tap a module to open full workspace</Text>
      </View>

      {/* Featured Card: Portfolio Module */}
      <TouchableOpacity
        style={styles.featuredModuleCard}
        activeOpacity={0.88}
        onPress={() => onNavigate('Portfolio/Dashboard')}
      >
        <LinearGradient
          colors={['#fdf4ff', '#ffffff']}
          style={styles.moduleCardInner}
        >
          <View style={styles.moduleHeaderRow}>
            <View style={styles.moduleIconBox}>
              <Ionicons name="briefcase" size={26} color="#7e37d8" />
            </View>
            <View style={styles.moduleTitleBox}>
              <View style={styles.titleBadgeRow}>
                <Text style={styles.moduleTitle}>Portfolio CMS</Text>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVE MODULE</Text>
                </View>
              </View>
              <Text style={styles.moduleDescription}>
                Manage your articles, projects, skills, photo gallery, and client messages.
              </Text>
            </View>
          </View>

          {/* Sub-metrics within Portfolio Module */}
          <View style={styles.moduleStatsRow}>
            <View style={styles.moduleStatPill}>
              <Text style={styles.moduleStatNumber}>{stats.blogs}</Text>
              <Text style={styles.moduleStatLabel}>Blogs</Text>
            </View>
            <View style={styles.moduleStatPill}>
              <Text style={styles.moduleStatNumber}>{stats.projects}</Text>
              <Text style={styles.moduleStatLabel}>Projects</Text>
            </View>
            <View style={styles.moduleStatPill}>
              <Text style={styles.moduleStatNumber}>{stats.skills}</Text>
              <Text style={styles.moduleStatLabel}>Skills</Text>
            </View>
            <View style={styles.moduleStatPill}>
              <Text style={styles.moduleStatNumber}>{stats.photos}</Text>
              <Text style={styles.moduleStatLabel}>Gallery</Text>
            </View>
          </View>

          {/* Launch Button */}
          <View style={styles.launchButton}>
            <Text style={styles.launchButtonText}>Enter Portfolio Workspace</Text>
            <Ionicons name="arrow-forward" size={18} color="#7e37d8" />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Quick Access Grid for Direct Deep-linking */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Shortcuts</Text>
        <Text style={styles.sectionSubtitle}>Jump straight to portfolio actions</Text>
      </View>

      <View style={styles.shortcutsGrid}>
        <TouchableOpacity
          style={styles.shortcutCard}
          onPress={() => onNavigate('Portfolio/Blogs')}
        >
          <View style={[styles.shortcutIcon, { backgroundColor: '#ede9fe' }]}>
            <Ionicons name="newspaper-outline" size={22} color="#7e37d8" />
          </View>
          <Text style={styles.shortcutTitle}>All Blogs</Text>
          <Text style={styles.shortcutCount}>{stats.blogs} posts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shortcutCard}
          onPress={() => onNavigate('Portfolio/Projects')}
        >
          <View style={[styles.shortcutIcon, { backgroundColor: '#fce7f3' }]}>
            <MaterialIcons name="work-outline" size={22} color="#db2777" />
          </View>
          <Text style={styles.shortcutTitle}>Projects</Text>
          <Text style={styles.shortcutCount}>{stats.projects} items</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shortcutCard}
          onPress={() => onNavigate('Portfolio/Skills')}
        >
          <View style={[styles.shortcutIcon, { backgroundColor: '#e0f2fe' }]}>
            <MaterialCommunityIcons name="laptop" size={22} color="#0284c7" />
          </View>
          <Text style={styles.shortcutTitle}>Skills</Text>
          <Text style={styles.shortcutCount}>{stats.skills} skills</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shortcutCard}
          onPress={() => onNavigate('Portfolio/Contacts')}
        >
          <View style={[styles.shortcutIcon, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="mail-outline" size={22} color="#d97706" />
          </View>
          <Text style={styles.shortcutTitle}>Messages</Text>
          <Text style={styles.shortcutCount}>{stats.contacts} requests</Text>
        </TouchableOpacity>
      </View>

      {/* Expansion Modules (Ready for the Giant App scale) */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Ecosystem & Add-ons</Text>
        <Text style={styles.sectionSubtitle}>Integrated super-app components</Text>
      </View>

      <View style={styles.ecosystemCard}>
        <View style={styles.ecoRow}>
          <View style={[styles.ecoIconBox, { backgroundColor: '#ecfdf5' }]}>
            <Feather name="server" size={20} color="#059669" />
          </View>
          <View style={styles.ecoTextBox}>
            <Text style={styles.ecoTitle}>API Server & Database</Text>
            <Text style={styles.ecoSubtitle}>Next.js REST API + MongoDB Mongoose</Text>
          </View>
          <TouchableOpacity
            style={styles.ecoActionBtn}
            onPress={() => onNavigate('Settings')}
          >
            <Text style={styles.ecoActionText}>Configure</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dividerLine} />

        <View style={styles.ecoRow}>
          <View style={[styles.ecoIconBox, { backgroundColor: '#fef2f2' }]}>
            <Ionicons name="analytics" size={20} color="#dc2626" />
          </View>
          <View style={styles.ecoTextBox}>
            <Text style={styles.ecoTitle}>Analytics & Telemetry</Text>
            <Text style={styles.ecoSubtitle}>Traffic logs, readers, project visitors</Text>
          </View>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>READY</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  heroBanner: {
    borderRadius: 26,
    padding: 22,
    marginBottom: 20,
    elevation: 6,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  heroGreeting: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ddd6fe',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  systemStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34d399',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  heroSubtext: {
    fontSize: 13,
    color: '#e9d5ff',
    lineHeight: 18,
    marginVertical: 12,
  },
  kpiStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    paddingVertical: 12,
    marginTop: 6,
  },
  kpiItem: {
    alignItems: 'center',
  },
  kpiNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#ddd6fe',
    marginTop: 2,
    fontWeight: '600',
  },
  kpiDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  featuredModuleCard: {
    marginBottom: 20,
    borderRadius: 24,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  moduleCardInner: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#e9d5ff',
  },
  moduleHeaderRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  moduleIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleTitleBox: {
    flex: 1,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  activeBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  moduleDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  moduleStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 16,
    gap: 8,
  },
  moduleStatPill: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  moduleStatNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#7e37d8',
  },
  moduleStatLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  launchButton: {
    backgroundColor: '#f3e8ff',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  launchButtonText: {
    color: '#7e37d8',
    fontSize: 14,
    fontWeight: '800',
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  shortcutCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  shortcutIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  shortcutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  shortcutCount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ecosystemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  ecoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  ecoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ecoTextBox: {
    flex: 1,
  },
  ecoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  ecoSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ecoActionBtn: {
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ecoActionText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  comingSoonBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  comingSoonText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 8,
  },
});
