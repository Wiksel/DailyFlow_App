import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, TextInputProps, ViewStyle, TextStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { useAnimatedProps, useAnimatedStyle, useDerivedValue, withTiming, interpolateColor } from 'react-native-reanimated';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import { useTheme, lightColors, darkColors } from '../contexts/ThemeContext';

interface PasswordInputProps extends Omit<TextInputProps, 'style'> {
  value: string;
  onChangeText: (text: string) => void;
  containerStyle?: ViewStyle | ViewStyle[];
  inputStyle?: TextStyle | TextStyle[];
  testID?: string;
  themeAnim?: Animated.SharedValue<number>;
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const AnimatedView = Animated.createAnimatedComponent(View);
// Animated Feather Icon
const AnimatedFeather = Animated.createAnimatedComponent(Feather);

const PasswordInput = ({ value, onChangeText, containerStyle, inputStyle, placeholder = "Hasło", testID, themeAnim, ...props }: PasswordInputProps) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const theme = useTheme();

  const internalThemeProgress = useDerivedValue(() => {
    return withTiming(theme.colorScheme === 'dark' ? 1 : 0, { duration: 300 });
  }, [theme.colorScheme]);

  const themeProgress = themeAnim || internalThemeProgress;

  const animatedContainerStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      themeProgress.value,
      [0, 1],
      [lightColors.inputBackground, darkColors.inputBackground]
    );
    const borderColor = interpolateColor(
      themeProgress.value,
      [0, 1],
      [lightColors.border, darkColors.border]
    );
    return { backgroundColor, borderColor };
  });

  const animatedInputStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      themeProgress.value,
      [0, 1],
      [lightColors.textPrimary, darkColors.textPrimary]
    );
    return { color };
  });

  const animatedIconProps = useAnimatedProps(() => {
    const color = interpolateColor(
      themeProgress.value,
      [0, 1],
      [lightColors.textSecondary, darkColors.textSecondary]
    );
    return { color } as any;
  });

  const animatedInputProps = useAnimatedProps(() => {
    const placeholderColor = interpolateColor(
      themeProgress.value,
      [0, 1],
      [lightColors.placeholder, darkColors.placeholder]
    );
    const selectionColor = interpolateColor(
      themeProgress.value,
      [0, 1],
      [lightColors.primary, darkColors.primary]
    );
    return {
      placeholderTextColor: placeholderColor,
      selectionColor: selectionColor
    };
  });

  return (
    <AnimatedView style={[
      styles.container,
      animatedContainerStyle,
      containerStyle
    ]}>
      <AnimatedTextInput
        testID={testID}
        style={[styles.input, animatedInputStyle, inputStyle]}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!isPasswordVisible}
        placeholder={placeholder}
        animatedProps={animatedInputProps}
        {...props}
      />
      <TouchableOpacity
        onPress={() => setIsPasswordVisible(!isPasswordVisible)}
        style={styles.eyeIcon}
        accessibilityRole="button"
        accessibilityLabel={isPasswordVisible ? "Ukryj hasło" : "Pokaż hasło"}
        accessibilityHint="Przełącza widoczność hasła"
      >
        <AnimatedFeather
          name={isPasswordVisible ? "eye-off" : "eye"}
          size={22}
          animatedProps={animatedIconProps}
        />
      </TouchableOpacity>
    </AnimatedView>
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