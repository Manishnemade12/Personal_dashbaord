import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { colors } from '../constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../api/client';

export default function Header({
  onToggleMenu,
  onNavigate,
  onLogout,
}) {
  const [profileImage, setProfileImage] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width < 680;

  useEffect(() => {
    let isMounted = true;
    api
      .getProfile()
      .then((data) => {
        if (!isMounted || !data) return;
        const img = Array.isArray(data.images) ? data.images[0] : data.images;
        if (img) setProfileImage(img);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleFullScreen = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().then(() => setIsFullScreen(true)).catch(() => {});
      } else {
        document.exitFullscreen?.().then(() => setIsFullScreen(false)).catch(() => {});
      }
    } else {
      setIsFullScreen(!isFullScreen);
    }
  };

  return (
    <View style={[styles.header, isMobile && styles.headerMobile]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Left: ADMIN Logo + Circular Hamburger */}
      <View style={styles.leftGroup}>
        <View style={styles.logoWrap}>
          <View style={styles.logoRedAccent} />
          <Text style={[styles.logoText, isMobile && { fontSize: 20 }]}>ADMIN</Text>
        </View>

        <TouchableOpacity
          style={[styles.headerHam, isMobile && styles.headerHamMobile]}
          onPress={onToggleMenu}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="menu" size={22} color="#5f22db" />
        </TouchableOpacity>
      </View>

      {/* Right Actions: Adaptively hidden on mobile to prevent overflow */}
      <View style={[styles.rightGroup, isMobile && styles.rightGroupMobile]}>
        {!isMobile && (
          <>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={toggleFullScreen}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isFullScreen ? 'contract-outline' : 'expand-outline'}
                size={22}
                color="#334155"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onNavigate && onNavigate('Calendar')}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={22} color="#7e37d8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onNavigate && onNavigate('Finance')}
              activeOpacity={0.7}
            >
              <Ionicons name="wallet-outline" size={22} color="#10b981" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onNavigate && onNavigate('Investments')}
              activeOpacity={0.7}
            >
              <Ionicons name="trending-up-outline" size={22} color="#3b82f6" />
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[styles.actionBtn, isMobile && styles.actionBtnMobile]}
          onPress={() => onNavigate && onNavigate('Contacts')}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={20} color="#334155" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.profileNav, isMobile && styles.profileNavMobile]}
          onPress={() => onNavigate && onNavigate('Profile')}
          activeOpacity={0.8}
        >
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarLetter}>M</Text>
            </View>
          )}
        </TouchableOpacity>

        {!isMobile && onLogout && (
          <TouchableOpacity
            style={styles.logoutIconBtn}
            onPress={onLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color="#dc2626" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 72,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    zIndex: 10,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logoWrap: {
    position: 'relative',
    justifyContent: 'center',
    paddingLeft: 6,
  },
  logoRedAccent: {
    position: 'absolute',
    left: 0,
    top: 4,
    width: 14,
    height: 14,
    backgroundColor: 'rgb(242, 52, 52)',
    borderTopLeftRadius: 1,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 1,
    borderBottomRightRadius: 1,
    zIndex: -1,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1.5,
  },
  headerHam: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eee8fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  actionBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileNav: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#eee8fa',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    resizeMode: 'cover',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#7e37d8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 18,
  },
  logoutIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerMobile: {
    height: 64,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerHamMobile: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  rightGroupMobile: {
    gap: 10,
  },
  actionBtnMobile: {
    width: 30,
    height: 30,
  },
  profileNavMobile: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  logoutIconBtnMobile: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
});
