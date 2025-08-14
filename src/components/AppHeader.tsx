import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useUI } from '../contexts/UIContext';
import { Spacing, Typography } from '../styles/AppStyles';
import { Feather } from '@expo/vector-icons';

interface AppHeaderProps {
  title: string;
  rightActions?: Array<{ icon: keyof typeof Feather.glyphMap; onPress: () => void; accessibilityLabel?: string }>; 
  avatarUrl?: string | null;
  onAvatarPress?: () => void;
  leftAction?: { icon: keyof typeof Feather.glyphMap; onPress: () => void; accessibilityLabel?: string } | null;
}

const AppHeader: React.FC<AppHeaderProps> = ({ title, rightActions = [], avatarUrl, onAvatarPress, leftAction }) => {
  const theme = useTheme();
  const { isOffline, pendingOpsCount } = useUI();
  const gradientByAccentLight: Record<string, [string, string]> = {
    blue: ['#64b3f4', '#c2e59c'],
    purple: ['#a18cd1', '#fbc2eb'],
    mint: ['#a8edea', '#fed6e3'],
    orange: ['#f6d365', '#fda085'],
  };
  const gradientByAccentDark: Record<string, [string, string]> = {
    blue: ['#0f2027', '#203a43'],
    purple: ['#41295a', '#2F0743'],
    mint: ['#0f2027', '#2c5364'],
    orange: ['#1f1c2c', '#928DAB'],
  };
  const gradientColors = (theme.colorScheme === 'dark' ? gradientByAccentDark : gradientByAccentLight)[theme.accent];

  const mkScale = () => {
    const s = useSharedValue(1);
    const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
    const onPressIn = () => { s.value = withSpring(0.96, { damping: 18 }); };
    const onPressOut = () => { s.value = withSpring(1, { damping: 18 }); };
    return { style, onPressIn, onPressOut };
  };

  const leftAnim = mkScale();
  const avatarAnim = mkScale();

  return (
    <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.container]}
      accessibilityRole="header"
    >
      <View style={styles.row}>
        <View style={styles.leftRow}>
          {leftAction ? (
            <Animated.View style={leftAnim.style}>
              <TouchableOpacity onPressIn={leftAnim.onPressIn} onPressOut={leftAnim.onPressOut} onPress={leftAction.onPress} accessibilityLabel={leftAction.accessibilityLabel} style={{ marginRight: Spacing.small }}>
                <Feather name={leftAction.icon} size={24} color={'#ffffff'} />
              </TouchableOpacity>
            </Animated.View>
          ) : null}
          <Text style={[styles.title, { color: 'white' }]} accessibilityRole="header" numberOfLines={1} ellipsizeMode="tail">{title}</Text>
        </View>
        <View style={styles.actionsRow}>
          {isOffline && (
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#00000040', marginRight: Spacing.small }} accessibilityLabel="Tryb offline">
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>Offline{pendingOpsCount>0?` · ${pendingOpsCount}`:''}</Text>
            </View>
          )}
          {rightActions.map((action, idx) => (
            <AnimatedPress key={`${action.icon}-${idx}`} icon={action.icon} color={'#ffffff'} onPress={action.onPress} accessibilityLabel={action.accessibilityLabel} style={{ marginLeft: Spacing.small }} />
          ))}
          <Animated.View style={avatarAnim.style}>
            <TouchableOpacity testID="avatar-button" onPressIn={avatarAnim.onPressIn} onPressOut={avatarAnim.onPressOut} onPress={onAvatarPress} accessibilityLabel="Profil" style={{ marginLeft: Spacing.small }}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder} />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </LinearGradient>
  );
};

// Helper component for right action with press animation
const AnimatedPress = ({ icon, color, onPress, accessibilityLabel, style }: { icon: keyof typeof Feather.glyphMap; color?: string; onPress: () => void; accessibilityLabel?: string; style?: any }) => {
  const s = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity onPressIn={() => { s.value = withSpring(0.96, { damping: 18 }); }} onPressOut={() => { s.value = withSpring(1, { damping: 18 }); }} onPress={onPress} accessibilityLabel={accessibilityLabel}>
        <Feather name={icon} size={24} color={color || '#ffffff'} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.xxLarge,
    paddingBottom: Spacing.medium,
    paddingHorizontal: Spacing.large,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...Typography.h1,
    color: 'white',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: { width: 30, height: 30, borderRadius: 15 },
  avatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.4)'
  }
});

export default AppHeader;


