import React, { useState } from 'react';
import { StyleSheet, SafeAreaView, View, StatusBar, Platform, Alert, Text, TouchableOpacity } from 'react-native';
import Header from './src/components/Header';
import SidebarDrawer from './src/components/SidebarDrawer';
import AuthScreen from './src/screens/auth/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import {
  BlogsScreen,
  BlogFormScreen,
  ProjectsScreen,
  ProjectFormScreen,
  SkillsScreen,
  GalleryScreen,
  ContactsScreen,
  EducationScreen,
  SocialLinksScreen,
} from './src/screens/portfolio';
import ProfileScreen from './src/screens/ProfileScreen';
import CalendarScreen from './src/screens/calendar/CalendarScreen';
import FinanceScreen from './src/screens/finance/FinanceScreen';
import InvestmentScreen from './src/screens/finance/InvestmentScreen';
import InvestmentAnalyticsScreen from './src/screens/finance/InvestmentAnalyticsScreen';
import ApiManagementScreen from './src/screens/api/ApiManagementScreen';
import ProjectApiScreen from './src/screens/api/ProjectApiScreen';
import AiColdEmailScreen from './src/screens/ai/AiColdEmailScreen';


// React Native Web Polyfill: Enable native web confirm/alert dialogs and execute button callbacks
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title, message, buttons) => {
    const formattedMsg = title ? (message ? `${title}\n\n${message}` : title) : (message || '');
    if (!buttons || buttons.length <= 1) {
      window.alert(formattedMsg);
      if (buttons && buttons[0]?.onPress) {
        buttons[0].onPress();
      }
      return;
    }
    const cancelBtn = buttons.find((b) => b.style === 'cancel');
    const confirmBtn = buttons.find((b) => b.style !== 'cancel') || buttons[buttons.length - 1];
    const ok = window.confirm(formattedMsg);
    if (ok) {
      if (confirmBtn?.onPress) confirmBtn.onPress();
    } else {
      if (cancelBtn?.onPress) cancelBtn.onPress();
    }
  };
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary Caught]', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 24, maxWidth: 500, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#fee2e2' }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#ef4444' }} />
            </View>
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a', textAlign: 'center' }}>Display Error</Text>
            </View>
            <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 16 }}>
              {this.state.error?.message || 'An error occurred while rendering this screen.'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => this.setState({ hasError: false, error: null })}
                style={{ backgroundColor: '#3b82f6', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 }}
              >
                <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 14 }}>Try Again</Text>
              </TouchableOpacity>
              {this.props.onReset && (
                <TouchableOpacity
                  onPress={() => {
                    this.setState({ hasError: false, error: null });
                    this.props.onReset();
                  }}
                  style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 }}
                >
                  <Text style={{ color: '#334155', fontWeight: '600', fontSize: 14 }}>Go to Dashboard</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Navigation State: default starting route is Dashboard
  const [currentRoute, setCurrentRoute] = useState('Dashboard');
  const [routeParams, setRouteParams] = useState({});
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setCurrentRoute('Dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setIsDrawerOpen(false);
  };

  const navigate = (route, params = {}) => {
    setCurrentRoute(route);
    setRouteParams(params);
  };

  // If not logged in, show Auth / Sign In screen first (matching website LoginLayout)
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <AuthScreen onLoginSuccess={handleLoginSuccess} />
      </SafeAreaView>
    );
  }

  const renderCurrentScreen = () => {
    switch (currentRoute) {
      case 'Dashboard':
        return <DashboardScreen onNavigate={navigate} />;

      case 'Calendar':
        return <CalendarScreen onNavigate={navigate} />;

      case 'Finance':
        return <FinanceScreen onNavigate={navigate} />;

      case 'Investments':
        return <InvestmentScreen onNavigate={navigate} />;

      case 'InvestmentAnalytics':
        return <InvestmentAnalyticsScreen onNavigate={navigate} />;


      case 'Blogs':
        return (
          <BlogsScreen
            onNavigate={navigate}
            initialFilter={routeParams?.filter || 'publish'}
          />
        );

      case 'BlogForm':
        return (
          <BlogFormScreen
            blog={routeParams?.blog}
            onBack={() => navigate('Blogs')}
            onSuccess={() => navigate('Blogs')}
          />
        );

      case 'Projects':
        return (
          <ProjectsScreen
            onNavigate={navigate}
            initialFilter={routeParams?.filter || 'publish'}
          />
        );

      case 'ProjectForm':
        return (
          <ProjectFormScreen
            project={routeParams?.project}
            onBack={() => navigate('Projects')}
            onSuccess={() => navigate('Projects')}
          />
        );

      case 'Skills':
        return <SkillsScreen onNavigate={navigate} routeParams={routeParams} />;

      case 'Gallery':
        return <GalleryScreen onNavigate={navigate} routeParams={routeParams} />;

      case 'Contacts':
        return <ContactsScreen onNavigate={navigate} />;

      case 'Education':
        return <EducationScreen onNavigate={navigate} />;

      case 'SocialLinks':
        return <SocialLinksScreen onNavigate={navigate} />;

      case 'ApiManagement':
        return <ApiManagementScreen onNavigate={navigate} />;

      case 'ProjectApi':
        return <ProjectApiScreen onNavigate={navigate} />;

      case 'AiColdEmail':
        return <AiColdEmailScreen onNavigate={navigate} />;

      case 'Profile':
        return <ProfileScreen onBack={() => navigate('Dashboard')} />;

      default:
        return <DashboardScreen onNavigate={navigate} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.appContainer}>
        {/* Top Header matching website Header component */}
        <Header
          onToggleMenu={() => setIsDrawerOpen(true)}
          onNavigate={navigate}
          onLogout={handleLogout}
        />

        {/* Current Active Screen View */}
        <View style={styles.screenWrapper}>
          <ErrorBoundary key={currentRoute} onReset={() => navigate('Dashboard')}>
            {renderCurrentScreen()}
          </ErrorBoundary>
        </View>

        {/* Sidebar Navigation Drawer matching website Aside component */}
        <SidebarDrawer
          visible={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          currentRoute={currentRoute}
          onNavigate={navigate}
          onLogout={handleLogout}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  appContainer: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    backgroundColor: 'rgb(248, 250, 252)',
    overflow: 'hidden',
  },
  screenWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
});
