import React, { useRef } from 'react';
import { Pressable, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
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
    leftIcon?: keyof typeof Feather.glyphMap;
    leftIconColor?: string;
    leftIconSize?: number;
}

const ActionButton = ({ title, onPress, isLoading = false, style, textStyle, disabled = false, haptic = 'light', leftIcon, leftIconColor, leftIconSize = 18 }: ActionButtonProps) => {
  const theme = useTheme();
  const lastPressRef = useRef<number>(0);
  const buttonDisabled = isLoading || disabled;
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: buttonDisabled ? 0.8 : 1 }));

  return (
    <Pressable
      onPressIn={() => { if (!buttonDisabled) scale.value = withSpring(0.97, { damping: 18 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 18 }); }}
      onPress={async () => {
        if (buttonDisabled) return;
        const now = Date.now();
        if (now - lastPressRef.current < 700) return;
        lastPressRef.current = now;
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
          <>
            {leftIcon ? <Feather name={leftIcon} size={leftIconSize} color={leftIconColor || 'white'} /> : null}
            <Text style={[GlobalStyles.buttonText, { marginLeft: leftIcon ? 8 : 0 }, textStyle]}>{title}</Text>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
};

// Lokalny StyleSheet nie jest już potrzebny, ponieważ wszystkie style pochodzą z GlobalStyles

export default ActionButton;