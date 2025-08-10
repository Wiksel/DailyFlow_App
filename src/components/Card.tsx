import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, Colors } from '../styles/AppStyles';

interface CardProps {
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ style, children }) => {
  const theme = useTheme();
  const isDark = theme.colorScheme === 'dark';
  const glassBackground = 'rgba(30,30,30,0.55)';
  return (
    <View
      style={[
        styles.card,
        isDark
          ? { backgroundColor: glassBackground, borderColor: theme.colors.border }
          : { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
        style as any,
      ]}
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
});

export default Card;


