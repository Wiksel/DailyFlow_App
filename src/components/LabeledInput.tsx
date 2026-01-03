import React, { useEffect, forwardRef } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle, TextStyle } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, useDerivedValue, withTiming, interpolateColor, useSharedValue } from 'react-native-reanimated';
import { GlobalStyles, Spacing, Typography } from '../styles/AppStyles';
import { useTheme, lightColors, darkColors } from '../contexts/ThemeContext';

interface LabeledInputProps extends Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  containerStyle?: ViewStyle | ViewStyle[];
  inputStyle?: TextStyle | TextStyle[];
  labelStyle?: TextStyle | TextStyle[];
  testID?: string;
  themeAnim?: Animated.SharedValue<number>;
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const AnimatedText = Animated.createAnimatedComponent(Text);

const LabeledInput = forwardRef<TextInput, LabeledInputProps>(({
  label,
  value,
  onChangeText,
  containerStyle,
  inputStyle,
  labelStyle,
  placeholder,
  editable = true,
  testID,
  themeAnim,
  ...props
}, ref) => {
  const theme = useTheme();
  // We use a shared value to track theme changes for smooth interpolation
  // 0 = light, 1 = dark
  const internalThemeProgress = useDerivedValue(() => {
    return withTiming(theme.colorScheme === 'dark' ? 1 : 0, { duration: 300 });
  }, [theme.colorScheme]);

  const themeProgress = themeAnim || internalThemeProgress;

  const animatedContainerStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      themeProgress.value,
      [0, 1],
      [lightColors.border, darkColors.border]
    );
    // Note: GlobalStyles.input usually has backgroundColor, we override it here
    const backgroundColor = interpolateColor(
      themeProgress.value,
      [0, 1],
      [lightColors.inputBackground, darkColors.inputBackground]
    );
    const color = interpolateColor(
      themeProgress.value,
      [0, 1],
      [lightColors.textPrimary, darkColors.textPrimary]
    );

    return {
      borderColor,
      backgroundColor,
      color, // For the text input text color
    };
  });

  const animatedLabelStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      themeProgress.value,
      [0, 1],
      [lightColors.textSecondary, darkColors.textSecondary]
    );
    return { color };
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
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <AnimatedText style={[styles.label, animatedLabelStyle, labelStyle]}>{label}</AnimatedText>
      ) : null}
      <AnimatedTextInput
        ref={ref}
        testID={testID}
        accessibilityLabel={label || placeholder}
        style={[
          GlobalStyles.input,
          animatedContainerStyle, // animating bg, border, and text color here
          inputStyle
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        editable={editable}
        animatedProps={animatedInputProps}
        {...props}
      />
    </View>
  );
});

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
