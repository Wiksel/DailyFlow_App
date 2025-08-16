import React from 'react';
import { View, ViewStyle, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, Colors } from '../styles/AppStyles';

interface CardProps {
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  pressable?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
}

const Card: React.FC<CardProps> = ({ 
  style, 
  children, 
  variant = 'default', 
  pressable = false, 
  onPress, 
  disabled = false,
  testID 
}) => {
  const theme = useTheme();
  const isDark = theme.colorScheme === 'dark';
  const glassBackground = 'rgba(30,30,30,0.55)';
  
  const cardStyle = [
    styles.card,
    variant === 'elevated' && styles.elevated,
    variant === 'outlined' && styles.outlined,
    isDark
      ? { backgroundColor: glassBackground, borderColor: theme.colors.border }
      : { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
    disabled && styles.disabled,
    style as any,
  ];

  if (pressable && onPress) {
    return (
      <Pressable
        testID={testID ? `${testID}-pressable` : 'card-pressable'}
        onPress={onPress}
        disabled={disabled}
        style={cardStyle}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      testID={testID || 'card'}
      style={cardStyle}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: Spacing.large,
    borderRadius: 12,
    marginHorizontal: Spacing.medium,
    marginTop: Spacing.medium,
    borderWidth: 1,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  elevated: {
    shadowOpacity: 0.25,
    elevation: 8,
  },
  outlined: {
    shadowOpacity: 0.05,
    elevation: 1,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default Card;


