import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive } from '../../hooks/useResponsive';
import { useTheme } from '../../hooks/useTheme';

interface NavItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}

interface Props {
  children: React.ReactNode;
  navItems?: NavItem[];
  showBack?: boolean;
  onBack?: () => void;
  title?: string;
}

export default function WebLayout({ children, navItems, showBack, onBack, title }: Props) {
  const { isWide, contentMaxWidth } = useResponsive();
  const { colors } = useTheme();

  if (!isWide || Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Sidebar */}
      <View style={[styles.sidebar, { backgroundColor: colors.surface, borderRightColor: colors.border }]}>
        <View style={styles.logoWrap}>
          <Ionicons name="snow-outline" size={28} color={colors.primary} />
          <Text style={[styles.logoText, { color: colors.text }]}>SkiturApp</Text>
        </View>
        <View style={styles.navList}>
          {navItems?.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.navItem,
                item.active && { backgroundColor: colors.primary + '12' },
                item.disabled && styles.navItemDisabled,
              ]}
              onPress={item.onPress}
              disabled={item.disabled}
              activeOpacity={0.7}
            >
              <Ionicons
                name={item.icon}
                size={22}
                color={item.active ? colors.primary : item.disabled ? colors.border : colors.textSecondary}
              />
              <Text
                style={[
                  styles.navLabel,
                  { color: item.active ? colors.primary : item.disabled ? colors.border : colors.text },
                  item.active && styles.navLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Main content */}
      <View style={styles.main}>
        {(showBack || title) && (
          <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            {showBack && onBack && (
              <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={22} color={colors.primary} />
                <Text style={[styles.backText, { color: colors.primary }]}>Tilbake</Text>
              </TouchableOpacity>
            )}
            {title && (
              <Text style={[styles.topBarTitle, { color: colors.text }]}>{title}</Text>
            )}
          </View>
        )}
        <View style={[styles.contentWrap, contentMaxWidth ? { maxWidth: contentMaxWidth } : undefined]}>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 240,
    borderRightWidth: 1,
    paddingTop: 20,
    paddingHorizontal: 12,
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 24,
    gap: 10,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
  },
  navList: {
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 12,
  },
  navItemDisabled: {
    opacity: 0.4,
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  navLabelActive: {
    fontWeight: '600',
  },
  main: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  contentWrap: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
});
