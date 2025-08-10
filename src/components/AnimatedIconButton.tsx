import React from 'react';
import { TouchableOpacity, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface AnimatedIconButtonProps {
  icon: keyof typeof Feather.glyphMap;
  size?: number;
  color?: string;
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
}

const AnimatedIconButton: React.FC<AnimatedIconButtonProps> = ({ icon, size = 22, color = '#000', onPress, accessibilityLabel, disabled = false, style }) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: disabled ? 0.5 : 1 }));
  return (
    <Animated.View style={[animatedStyle, style as any]}> 
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPressIn={() => { if (!disabled) scale.value = withSpring(0.92, { damping: 18 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 18 }); }}
        onPress={async () => { if (disabled) return; try { await Haptics.selectionAsync(); } catch {}; onPress(); }}
        disabled={disabled}
      >
        <Feather name={icon} size={size} color={color} />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default AnimatedIconButton;


