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
import StatCard from '../components/StatCard';
import { api } from '../api/client';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen({ onNavigate }) {
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
  const publishedProjects = projects.filter((p) => p.status === 'publish');

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
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {/* 1. Dashboard Title & Breadcrumb matching titledashboard */}
      <View style={styles.titleDashboard}>
        <View>
          <Text style={styles.headingTitle}>
            Admin <Text style={styles.headingSpan}>Dashboard</Text>
          </Text>
          <Text style={styles.headingSubtitle}>ADMIN PANEL</Text>
        </View>

        <View style={styles.breadcrumb}>
          <Ionicons name="home" size={20} color="#571f9e" />
          <Text style={styles.breadcrumbSlash}>/</Text>
          <Text style={styles.breadcrumbText}>Dashboard.</Text>
        </View>
      </View>

      {/* Quick Feature Launch Hub */}
      <View style={styles.hubSection}>
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
                <Ionicons name="calendar" size={20} color="#ffffff" />
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
              <Ionicons name="arrow-forward" size={14} color="#7e37d8" />
            </View>
          </TouchableOpacity>

          {/* Blogs */}
          <TouchableOpacity
            style={styles.hubTile}
            activeOpacity={0.85}
            onPress={() => onNavigate && onNavigate('Blogs')}
          >
            <View style={styles.hubTileTop}>
              <View style={[styles.hubIconWrap, { backgroundColor: '#3b82f6' }]}>
                <Ionicons name="newspaper-outline" size={20} color="#ffffff" />
              </View>
              <Text style={styles.hubCount}>{blogs.length}</Text>
            </View>
            <Text style={styles.hubTileTitle}>Blogs Manager</Text>
            <Text style={styles.hubTileDesc}>Manage articles, drafts & tech topics</Text>
            <View style={styles.hubTileArrowRow}>
              <Text style={[styles.hubTileActionText, { color: '#3b82f6' }]}>View Blogs</Text>
              <Ionicons name="arrow-forward" size={14} color="#3b82f6" />
            </View>
          </TouchableOpacity>

          {/* Projects */}
          <TouchableOpacity
            style={styles.hubTile}
            activeOpacity={0.85}
            onPress={() => onNavigate && onNavigate('Projects')}
          >
            <View style={styles.hubTileTop}>
              <View style={[styles.hubIconWrap, { backgroundColor: '#ec4899' }]}>
                <Ionicons name="briefcase-outline" size={20} color="#ffffff" />
              </View>
              <Text style={styles.hubCount}>{projects.length}</Text>
            </View>
            <Text style={styles.hubTileTitle}>Projects Portfolio</Text>
            <Text style={styles.hubTileDesc}>Showcases, repositories & live links</Text>
            <View style={styles.hubTileArrowRow}>
              <Text style={[styles.hubTileActionText, { color: '#ec4899' }]}>View Projects</Text>
              <Ionicons name="arrow-forward" size={14} color="#ec4899" />
            </View>
          </TouchableOpacity>

          {/* Skills */}
          <TouchableOpacity
            style={styles.hubTile}
            activeOpacity={0.85}
            onPress={() => onNavigate && onNavigate('Skills')}
          >
            <View style={styles.hubTileTop}>
              <View style={[styles.hubIconWrap, { backgroundColor: '#f59e0b' }]}>
                <Ionicons name="code-slash-outline" size={20} color="#ffffff" />
              </View>
              <Text style={styles.hubCount}>{skills.length}</Text>
            </View>
            <Text style={styles.hubTileTitle}>Skills Directory</Text>
            <Text style={styles.hubTileDesc}>Tech stack, icons & experience levels</Text>
            <View style={styles.hubTileArrowRow}>
              <Text style={[styles.hubTileActionText, { color: '#f59e0b' }]}>View Skills</Text>
              <Ionicons name="arrow-forward" size={14} color="#f59e0b" />
            </View>
          </TouchableOpacity>

          {/* Gallery */}
          <TouchableOpacity
            style={styles.hubTile}
            activeOpacity={0.85}
            onPress={() => onNavigate && onNavigate('Gallery')}
          >
            <View style={styles.hubTileTop}>
              <View style={[styles.hubIconWrap, { backgroundColor: '#06b5dd' }]}>
                <Ionicons name="images-outline" size={20} color="#ffffff" />
              </View>
              <Text style={styles.hubCount}>{photos.length}</Text>
            </View>
            <Text style={styles.hubTileTitle}>Photo Gallery</Text>
            <Text style={styles.hubTileDesc}>Visual portfolio & image management</Text>
            <View style={styles.hubTileArrowRow}>
              <Text style={[styles.hubTileActionText, { color: '#06b5dd' }]}>Open Gallery</Text>
              <Ionicons name="arrow-forward" size={14} color="#06b5dd" />
            </View>
          </TouchableOpacity>

          {/* Contacts */}
          <TouchableOpacity
            style={styles.hubTile}
            activeOpacity={0.85}
            onPress={() => onNavigate && onNavigate('Contacts')}
          >
            <View style={styles.hubTileTop}>
              <View style={[styles.hubIconWrap, { backgroundColor: '#10b981' }]}>
                <Ionicons name="chatbubbles-outline" size={20} color="#ffffff" />
              </View>
              <Text style={styles.hubCount}>{contacts.length}</Text>
            </View>
            <Text style={styles.hubTileTitle}>Contact Requests</Text>
            <Text style={styles.hubTileDesc}>Client inquiries & project proposals</Text>
            <View style={styles.hubTileArrowRow}>
              <Text style={[styles.hubTileActionText, { color: '#10b981' }]}>View Messages</Text>
              <Ionicons name="arrow-forward" size={14} color="#10b981" />
            </View>
          </TouchableOpacity>

          {/* Finance & Expenses */}
          <TouchableOpacity
            style={styles.hubTile}
            activeOpacity={0.85}
            onPress={() => onNavigate && onNavigate('Finance')}
          >
            <View style={styles.hubTileTop}>
              <View style={[styles.hubIconWrap, { backgroundColor: '#10b981' }]}>
                <Ionicons name="wallet-outline" size={20} color="#ffffff" />
              </View>
              <Text style={styles.hubCount}>
                ₹{Math.round((financeSummary?.remainingBudget || 0) / 1000)}k
              </Text>
            </View>
            <Text style={styles.hubTileTitle}>Finance & Expenses</Text>
            <Text style={styles.hubTileDesc}>Monthly budget, category burn & bills</Text>
            <View style={styles.hubTileArrowRow}>
              <Text style={[styles.hubTileActionText, { color: '#10b981' }]}>Open Finance</Text>
              <Ionicons name="arrow-forward" size={14} color="#10b981" />
            </View>
          </TouchableOpacity>

          {/* Investment Portfolio */}
          <TouchableOpacity
            style={styles.hubTile}
            activeOpacity={0.85}
            onPress={() => onNavigate && onNavigate('Investments')}
          >
            <View style={styles.hubTileTop}>
              <View style={[styles.hubIconWrap, { backgroundColor: '#3b82f6' }]}>
                <Ionicons name="trending-up-outline" size={20} color="#ffffff" />
              </View>
              <Text style={[styles.hubCount, { color: '#059669' }]}>
                +{(investmentSummary?.totalPnLPercent || 0)}%
              </Text>
            </View>
            <Text style={styles.hubTileTitle}>Investment Portfolio</Text>
            <Text style={styles.hubTileDesc}>NSE stocks, Mutual Funds & live NAV</Text>
            <View style={styles.hubTileArrowRow}>
              <Text style={[styles.hubTileActionText, { color: '#3b82f6' }]}>View Holdings</Text>
              <Ionicons name="arrow-forward" size={14} color="#3b82f6" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2.8 Monthly Financial Planning & Investment Performance */}
      <View style={styles.finSection}>
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
          {/* Monthly Income */}
          <View style={styles.finKpiCard}>
            <Text style={styles.finKpiLabel}>Monthly Salary</Text>
            <Text style={[styles.finKpiValue, { color: '#059669' }]}>
              ₹{(financeSummary?.monthlyIncome || 0).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.finKpiSub}>Income Credit</Text>
          </View>

          {/* Spending Budget Limit */}
          <View style={styles.finKpiCard}>
            <Text style={styles.finKpiLabel}>Spending Limit</Text>
            <Text style={[styles.finKpiValue, { color: '#1e293b' }]}>
              ₹{(financeSummary?.spendingLimit || 0).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.finKpiSub}>Monthly Cap</Text>
          </View>

          {/* Total Spent */}
          <View style={styles.finKpiCard}>
            <Text style={styles.finKpiLabel}>Total Spent</Text>
            <Text style={[styles.finKpiValue, { color: '#dc2626' }]}>
              ₹{(financeSummary?.totalSpent || 0).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.finKpiSub}>Expenses</Text>
          </View>

          {/* Remaining Budget */}
          <View style={styles.finKpiCard}>
            <Text style={styles.finKpiLabel}>Remaining Budget</Text>
            <Text style={[styles.finKpiValue, { color: '#7e37d8' }]}>
              ₹{(financeSummary?.remainingBudget || 0).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.finKpiSub}>Available to spend</Text>
          </View>

          {/* Total Investment Portfolio */}
          <View style={styles.finKpiCard}>
            <Text style={styles.finKpiLabel}>Investment Value</Text>
            <Text style={[styles.finKpiValue, { color: '#2563eb' }]}>
              ₹{(investmentSummary?.totalPortfolioValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
            <Text style={[styles.finKpiSub, { color: '#059669', fontWeight: '700' }]}>
              {(investmentSummary?.totalPnL || 0) >= 0 ? '+' : ''}₹{(investmentSummary?.totalPnL || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({(investmentSummary?.totalPnLPercent || 0)}%)
            </Text>
          </View>

          {/* Monthly Target Invested */}
          <View style={styles.finKpiCard}>
            <Text style={styles.finKpiLabel}>Monthly Target</Text>
            <Text style={[styles.finKpiValue, { color: '#9333ea' }]}>
              ₹{(financeSummary?.investmentTarget || 0).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.finKpiSub}>
              SIP & Asset Goal
            </Text>
          </View>
        </View>

        {/* Dual Visual Progress Bars */}
        <View style={styles.finMetersCol}>
          {/* Meter 1: Spending Budget Meter */}
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

          {/* Meter 2: Investment Target Progress Meter */}
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
                      { width: `${Math.max(5, pct)}%`, backgroundColor: '#7e37d8' },
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
            <Text style={styles.finCtaBtnPrimaryText}>Open Finance & Budget Tracker</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.finCtaBtnSecondary}
            activeOpacity={0.8}
            onPress={() => onNavigate && onNavigate('Investments')}
          >
            <Ionicons name="trending-up-outline" size={16} color="#7e37d8" />
            <Text style={styles.finCtaBtnSecondaryText}>Open Investment Portfolio</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Year Overview & Blogs By Category */}
      <View style={styles.overviewSection}>
        {/* Left Card: Year Overview + Monthly Bar Chart */}
        <View style={styles.leftYearOverview}>
          <View style={styles.overviewHeaderRow}>
            <View>
              <Text style={styles.sectionHeaderTitle}>Year Overview</Text>
              {/* Creative dots */}
              <View style={styles.dotsRow}>
                <View style={[styles.dot, { backgroundColor: '#7e37d8', width: 14, height: 14 }]} />
                <View style={[styles.dot, { backgroundColor: '#fe80b2', width: 11, height: 11 }]} />
                <View style={[styles.dot, { backgroundColor: '#ffc717', width: 9, height: 9 }]} />
                <View style={[styles.dot, { backgroundColor: '#06b5dd', width: 7, height: 7 }]} />
                <View style={[styles.dot, { backgroundColor: '#fe80b2', width: 5, height: 5 }]} />
              </View>
            </View>

            <View style={styles.totalPublishedWrap}>
              <Text style={styles.publishedCount}>
                {publishedBlogs.length} <Text style={styles.publishedDenominator}>/ 365</Text>
              </Text>
              <Text style={styles.publishedLabel}>Total Published</Text>
            </View>
          </View>

          {/* Monthly Bar Chart (Jan - Dec) */}
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
                          backgroundColor: count > 0 ? '#7e37d8' : '#e2e8f0',
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

        {/* Right Card: Blogs By Category */}
        <View style={styles.rightCategoryOverview}>
          <View style={styles.overviewHeaderRow}>
            <View>
              <Text style={styles.sectionHeaderTitle}>Blogs By Category</Text>
              {/* Creative dots */}
              <View style={styles.dotsRow}>
                <View style={[styles.dot, { backgroundColor: '#7e37d8', width: 14, height: 14 }]} />
                <View style={[styles.dot, { backgroundColor: '#fe80b2', width: 11, height: 11 }]} />
                <View style={[styles.dot, { backgroundColor: '#ffc717', width: 9, height: 9 }]} />
                <View style={[styles.dot, { backgroundColor: '#06b5dd', width: 7, height: 7 }]} />
              </View>
            </View>
          </View>

          {/* Table matching website: Topics | Data */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(248, 250, 252)',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  titleDashboard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 6,
  },
  headingTitle: {
    color: '#7e37d8',
    fontSize: 26,
    fontWeight: '800',
  },
  headingSpan: {
    color: '#000000',
  },
  headingSubtitle: {
    color: '#7e37d8',
    letterSpacing: 3,
    fontWeight: '700',
    fontSize: 12,
    marginTop: 2,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breadcrumbSlash: {
    fontSize: 18,
    color: '#571f9e',
    fontWeight: '700',
  },
  breadcrumbText: {
    fontSize: 18,
    color: '#571f9e',
    fontWeight: '700',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  cardWrapper: {
    width: '48%',
  },
  overviewSection: {
    gap: 20,
  },
  leftYearOverview: {
    backgroundColor: '#ffffff',
    borderRadius: 36,
    padding: 24,
    elevation: 4,
    shadowColor: '#d4d4d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  overviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  dot: {
    borderRadius: 10,
  },
  totalPublishedWrap: {
    alignItems: 'flex-end',
  },
  publishedCount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#7e37d8',
  },
  publishedDenominator: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  publishedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 12,
  },
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 4,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    height: 95,
    width: 14,
    backgroundColor: '#f1f5f9',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 6,
  },
  barCount: {
    fontSize: 9,
    fontWeight: '700',
    color: '#7e37d8',
  },
  rightCategoryOverview: {
    backgroundColor: '#ffffff',
    borderRadius: 36,
    padding: 24,
    elevation: 4,
    shadowColor: '#d4d4d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  categoryTable: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 16,
    overflow: 'hidden',
  },
  tableHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  thTopic: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  thData: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  tdTopic: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  dataBadge: {
    backgroundColor: '#eee8fa',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  tdData: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5f22db',
  },
  hubSection: {
    backgroundColor: '#ffffff',
    borderRadius: 36,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 3,
    shadowColor: '#d4d4d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  hubHeaderRow: {
    marginBottom: 16,
  },
  hubSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  hubSectionSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  hubTile: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'space-between',
    minHeight: 145,
  },
  hubTileFeatured: {
    width: '100%',
    backgroundColor: '#faf8fe',
    borderColor: '#7e37d8',
    borderWidth: 1.5,
  },
  hubTileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  hubIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hubBadgeNew: {
    backgroundColor: '#7e37d8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hubBadgeNewText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  hubCount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#64748b',
  },
  hubTileTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  hubTileDesc: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15,
    marginBottom: 10,
  },
  hubTileArrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hubTileActionText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* Financial Planning Section Styles */
  finSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  finHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  finSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  finSectionSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  finBadgeLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  finBadgeLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  finBadgeLiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  finKpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  finKpiCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  finKpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  finKpiValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginVertical: 4,
  },
  finKpiSub: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  finMetersCol: {
    gap: 14,
    marginBottom: 16,
  },
  finMeterBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  finMeterTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  finMeterTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  finMeterValues: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  finTrack: {
    height: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  finFill: {
    height: '100%',
    borderRadius: 5,
  },
  finMeterFoot: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  finCtaRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  finCtaBtnPrimary: {
    flex: 1,
    minWidth: 180,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#7e37d8',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  finCtaBtnPrimaryText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  finCtaBtnSecondary: {
    flex: 1,
    minWidth: 180,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f5f3ff',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  finCtaBtnSecondaryText: {
    color: '#7e37d8',
    fontWeight: '700',
    fontSize: 13,
  },
});

