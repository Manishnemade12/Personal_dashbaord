import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SidebarDrawer({
  visible,
  onClose,
  currentRoute,
  onNavigate,
  onLogout,
}) {
  const isCalendarActive = currentRoute === 'Calendar';
  const isWorkoutDietActive = currentRoute === 'WorkoutDiet';
  const isCalendarGroupActive = isCalendarActive || isWorkoutDietActive;

  const isFinanceActive = currentRoute === 'Finance';
  const isInvestmentsActive = currentRoute === 'Investments';
  const isInvestmentAnalyticsActive = currentRoute === 'InvestmentAnalytics';
  const isPortfolioInsightsActive = currentRoute === 'PortfolioInsights';
  const isAiStockAnalyzerActive = currentRoute === 'AiStockAnalyzer';
  const isInvestmentsGroupActive =
    isInvestmentsActive || isInvestmentAnalyticsActive || isPortfolioInsightsActive || isAiStockAnalyzerActive;

  const isBlogsActive = currentRoute === 'Blogs' || currentRoute === 'BlogForm';
  const isProjectsActive = currentRoute === 'Projects' || currentRoute === 'ProjectForm';
  const isSkillsActive = currentRoute === 'Skills';
  const isGalleryActive = currentRoute === 'Gallery';
  const isContactsActive = currentRoute === 'Contacts';
  const isEducationActive = currentRoute === 'Education';
  const isSocialLinksActive = currentRoute === 'SocialLinks';
  const isPortfolioActive =
    isBlogsActive ||
    isProjectsActive ||
    isSkillsActive ||
    isGalleryActive ||
    isContactsActive ||
    isEducationActive ||
    isSocialLinksActive;

  const isApiManagementActive = currentRoute === 'ApiManagement';
  const isProjectApiActive = currentRoute === 'ProjectApi';
  const isApiGroupActive = isApiManagementActive || isProjectApiActive;

  const isProfileActive = currentRoute === 'Profile';
  const isAiColdEmailActive = currentRoute === 'AiColdEmail';
  const isDashboardActive = currentRoute === 'Dashboard';

  const [activeDropdown, setActiveDropdown] = useState(() => {
    if (isPortfolioActive) return 'portfolio';
    if (isInvestmentsGroupActive) return 'investments';
    if (isApiGroupActive) return 'api';
    return 'calendar'; // Open Calendar by default so Workout & Diet child buttons are immediately visible
  });

  useEffect(() => {
    if (visible) {
      if (isPortfolioActive) {
        setActiveDropdown('portfolio');
      } else if (isInvestmentsGroupActive) {
        setActiveDropdown('investments');
      } else if (isApiGroupActive) {
        setActiveDropdown('api');
      } else {
        setActiveDropdown('calendar');
      }
    }
  }, [visible, currentRoute]);

  const toggleDropdown = (section) => {
    setActiveDropdown((prev) => (prev === section ? null : section));
  };

  const handleNav = (route, params = {}) => {
    onNavigate(route, params);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <SafeAreaView style={styles.asideLeft}>
          {/* Header row */}
          <View style={styles.drawerHeader}>
            <View style={styles.logoWrap}>
              <View style={styles.logoRedAccent} />
              <Text style={styles.logoText}>ADMIN</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#7e37d8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.navList} showsVerticalScrollIndicator={false}>
            {/* 1. Dashboard */}
            <TouchableOpacity
              style={[styles.navItem, isDashboardActive && styles.navActive]}
              onPress={() => handleNav('Dashboard')}
              activeOpacity={0.7}
            >
              <View style={styles.navRow}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name="home-outline"
                    size={20}
                    color={isDashboardActive ? '#ffffff' : '#334155'}
                  />
                </View>
                <Text style={[styles.navText, isDashboardActive && styles.navTextActive]}>
                  Dashboard
                </Text>
              </View>
            </TouchableOpacity>

            {/* 2. Calendar (Parent Accordion with Workout & Diet Children) */}
            <TouchableOpacity
              style={[
                styles.navItem,
                isCalendarGroupActive && !activeDropdown && styles.navActive,
                activeDropdown === 'calendar' && styles.navDropdownOpen,
              ]}
              onPress={() => toggleDropdown('calendar')}
              activeOpacity={0.7}
            >
              <View style={styles.navRow}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={
                      isCalendarGroupActive && !activeDropdown
                        ? '#ffffff'
                        : activeDropdown === 'calendar'
                        ? '#7e37d8'
                        : '#334155'
                    }
                  />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Text
                    style={[
                      styles.navText,
                      isCalendarGroupActive && !activeDropdown && styles.navTextActive,
                      activeDropdown === 'calendar' && styles.navTextDropdown,
                    ]}
                  >
                    Calendar
                  </Text>
                  <View
                    style={{
                      backgroundColor: '#ecfdf5',
                      borderWidth: 1,
                      borderColor: '#a7f3d0',
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                      borderRadius: 4,
                    }}
                  >
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#059669' }}>
                      WORKOUT
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons
                name={activeDropdown === 'calendar' ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={
                  isCalendarGroupActive && !activeDropdown
                    ? '#ffffff'
                    : activeDropdown === 'calendar'
                    ? '#7e37d8'
                    : '#94a3b8'
                }
              />
            </TouchableOpacity>
            {activeDropdown === 'calendar' && (
              <View style={styles.subMenu}>
                {/* Child 1: Schedule & Events */}
                <TouchableOpacity
                  style={[styles.subMenuItem, isCalendarActive && styles.subMenuItemActive]}
                  onPress={() => handleNav('Calendar')}
                  activeOpacity={0.7}
                >
                  <View style={styles.subMenuIconWrap}>
                    <Ionicons
                      name="calendar"
                      size={16}
                      color={isCalendarActive ? '#7e37d8' : '#64748b'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.subMenuText, isCalendarActive && styles.subMenuTextActive]}>
                      Schedule & Events
                    </Text>
                    <Text style={{ fontSize: 10, color: '#94a3b8' }}>
                      Events, reminders & calendar views
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Child 2: Today's Diet Plan */}
                <TouchableOpacity
                  style={[
                    styles.subMenuItem,
                    isWorkoutDietActive && styles.subMenuItemActive,
                  ]}
                  onPress={() => handleNav('WorkoutDiet', { tab: 'plan' })}
                  activeOpacity={0.7}
                >
                  <View style={styles.subMenuIconWrap}>
                    <Ionicons
                      name="checkbox-outline"
                      size={16}
                      color={isWorkoutDietActive ? '#10b981' : '#059669'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        style={[
                          styles.subMenuText,
                          isWorkoutDietActive && styles.subMenuTextActive,
                        ]}
                      >
                        Today's Diet Plan
                      </Text>
                      <View
                        style={{
                          backgroundColor: '#ecfdf5',
                          borderWidth: 1,
                          borderColor: '#a7f3d0',
                          paddingHorizontal: 4,
                          paddingVertical: 1,
                          borderRadius: 3,
                        }}
                      >
                        <Text style={{ fontSize: 8, fontWeight: '800', color: '#059669' }}>
                          CHECKLIST
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 10, color: '#059669', fontWeight: '500' }}>
                      Daily routine, meal times & tracking
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Child 3: Diet Items & Recipes */}
                <TouchableOpacity
                  style={[
                    styles.subMenuItem,
                    isWorkoutDietActive && styles.subMenuItemActive,
                  ]}
                  onPress={() => handleNav('WorkoutDiet', { tab: 'library' })}
                  activeOpacity={0.7}
                >
                  <View style={styles.subMenuIconWrap}>
                    <Ionicons
                      name="nutrition-outline"
                      size={16}
                      color={isWorkoutDietActive ? '#10b981' : '#059669'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        style={[
                          styles.subMenuText,
                          isWorkoutDietActive && styles.subMenuTextActive,
                        ]}
                      >
                        Diet Items & Recipes
                      </Text>
                      <View
                        style={{
                          backgroundColor: '#f5f3ff',
                          borderWidth: 1,
                          borderColor: '#ddd6fe',
                          paddingHorizontal: 4,
                          paddingVertical: 1,
                          borderRadius: 3,
                        }}
                      >
                        <Text style={{ fontSize: 8, fontWeight: '800', color: '#7e37d8' }}>
                          GROK AI
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 10, color: '#64748b' }}>
                      Ingredients, calories & protein auto-calc
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* 3. Finance & Expenses */}
            <TouchableOpacity
              style={[styles.navItem, isFinanceActive && styles.navActive]}
              onPress={() => handleNav('Finance')}
              activeOpacity={0.7}
            >
              <View style={styles.navRow}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name="wallet-outline"
                    size={20}
                    color={isFinanceActive ? '#ffffff' : '#334155'}
                  />
                </View>
                <Text style={[styles.navText, isFinanceActive && styles.navTextActive]}>
                  Finance & Expenses
                </Text>
              </View>
            </TouchableOpacity>

            {/* 4. Investments & Wealth (Accordion) */}
            <TouchableOpacity
              style={[
                styles.navItem,
                isInvestmentsGroupActive && !activeDropdown && styles.navActive,
                activeDropdown === 'investments' && styles.navDropdownOpen,
              ]}
              onPress={() => toggleDropdown('investments')}
              activeOpacity={0.7}
            >
              <View style={styles.navRow}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name="trending-up-outline"
                    size={20}
                    color={
                      isInvestmentsGroupActive && !activeDropdown
                        ? '#ffffff'
                        : activeDropdown === 'investments'
                        ? '#7e37d8'
                        : '#334155'
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.navText,
                    isInvestmentsGroupActive && !activeDropdown && styles.navTextActive,
                    activeDropdown === 'investments' && styles.navTextDropdown,
                  ]}
                >
                  Investments & Wealth
                </Text>
              </View>
              <Ionicons
                name={activeDropdown === 'investments' ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={
                  isInvestmentsGroupActive && !activeDropdown
                    ? '#ffffff'
                    : activeDropdown === 'investments'
                    ? '#7e37d8'
                    : '#94a3b8'
                }
              />
            </TouchableOpacity>
            {activeDropdown === 'investments' && (
              <View style={styles.subMenu}>
                <TouchableOpacity
                  style={[styles.subMenuItem, isInvestmentsActive && styles.subMenuItemActive]}
                  onPress={() => handleNav('Investments')}
                  activeOpacity={0.7}
                >
                  <View style={styles.subMenuIconWrap}>
                    <Ionicons
                      name="layers-outline"
                      size={16}
                      color={isInvestmentsActive ? '#7e37d8' : '#64748b'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.subMenuText,
                      isInvestmentsActive && styles.subMenuTextActive,
                    ]}
                  >
                    Holdings & Portfolio
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.subMenuItem,
                    isPortfolioInsightsActive && styles.subMenuItemActive,
                  ]}
                  onPress={() => handleNav('PortfolioInsights')}
                  activeOpacity={0.7}
                >
                  <View style={styles.subMenuIconWrap}>
                    <Ionicons
                      name="analytics-outline"
                      size={16}
                      color={isPortfolioInsightsActive ? '#7e37d8' : '#64748b'}
                    />
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text
                      style={[
                        styles.subMenuText,
                        isPortfolioInsightsActive && styles.subMenuTextActive,
                      ]}
                    >
                      Insights & Net Worth
                    </Text>
                    <View
                      style={{
                        backgroundColor: '#ede9fe',
                        paddingHorizontal: 5,
                        paddingVertical: 1,
                        borderRadius: 4,
                      }}
                    >
                      <Text style={{ fontSize: 8, fontWeight: '800', color: '#7e37d8' }}>NEW</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.subMenuItem,
                    isAiStockAnalyzerActive && styles.subMenuItemActive,
                  ]}
                  onPress={() => handleNav('AiStockAnalyzer')}
                  activeOpacity={0.7}
                >
                  <View style={styles.subMenuIconWrap}>
                    <Ionicons
                      name="sparkles-outline"
                      size={16}
                      color={isAiStockAnalyzerActive ? '#7e37d8' : '#64748b'}
                    />
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text
                      style={[
                        styles.subMenuText,
                        isAiStockAnalyzerActive && styles.subMenuTextActive,
                      ]}
                    >
                      AI Stock Analyzer
                    </Text>
                    <View
                      style={{
                        backgroundColor: 'rgba(126, 55, 216, 0.15)',
                        paddingHorizontal: 5,
                        paddingVertical: 1,
                        borderRadius: 4,
                      }}
                    >
                      <Text style={{ fontSize: 8, fontWeight: '800', color: '#7e37d8' }}>AI</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.subMenuItem,
                    isInvestmentAnalyticsActive && styles.subMenuItemActive,
                  ]}
                  onPress={() => handleNav('InvestmentAnalytics')}
                  activeOpacity={0.7}
                >
                  <View style={styles.subMenuIconWrap}>
                    <Ionicons
                      name="pie-chart-outline"
                      size={16}
                      color={isInvestmentAnalyticsActive ? '#7e37d8' : '#64748b'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.subMenuText,
                      isInvestmentAnalyticsActive && styles.subMenuTextActive,
                    ]}
                  >
                    Visualisation & Charts
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 5. Portfolio (Parent Accordion with Blogs, Projects, Skills, Gallery, Contact, Education, Social Links) */}
            <TouchableOpacity
              style={[
                styles.navItem,
                isPortfolioActive && !activeDropdown && styles.navActive,
                activeDropdown === 'portfolio' && styles.navDropdownOpen,
              ]}
              onPress={() => toggleDropdown('portfolio')}
              activeOpacity={0.7}
            >
              <View style={styles.navRow}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name="briefcase-outline"
                    size={20}
                    color={
                      isPortfolioActive && !activeDropdown
                        ? '#ffffff'
                        : activeDropdown === 'portfolio'
                        ? '#7e37d8'
                        : '#334155'
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.navText,
                    isPortfolioActive && !activeDropdown && styles.navTextActive,
                    activeDropdown === 'portfolio' && styles.navTextDropdown,
                  ]}
                >
                  Portfolio
                </Text>
              </View>
              <Ionicons
                name={activeDropdown === 'portfolio' ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={
                  isPortfolioActive && !activeDropdown
                    ? '#ffffff'
                    : activeDropdown === 'portfolio'
                    ? '#7e37d8'
                    : '#94a3b8'
                }
              />
            </TouchableOpacity>
            {activeDropdown === 'portfolio' && (
              <View style={styles.subMenu}>
                {/* Child: Blogs */}
                <TouchableOpacity
                  style={[styles.subMenuItem, isBlogsActive && styles.subMenuItemActive]}
                  onPress={() => handleNav('Blogs')}
                  activeOpacity={0.7}
                >
                  <View style={styles.subMenuIconWrap}>
                    <Ionicons
                      name="newspaper-outline"
                      size={16}
                      color={isBlogsActive ? '#7e37d8' : '#64748b'}
                    />
                  </View>
                  <Text style={[styles.subMenuText, isBlogsActive && styles.subMenuTextActive]}>
                    Blogs
                  </Text>
                </TouchableOpacity>

                {/* Child: Projects */}
                <TouchableOpacity
                  style={[styles.subMenuItem, isProjectsActive && styles.subMenuItemActive]}
                  onPress={() => handleNav('Projects')}
                  activeOpacity={0.7}
                >
                  <View style={styles.subMenuIconWrap}>
                    <Ionicons
                      name="cube-outline"
                      size={16}
                      color={isProjectsActive ? '#7e37d8' : '#64748b'}
                    />
                  </View>
                  <Text
                    style={[styles.subMenuText, isProjectsActive && styles.subMenuTextActive]}
                  >
                    Projects
                  </Text>
                </TouchableOpacity>

                {/* Child: Skills */}
                <TouchableOpacity
                  style={[styles.subMenuItem, isSkillsActive && styles.subMenuItemActive]}
                  onPress={() => handleNav('Skills')}
                  activeOpacity={0.7}
                >
                  <View style={styles.subMenuIconWrap}>
                    <Ionicons
                      name="code-slash-outline"
                      size={16}
                      color={isSkillsActive ? '#7e37d8' : '#64748b'}
                    />
                  </View>
                  <Text style={[styles.subMenuText, isSkillsActive && styles.subMenuTextActive]}>
                    Skills
                  </Text>
                </TouchableOpacity>

                {/* Child: Gallery */}
                <TouchableOpacity
                  style={[styles.subMenuItem, isGalleryActive && styles.subMenuItemActive]}
                  onPress={() => handleNav('Gallery')}
                  activeOpacity={0.7}
                >
                  <View style={styles.subMenuIconWrap}>
                    <Ionicons
                      name="images-outline"
                      size={16}
                      color={isGalleryActive ? '#7e37d8' : '#64748b'}
                    />
                  </View>
                  <Text
                    style={[styles.subMenuText, isGalleryActive && styles.subMenuTextActive]}
                  >
                    Gallery
                  </Text>
                </TouchableOpacity>

                {/* Child: Contacts */}
                <TouchableOpacity
                  style={[styles.subMenuItem, isContactsActive && styles.subMenuItemActive]}
                  onPress={() => handleNav('Contacts')}
                  activeOpacity={0.7}
                >
                  <View style={styles.subMenuIconWrap}>
                    <Ionicons
                      name="chatbubbles-outline"
                      size={16}
                      color={isContactsActive ? '#7e37d8' : '#64748b'}
                    />
                  </View>
                  <Text
                    style={[styles.subMenuText, isContactsActive && styles.subMenuTextActive]}
                  >
                    Contact
                  </Text>
                </TouchableOpacity>

                {/* Child: Education */}
                <TouchableOpacity
                  style={[styles.subMenuItem, isEducationActive && styles.subMenuItemActive]}
                  onPress={() => handleNav('Education')}
                  activeOpacity={0.7}
                >
                  <View style={styles.subMenuIconWrap}>
                    <Ionicons
                      name="school-outline"
                      size={16}
                      color={isEducationActive ? '#7e37d8' : '#64748b'}
                    />
                  </View>
                  <Text
                    style={[styles.subMenuText, isEducationActive && styles.subMenuTextActive]}
                  >
                    Education
                  </Text>
                </TouchableOpacity>

                {/* Child: Social Links */}
                <TouchableOpacity
                  style={[styles.subMenuItem, isSocialLinksActive && styles.subMenuItemActive]}
                  onPress={() => handleNav('SocialLinks')}
                  activeOpacity={0.7}
                >
                  <View style={styles.subMenuIconWrap}>
                    <Ionicons
                      name="share-social-outline"
                      size={16}
                      color={isSocialLinksActive ? '#7e37d8' : '#64748b'}
                    />
                  </View>
                  <Text
                    style={[styles.subMenuText, isSocialLinksActive && styles.subMenuTextActive]}
                  >
                    Social Links
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 6. API Services (Parent Accordion with API Management & API Projects) */}
            <TouchableOpacity
              style={[
                styles.navItem,
                isApiGroupActive && !activeDropdown && styles.navActive,
                activeDropdown === 'api' && styles.navDropdownOpen,
              ]}
              onPress={() => toggleDropdown('api')}
              activeOpacity={0.7}
            >
              <View style={styles.navRow}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name="cloud-outline"
                    size={20}
                    color={
                      isApiGroupActive && !activeDropdown
                        ? '#ffffff'
                        : activeDropdown === 'api'
                        ? '#7e37d8'
                        : '#334155'
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.navText,
                    isApiGroupActive && !activeDropdown && styles.navTextActive,
                    activeDropdown === 'api' && styles.navTextDropdown,
                  ]}
                >
                  API Services
                </Text>
              </View>
              <Ionicons
                name={activeDropdown === 'api' ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={
                  isApiGroupActive && !activeDropdown
                    ? '#ffffff'
                    : activeDropdown === 'api'
                    ? '#7e37d8'
                    : '#94a3b8'
                }
              />
            </TouchableOpacity>
            {activeDropdown === 'api' && (
              <View style={styles.subMenu}>
                {/* Child: API Management */}
                <TouchableOpacity
                  style={[styles.subMenuItem, isApiManagementActive && styles.subMenuItemActive]}
                  onPress={() => handleNav('ApiManagement')}
                  activeOpacity={0.7}
                >
                  <View style={styles.subMenuIconWrap}>
                    <Ionicons
                      name="server-outline"
                      size={16}
                      color={isApiManagementActive ? '#7e37d8' : '#64748b'}
                    />
                  </View>
                  <Text
                    style={[styles.subMenuText, isApiManagementActive && styles.subMenuTextActive]}
                  >
                    API Management
                  </Text>
                </TouchableOpacity>

                {/* Child: API Projects */}
                <TouchableOpacity
                  style={[styles.subMenuItem, isProjectApiActive && styles.subMenuItemActive]}
                  onPress={() => handleNav('ProjectApi')}
                  activeOpacity={0.7}
                >
                  <View style={styles.subMenuIconWrap}>
                    <Ionicons
                      name="git-network-outline"
                      size={16}
                      color={isProjectApiActive ? '#7e37d8' : '#64748b'}
                    />
                  </View>
                  <Text
                    style={[styles.subMenuText, isProjectApiActive && styles.subMenuTextActive]}
                  >
                    API Projects
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 7. Grok AI Job Mailer */}
            <TouchableOpacity
              style={[styles.navItem, isAiColdEmailActive && styles.navActive]}
              onPress={() => handleNav('AiColdEmail')}
              activeOpacity={0.7}
            >
              <View style={styles.navRow}>
                <View style={[styles.iconContainer, isAiColdEmailActive && { backgroundColor: 'transparent' }]}>
                  <Ionicons
                    name="sparkles"
                    size={20}
                    color={isAiColdEmailActive ? '#ffffff' : '#7e37d8'}
                  />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Text style={[styles.navText, isAiColdEmailActive && styles.navTextActive]}>
                    AI Job Mailer
                  </Text>
                  <View
                    style={{
                      backgroundColor: isAiColdEmailActive ? 'rgba(255,255,255,0.25)' : '#7e37d8',
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: '800',
                        color: '#ffffff',
                      }}
                    >
                      GROK
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            {/* 8. Profile */}
            <TouchableOpacity
              style={[styles.navItem, isProfileActive && styles.navActive]}
              onPress={() => handleNav('Profile')}
              activeOpacity={0.7}
            >
              <View style={styles.navRow}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={isProfileActive ? '#ffffff' : '#334155'}
                  />
                </View>
                <Text style={[styles.navText, isProfileActive && styles.navTextActive]}>
                  Profile
                </Text>
              </View>
            </TouchableOpacity>
          </ScrollView>

          {/* Bottom Logout Button */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={onLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={18} color="#5f22db" />
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  asideLeft: {
    width: 285,
    maxWidth: '85%',
    height: '100%',
    backgroundColor: '#ffffff',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  logoWrap: {
    position: 'relative',
    paddingLeft: 6,
  },
  logoRedAccent: {
    position: 'absolute',
    left: 0,
    top: 2,
    width: 12,
    height: 12,
    backgroundColor: 'rgb(242, 52, 52)',
    borderTopLeftRadius: 1,
    borderTopRightRadius: 8,
    zIndex: -1,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1.5,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navList: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginHorizontal: 4,
    marginVertical: 2,
    borderRadius: 10,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navActive: {
    backgroundColor: '#7e37d8',
  },
  navDropdownOpen: {
    backgroundColor: '#f8f4ff',
  },
  navText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  navTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  navTextDropdown: {
    color: '#7e37d8',
    fontWeight: '700',
  },
  subMenu: {
    backgroundColor: '#faf7ff',
    marginHorizontal: 8,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#f0e6ff',
  },
  subMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 1,
  },
  subMenuItemActive: {
    backgroundColor: '#ede3fb',
  },
  subMenuIconWrap: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subMenuText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  subMenuTextActive: {
    color: '#6b21a8',
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#e6dbfb',
  },
  logoutBtnText: {
    color: '#5f22db',
    fontSize: 16,
    fontWeight: '700',
  },
});
