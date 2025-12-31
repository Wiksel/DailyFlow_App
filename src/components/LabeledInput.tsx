import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle, TextStyle } from 'react-native';
import { GlobalStyles, Spacing, Typography } from '../styles/AppStyles';
import { useTheme } from '../contexts/ThemeContext';

interface LabeledInputProps extends Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  containerStyle?: ViewStyle | ViewStyle[];
  inputStyle?: TextStyle | TextStyle[];
  labelStyle?: TextStyle | TextStyle[];
  testID?: string;
}

const LabeledInput = ({
  label,
  value,
  onChangeText,
  containerStyle,
  inputStyle,
  labelStyle,
  placeholder,
  editable = true,
  testID,
  ...props
}: LabeledInputProps) => {
  const theme = useTheme();
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: theme.colors.textSecondary }, labelStyle]}>{label}</Text>
      ) : null}
      <TextInput
        testID={testID}
        style={[GlobalStyles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.textPrimary }, inputStyle]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.placeholder}
        selectionColor={theme.colors.primary}
        editable={editable}
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.small,
  },
  label: {
    fontSize: Typography.body.fontSize,
    fontWeight: Typography.semiBold.fontWeight,
    marginBottom: Spacing.xSmall,
  },
});

export default LabeledInput;


