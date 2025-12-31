import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, TextInputProps, ViewStyle, TextStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import { useTheme } from '../contexts/ThemeContext';

interface PasswordInputProps extends Omit<TextInputProps, 'style'> {
  value: string;
  onChangeText: (text: string) => void;
  containerStyle?: ViewStyle | ViewStyle[];
  inputStyle?: TextStyle | TextStyle[];
  testID?: string;
}

const PasswordInput = ({ value, onChangeText, containerStyle, inputStyle, placeholder = "Hasło", testID, ...props }: PasswordInputProps) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const theme = useTheme();

  return (
    <View style={[
      styles.container,
      { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border },
      containerStyle
    ]}>
      <TextInput
        testID={testID}
        style={[styles.input, { color: theme.colors.textPrimary }, inputStyle]}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!isPasswordVisible}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.placeholder}
        selectionColor={theme.colors.primary}
        {...props}
      />
      <TouchableOpacity
        onPress={() => setIsPasswordVisible(!isPasswordVisible)}
        style={styles.eyeIcon}
        accessibilityRole="button"
        accessibilityLabel={isPasswordVisible ? "Ukryj hasło" : "Pokaż hasło"}
        accessibilityHint="Przełącza widoczność hasła"
      >
        <Feather name={isPasswordVisible ? "eye-off" : "eye"} size={22} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...GlobalStyles.input,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0, // Explicitly remove container vertical padding to let input fill it
    height: 50, // Ensure fixed height to prevent collapsing/clipping
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: Spacing.medium,
    // paddingVertical: 0 is crucial here
    fontSize: Typography.body.fontSize,
    color: Colors.textPrimary,
    textAlignVertical: 'center',
    includeFontPadding: false,
    textAlign: 'left', // Ensure text stays left
  },
  eyeIcon: {
    paddingLeft: Spacing.small,
    paddingRight: Spacing.medium,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PasswordInput;