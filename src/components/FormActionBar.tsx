import React from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import { useTheme } from '../contexts/ThemeContext';

interface ActionConfig {
  title: string;
  onPress: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  backgroundColor?: string;
  accessibilityLabel?: string;
  textStyle?: TextStyle | TextStyle[];
  style?: ViewStyle | ViewStyle[];
}

interface FormActionBarProps {
  primary?: ActionConfig;
  secondary?: ActionConfig;
  containerStyle?: ViewStyle | ViewStyle[];
  testID?: string;
}

const FormActionBar = ({ primary, secondary, containerStyle, testID }: FormActionBarProps) => {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, containerStyle]} testID={testID}>
      {primary ? (
        <TouchableOpacity
          style={[GlobalStyles.button, styles.button, { backgroundColor: primary.backgroundColor || theme.colors.primary }, primary.style]}
          onPress={primary.onPress}
          disabled={!!primary.disabled || !!primary.loading}
          accessibilityLabel={primary.accessibilityLabel || primary.title}
        >
          {primary.loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={[GlobalStyles.buttonText, styles.buttonText, primary.textStyle]}>{primary.title}</Text>
          )}
        </TouchableOpacity>
      ) : null}
      {secondary ? (
        <TouchableOpacity
          style={[GlobalStyles.button, styles.button, { backgroundColor: secondary.backgroundColor || theme.colors.info, marginTop: Spacing.small }, secondary.style]}
          onPress={secondary.onPress}
          disabled={!!secondary.disabled || !!secondary.loading}
          accessibilityLabel={secondary.accessibilityLabel || secondary.title}
        >
          {secondary.loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={[GlobalStyles.buttonText, styles.buttonText, secondary.textStyle]}>{secondary.title}</Text>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.medium,
    paddingTop: Spacing.small,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 10,
  },
  button: {
    // extends GlobalStyles.button
  },
  buttonText: {
    fontSize: Typography.h3.fontSize,
    fontWeight: Typography.bold.fontWeight,
  },
});

export default FormActionBar;


