import React, { ReactNode, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, Typography } from '../styles/AppStyles';

interface AnimatedCollapsibleProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}

const AnimatedCollapsible: React.FC<AnimatedCollapsibleProps> = ({ title, children, defaultExpanded = false }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const progress = useSharedValue(defaultExpanded ? 1 : 0);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    progress.value = withTiming(next ? 1 : 0, { duration: 220 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    height: progress.value === 1 ? undefined : withTiming(0),
    opacity: withTiming(progress.value),
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <TouchableOpacity style={[styles.header, { borderColor: theme.colors.border }]} onPress={toggle} accessibilityRole="button" accessibilityLabel={title}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>
      <Animated.View style={[styles.content, animatedStyle]}> 
        {expanded ? children : null}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: Spacing.medium,
    marginTop: Spacing.medium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
    borderBottomWidth: 1,
  },
  title: {
    ...Typography.h3,
  },
  content: {
    padding: Spacing.medium,
  }
});

export default AnimatedCollapsible;


