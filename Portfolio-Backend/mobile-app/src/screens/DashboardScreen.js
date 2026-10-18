import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { colors } from '../styles/theme';
import { api } from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import styles from './styles/dashboardStyles';

export default function DashboardScreen({ onNavigate }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isCompact = width < 480;

  const [blogs, setBlogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [skills, setSkills] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [financeSummary, setFinanceSummary] = useState(null);
  const [investmentSummary, setInvestmentSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [blogsRes, projectsRes, photosRes, contactsRes, skillsRes, eventsRes, finRes, invRes] =
        await Promise.allSettled([
          api.getBlogs(),
          api.getProjects(),
          api.getPhotos(),
          api.getContacts(),
          api.getSkills(),
          api.getEvents(),
          api.getFinanceSummary(),
          api.getInvestmentSummary(),
        ]);

      if (blogsRes.status === 'fulfilled') setBlogs(blogsRes.value || []);
      if (projectsRes.status === 'fulfilled') setProjects(projectsRes.value || []);
      if (photosRes.status === 'fulfilled') setPhotos(photosRes.value || []);
      if (contactsRes.status === 'fulfilled') setContacts(contactsRes.value || []);
      if (skillsRes.status === 'fulfilled') setSkills(skillsRes.value || []);
      if (eventsRes.status === 'fulfilled') setCalendarEvents(eventsRes.value || []);
      if (finRes.status === 'fulfilled') setFinanceSummary(finRes.value || null);
      if (invRes.status === 'fulfilled') setInvestmentSummary(invRes.value || null);
    } catch (error) {
      console.log('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const publishedBlogs = blogs.filter((b) => b.status === 'publish');

  // Compute monthly data for Bar Chart (Jan - Dec)
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyCounts = Array(12).fill(0);
  publishedBlogs.forEach((b) => {
    if (b.createdAt) {
      const m = new Date(b.createdAt).getMonth();
      if (m >= 0 && m < 12) {
        monthlyCounts[m]++;
      }
    }
  });
  const maxMonthVal = Math.max(...monthlyCounts, 1);

  // Category counts matching website: Kubernetes, Full Stack, Frontend, Backend
  const kubernetesCount = blogs.filter((b) => {
    const cats = Array.isArray(b.blogcategory) ? b.blogcategory : [b.blogcategory];
    return cats.some((c) => c && c.toString().toLowerCase().includes('kubernetes'));
  }).length;

  const fullStackCount = blogs.filter((b) => {
    const cats = Array.isArray(b.blogcategory) ? b.blogcategory : [b.blogcategory];
    return cats.some((c) => c && c.toString().toLowerCase().includes('full stack'));
  }).length;

  const frontendCount = blogs.filter((b) => {
    const cats = Array.isArray(b.blogcategory) ? b.blogcategory : [b.blogcategory];
    return cats.some((c) => c && c.toString().toLowerCase().includes('frontend'));
  }).length;

  const backendCount = blogs.filter((b) => {
    const cats = Array.isArray(b.blogcategory) ? b.blogcategory : [b.blogcategory];
    return cats.some((c) => c && c.toString().toLowerCase().includes('backend'));
  }).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, isMobile && styles.contentContainerMobile]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {/* 1. Dashboard Title & Breadcrumb */}
      <View style={styles.titleDashboard}>
        <View>
          <Text style={styles.headingTitle}>
            Admin <Text style={styles.headingSpan}>Dashboard</Text>
          </Text>
          <Text style={styles.headingSubtitle}>ADMIN PANEL</Text>
        </View>

        <View style={styles.breadcrumb}>
          <Ionicons name="home" size={16} color={colors.primary} />
          <Text style={styles.breadcrumbSlash}>/</Text>
          <Text style={styles.breadcrumbText}>Dashboard</Text>
        </View>
      </View>

      {/* Quick Feature Launch Hub */}
      <View style={[styles.hubSection, isMobile && styles.hubSectionMobile]}>
        <View style={styles.hubHeaderRow}>
          <Text style={styles.hubSectionTitle}>Feature Modules & Management Hub</Text>
          <Text style={styles.hubSectionSub}>Quick Access to All Dashboard Modules</Text>
        </View>

        <View style={styles.hubGrid}>
          {/* Calendar & Smart Reminders (Featured) */}
          <TouchableOpacity
            style={[styles.hubTile, styles.hubTileFeatured]}
            activeOpacity={0.85}
            onPress={() => onNavigate && onNavigate('Calendar')}
          >
            <View style={styles.hubTileTop}>
              <View style={[styles.hubIconWrap, { backgroundColor: '#7e37d8' }]}>
                <Ionicons name="calendar" size={18} color="#ffffff" />
              </View>
              <View style={styles.hubBadgeNew}>
                <Text style={styles.hubBadgeNewText}>FEATURED</Text>
              </View>
            </View>
            <Text style={styles.hubTileTitle}>Multi-Calendar & Reminders</Text>
            <Text style={styles.hubTileDesc}>
              {calendarEvents.length} events scheduled • Smart alerts & views
            </Text>
            <View style={styles.hubTileArrowRow}>
              <Text style={[styles.hubTileActionText, { color: '#7e37d8' }]}>Open Calendar</Text>
              <Ionicons name="arrow-forward" size={12} color="#7e37d8" />
            </View>
          </TouchableOpacity>

          {/* Blogs */}
          <TouchableOpacity
            style={[styles.hubTile, isCompact && styles.hubTileFullWidth]}
            activeOpacity={0.85}
            onPress={() => onNavigate && onNavigate('Blogs')}
          >
            <View style={styles.hubTileTop}>
              <View style={[styles.hubIconWrap, { backgroundColor: '#3b82f6' }]}>
                <Ionicons name="newspaper-outline" size={18} color="#ffffff" />
              </View>
              <Text style={styles.hubCount}>{blogs.length}</Text>
            </View>
            <Text style={styles.hubTileTitle}>Blogs Manager</Text>
            <Text style={styles.hubTileDesc}>Manage articles, drafts & tech topics</Text>
            <View style={styles.hubTileArrowRow}>
              <Text style={[styles.hubTileActionText, { color: '#3b82f6' }]}>View Blogs</Text>
              <Ionicons name="arrow-forward" size={12} color="#3b82f6" />
            </View>
          </TouchableOpacity>

          {/* Projects */}
          <TouchableOpacity
            style={[styles.hubTile, isCompact && styles.hubTileFullWidth]}
            activeOpacity={0.85}
            onPress={() => onNavigate && onNavigate('Projects')}
          >
            <View style={styles.hubTileTop}>
              <View style={[styles.hubIconWrap, { backgroundColor: '#ec4899' }]}>
                <Ionicons name="briefcase-outline" size={18} color="#ffffff" />
              </View>
              <Text style={styles.hubCount}>{projects.length}</Text>
            </View>
            <Text style={styles.hubTileTitle}>Projects Portfolio</Text>
            <Text style={styles.hubTileDesc}>Showcases, repositories & live links</Text>
            <View style={styles.hubTileArrowRow}>
              <Text style={[styles.hubTileActionText, { color: '#ec4899' }]}>View Projects</Text>
              <Ionicons name="arrow-forward" size={12} color="#ec4899" />
            </View>
          </TouchableOpacity>

          {/* Skills */}
          <TouchableOpacity
            style={[styles.hubTile, isCompact && styles.hubTileFullWidth]}
            activeOpacity={0.85}
            onPress={() => onNavigate && onNavigate('Skills')}
          >
            <View style={styles.hubTileTop}>
              <View style={[styles.hubIconWrap, { backgroundColor: '#f59e0b' }]}>
                <Ionicons name="code-slash-outline" size={18} color="#ffffff" />
              </View>
              <Text style={styles.hubCount}>{skills.length}</Text>
            </View>
            <Text style={styles.hubTileTitle}>Skills Directory</Text>
            <Text style={styles.hubTileDesc}>Tech stack, icons & experience levels</Text>
            <View style={styles.hubTileArrowRow}>
              <Text style={[styles.hubTileActionText, { color: '#f59e0b' }]}>View Skills</Text>
              <Ionicons name="arrow-forward" size={12} color="#f59e0b" />
            </View>
          </TouchableOpacity>

          {/* Gallery */}
          <TouchableOpacity
            style={[styles.hubTile, isCompact && styles.hubTileFullWidth]}
            activeOpacity={0.85}
            onPress={() => onNavigate && onNavigate('Gallery')}
          >
            <View style={styles.hubTileTop}>
              <View style={[styles.hubIconWrap, { backgroundColor: '#06b5dd' }]}>
                <Ionicons name="images-outline" size={18} color="#ffffff" />
              </View>
              <Text style={styles.hubCount}>{photos.length}</Text>
            </View>
            <Text style={styles.hubTileTitle}>Photo Gallery</Text>
            <Text style={styles.hubTileDesc}>Visual portfolio & image management</Text>
            <View style={styles.hubTileArrowRow}>
              <Text style={[styles.hubTileActionText, { color: '#06b5dd' }]}>Open Gallery</Text>
              <Ionicons name="arrow-forward" size={12} color="#06b5dd" />
            </View>
          </TouchableOpacity>

          {/* Contacts */}
          <TouchableOpacity
            style={[styles.hubTile, isCompact && styles.hubTileFullWidth]}
            activeOpacity={0.85}
            onPress={() => onNavigate && onNavigate('Contacts')}
          >
            <View style={styles.hubTileTop}>
              <View style={[styles.hubIconWrap, { backgroundColor: '#10b981' }]}>
                <Ionicons name="chatbubbles-outline" size={18} color="#ffffff" />
              </View>
              <Text style={styles.hubCount}>{contacts.length}</Text>
            </View>
            <Text style={styles.hubTileTitle}>Contact Requests</Text>
            <Text style={styles.hubTileDesc}>Client inquiries & project proposals</Text>
            <View style={styles.hubTileArrowRow}>
              <Text style={[styles.hubTileActionText, { color: '#10b981' }]}>View Messages</Text>
              <Ionicons name="arrow-forward" size={12} color="#10b981" />
            </View>
          </TouchableOpacity>

          {/* Finance & Expenses */}
          <TouchableOpacity
            style={[styles.hubTile, isCompact && styles.hubTileFullWidth]}
            activeOpacity={0.85}
            onPress={() => onNavigate && onNavigate('Finance')}
          >
            <View style={styles.hubTileTop}>
              <View style={[styles.hubIconWrap, { backgroundColor: '#10b981' }]}>
                <Ionicons name="wallet-outline" size={18} color="#ffffff" />
              </View>
              <Text style={styles.hubCount}>
                ₹{Math.round((financeSummary?.remainingBudget || 0) / 1000)}k
              </Text>
            </View>
            <Text style={styles.hubTileTitle}>Finance & Expenses</Text>
            <Text style={styles.hubTileDesc}>Monthly budget, category burn & bills</Text>
            <View style={styles.hubTileArrowRow}>
              <Text style={[styles.hubTileActionText, { color: '#10b981' }]}>Open Finance</Text>
              <Ionicons name="arrow-forward" size={12} color="#10b981" />
            </View>
          </TouchableOpacity>

          {/* Investment Portfolio */}
          <TouchableOpacity
            style={[styles.hubTile, isCompact && styles.hubTileFullWidth]}
            activeOpacity={0.85}
            onPress={() => onNavigate && onNavigate('Investments')}
          >
            <View style={styles.hubTileTop}>
              <View style={[styles.hubIconWrap, { backgroundColor: '#3b82f6' }]}>
                <Ionicons name="trending-up-outline" size={18} color="#ffffff" />
              </View>
              <Text style={[styles.hubCount, { color: '#059669' }]}>
                +{(investmentSummary?.totalPnLPercent || 0)}%
              </Text>
            </View>
            <Text style={styles.hubTileTitle}>Investment Portfolio</Text>
            <Text style={styles.hubTileDesc}>NSE stocks, Mutual Funds & live NAV</Text>
            <View style={styles.hubTileArrowRow}>
              <Text style={[styles.hubTileActionText, { color: '#3b82f6' }]}>View Holdings</Text>
              <Ionicons name="arrow-forward" size={12} color="#3b82f6" />
            </View>
          </TouchableOpacity>

          {/* Grok AI Job Mailer */}
          <TouchableOpacity
            style={[styles.hubTile, isCompact && styles.hubTileFullWidth]}
            activeOpacity={0.85}
            onPress={() => onNavigate && onNavigate('AiColdEmail')}
          >
            <View style={styles.hubTileTop}>
              <View style={[styles.hubIconWrap, { backgroundColor: '#7e37d8' }]}>
                <Ionicons name="sparkles" size={18} color="#ffffff" />
              </View>
              <View style={[styles.hubBadgeNew, { backgroundColor: '#7e37d8' }]}>
                <Text style={styles.hubBadgeNewText}>GROK AI</Text>
              </View>
            </View>
            <Text style={styles.hubTileTitle}>AI Job Mailer</Text>
            <Text style={styles.hubTileDesc}>Generate cold emails from JD & send in Gmail</Text>
            <View style={styles.hubTileArrowRow}>
              <Text style={[styles.hubTileActionText, { color: '#7e37d8' }]}>Launch Mailer</Text>
              <Ionicons name="arrow-forward" size={12} color="#7e37d8" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Monthly Financial Planning & Investment Performance */}
      <View style={[styles.finSection, isMobile && styles.finSectionMobile]}>
        <View style={styles.finHeaderRow}>
          <View>
            <Text style={styles.finSectionTitle}>Monthly Financial & Investment Planning</Text>
            <Text style={styles.finSectionSub}>Income, Budget Control & Multi-Asset Portfolio</Text>
          </View>
          <View style={styles.finBadgeLive}>
            <View style={styles.finBadgeLiveDot} />
            <Text style={styles.finBadgeLiveText}>Live Data</Text>
          </View>
        </View>

        {/* Financial KPI Grid */}
        <View style={styles.finKpiGrid}>
          <View style={styles.finKpiCard}>
            <Text style={styles.finKpiLabel}>Monthly Salary</Text>
            <Text style={[styles.finKpiValue, { color: '#059669' }]}>
              ₹{(financeSummary?.monthlyIncome || 0).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.finKpiSub}>Income Credit</Text>
          </View>

          <View style={styles.finKpiCard}>
            <Text style={styles.finKpiLabel}>Spending Limit</Text>
            <Text style={[styles.finKpiValue, { color: '#1e293b' }]}>
              ₹{(financeSummary?.spendingLimit || 0).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.finKpiSub}>Monthly Cap</Text>
          </View>

          <View style={styles.finKpiCard}>
            <Text style={styles.finKpiLabel}>Total Spent</Text>
            <Text style={[styles.finKpiValue, { color: '#dc2626' }]}>
              ₹{(financeSummary?.totalSpent || 0).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.finKpiSub}>Expenses</Text>
          </View>

          <View style={styles.finKpiCard}>
            <Text style={styles.finKpiLabel}>Remaining Budget</Text>
            <Text style={[styles.finKpiValue, { color: '#7e37d8' }]}>
              ₹{(financeSummary?.remainingBudget || 0).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.finKpiSub}>Available to spend</Text>
          </View>

          <View style={styles.finKpiCard}>
            <Text style={styles.finKpiLabel}>Investment Value</Text>
            <Text style={[styles.finKpiValue, { color: '#2563eb' }]}>
              ₹{(investmentSummary?.totalPortfolioValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
            <Text style={[styles.finKpiSub, { color: '#059669', fontWeight: '700' }]}>
              {(investmentSummary?.totalPnL || 0) >= 0 ? '+' : ''}₹{(investmentSummary?.totalPnL || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({(investmentSummary?.totalPnLPercent || 0)}%)
            </Text>
          </View>

          <View style={styles.finKpiCard}>
            <Text style={styles.finKpiLabel}>Monthly Target</Text>
            <Text style={[styles.finKpiValue, { color: '#9333ea' }]}>
              ₹{(financeSummary?.investmentTarget || 0).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.finKpiSub}>SIP & Asset Goal</Text>
          </View>
        </View>

        {/* Dual Visual Progress Bars */}
        <View style={styles.finMetersCol}>
          <View style={styles.finMeterBox}>
            <View style={styles.finMeterTop}>
              <Text style={styles.finMeterTitle}>💳 Expense Budget Utilization</Text>
              <Text style={styles.finMeterValues}>
                ₹{(financeSummary?.totalSpent || 0).toLocaleString('en-IN')} / ₹{(financeSummary?.spendingLimit || 0).toLocaleString('en-IN')} ({financeSummary?.budgetSpentPercent || 0}%)
              </Text>
            </View>
            <View style={styles.finTrack}>
              <View
                style={[
                  styles.finFill,
                  {
                    width: `${Math.min(100, financeSummary?.budgetSpentPercent || 0)}%`,
                    backgroundColor:
                      (financeSummary?.budgetSpentPercent || 0) > 90
                        ? '#ef4444'
                        : (financeSummary?.budgetSpentPercent || 0) > 70
                        ? '#f59e0b'
                        : '#10b981',
                  },
                ]}
              />
            </View>
            <Text style={styles.finMeterFoot}>
              {(financeSummary?.budgetSpentPercent || 0) > 90
                ? '⚠️ You have utilized over 90% of your allocated monthly spending budget.'
                : '✅ Spending is controlled within your monthly limit.'}
            </Text>
          </View>

          <View style={styles.finMeterBox}>
            <View style={styles.finMeterTop}>
              <Text style={styles.finMeterTitle}>📈 Monthly Investment Target Progress</Text>
              {(() => {
                const target = financeSummary?.investmentTarget || 35000;
                const invested = investmentSummary?.monthInvested || 0;
                const pct = target > 0 ? Math.min(100, Math.round((invested / target) * 100)) : 0;
                return (
                  <Text style={styles.finMeterValues}>
                    ₹{invested.toLocaleString('en-IN')} / ₹{target.toLocaleString('en-IN')} ({pct}%)
                  </Text>
                );
              })()}
            </View>
            <View style={styles.finTrack}>
              {(() => {
                const target = financeSummary?.investmentTarget || 35000;
                const invested = investmentSummary?.monthInvested || 0;
                const pct = target > 0 ? Math.min(100, Math.round((invested / target) * 100)) : 0;
                return (
                  <View
                    style={[
                      styles.finFill,
                      { width: `${Math.max(5, pct)}%`, backgroundColor: colors.primary },
                    ]}
                  />
                );
              })()}
            </View>
            <Text style={styles.finMeterFoot}>
              Investments in Stocks, Mutual Funds, and ETFs grow your net worth over time.
            </Text>
          </View>
        </View>

        {/* Direct Navigation Links */}
        <View style={styles.finCtaRow}>
          <TouchableOpacity
            style={styles.finCtaBtnPrimary}
            activeOpacity={0.8}
            onPress={() => onNavigate && onNavigate('Finance')}
          >
            <Ionicons name="wallet-outline" size={16} color="#ffffff" />
            <Text style={styles.finCtaBtnPrimaryText}>Open Finance Tracker</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.finCtaBtnSecondary}
            activeOpacity={0.8}
            onPress={() => onNavigate && onNavigate('Investments')}
          >
            <Ionicons name="trending-up-outline" size={16} color={colors.primary} />
            <Text style={styles.finCtaBtnSecondaryText}>Open Investment Portfolio</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Year Overview & Blogs By Category */}
      <View style={styles.overviewSection}>
        {/* Year Overview + Monthly Bar Chart */}
        <View style={[styles.leftYearOverview, isMobile && styles.leftYearOverviewMobile]}>
          <View style={styles.overviewHeaderRow}>
            <View>
              <Text style={styles.sectionHeaderTitle}>Year Overview</Text>
              <View style={styles.dotsRow}>
                <View style={[styles.dot, { backgroundColor: '#7e37d8', width: 12, height: 12 }]} />
                <View style={[styles.dot, { backgroundColor: '#fe80b2', width: 10, height: 10 }]} />
                <View style={[styles.dot, { backgroundColor: '#ffc717', width: 8, height: 8 }]} />
                <View style={[styles.dot, { backgroundColor: '#06b5dd', width: 6, height: 6 }]} />
              </View>
            </View>

            <View style={styles.totalPublishedWrap}>
              <Text style={styles.publishedCount}>
                {publishedBlogs.length} <Text style={styles.publishedDenominator}>/ 365</Text>
              </Text>
              <Text style={styles.publishedLabel}>Total Published</Text>
            </View>
          </View>

          <Text style={styles.chartTitle}>Monthly Blog Publications</Text>
          <View style={styles.barChartContainer}>
            {monthLabels.map((month, idx) => {
              const count = monthlyCounts[idx];
              const heightPct = Math.max(8, Math.round((count / maxMonthVal) * 100));
              return (
                <View key={month} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${heightPct}%`,
                          backgroundColor: count > 0 ? colors.primary : colors.border,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{month}</Text>
                  {count > 0 && <Text style={styles.barCount}>{count}</Text>}
                </View>
              );
            })}
          </View>
        </View>

        {/* Blogs By Category */}
        <View style={[styles.rightCategoryOverview, isMobile && styles.rightCategoryOverviewMobile]}>
          <View style={styles.overviewHeaderRow}>
            <View>
              <Text style={styles.sectionHeaderTitle}>Blogs By Category</Text>
              <View style={styles.dotsRow}>
                <View style={[styles.dot, { backgroundColor: '#7e37d8', width: 12, height: 12 }]} />
                <View style={[styles.dot, { backgroundColor: '#fe80b2', width: 10, height: 10 }]} />
                <View style={[styles.dot, { backgroundColor: '#ffc717', width: 8, height: 8 }]} />
              </View>
            </View>
          </View>

          <View style={styles.categoryTable}>
            <View style={styles.tableHead}>
              <Text style={styles.thTopic}>Topics</Text>
              <Text style={styles.thData}>Data</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.tdTopic}>Kubernetes</Text>
              <View style={styles.dataBadge}>
                <Text style={styles.tdData}>{kubernetesCount}</Text>
              </View>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.tdTopic}>Full Stack</Text>
              <View style={styles.dataBadge}>
                <Text style={styles.tdData}>{fullStackCount}</Text>
              </View>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.tdTopic}>Frontend</Text>
              <View style={styles.dataBadge}>
                <Text style={styles.tdData}>{frontendCount}</Text>
              </View>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.tdTopic}>Backend</Text>
              <View style={styles.dataBadge}>
                <Text style={styles.tdData}>{backendCount}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
