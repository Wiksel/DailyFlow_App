import React from 'react';
import { Pressable, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { GlobalStyles } from '../styles/AppStyles';
import { useTheme } from '../contexts/ThemeContext';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface ActionButtonProps {
    title: string;
    onPress: () => void;
    isLoading?: boolean;
    style?: ViewStyle | ViewStyle[];
    textStyle?: TextStyle | TextStyle[];
    disabled?: boolean;
    haptic?: 'light' | 'medium' | 'heavy' | false;
}

const ActionButton = ({ title, onPress, isLoading = false, style, textStyle, disabled = false, haptic = 'light' }: ActionButtonProps) => {
  const theme = useTheme();
  const buttonDisabled = isLoading || disabled;
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: buttonDisabled ? 0.8 : 1 }));

  return (
    <Pressable
      onPressIn={() => { if (!buttonDisabled) scale.value = withSpring(0.97, { damping: 18 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 18 }); }}
      onPress={async () => {
        if (buttonDisabled) return;
        try {
          const mod = await import('expo-haptics');
          if (haptic === 'light') await mod.impactAsync(mod.ImpactFeedbackStyle.Light);
          else if (haptic === 'medium') await mod.impactAsync(mod.ImpactFeedbackStyle.Medium);
          else if (haptic === 'heavy') await mod.impactAsync(mod.ImpactFeedbackStyle.Heavy);
        } catch {}
        onPress();
      }}
      disabled={buttonDisabled}
      accessibilityRole="button"
      style={({ pressed }) => ([
        GlobalStyles.button,
        { backgroundColor: theme.colors.primary, opacity: pressed && !buttonDisabled ? 0.9 : 1 },
        style as any,
        buttonDisabled && [{ backgroundColor: theme.colors.placeholder }, GlobalStyles.disabledButton]
      ])}
    >
      <Animated.View style={animatedStyle}>
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={[GlobalStyles.buttonText, textStyle]}>{title}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
};

// Lokalny StyleSheet nie jest już potrzebny, ponieważ wszystkie style pochodzą z GlobalStyles

export default ActionButton;