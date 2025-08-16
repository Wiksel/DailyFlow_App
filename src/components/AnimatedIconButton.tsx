import React, { useState } from 'react';
import { TouchableOpacity, ViewStyle, View, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface AnimatedIconButtonProps {
  icon: keyof typeof Feather.glyphMap;
  size?: number;
  color?: string;
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  tooltip?: string;
}

const AnimatedIconButton: React.FC<AnimatedIconButtonProps> = ({ icon, size = 22, color, onPress, accessibilityLabel, disabled = false, style, tooltip }) => {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: disabled ? 0.5 : 1 }));
  const [showTip, setShowTip] = useState(false);
  return (
    <Animated.View style={[animatedStyle, style as any]}> 
      <View style={{ alignItems: 'center' }}>
        {showTip && !!tooltip && (
          <View style={{ backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 6 }}>
            <Text style={{ color: 'white', fontSize: 11, fontWeight: '600' }}>{tooltip}</Text>
          </View>
        )}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel || tooltip}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPressIn={() => { if (!disabled) scale.value = withSpring(0.92, { damping: 18 }); }}
          onPressOut={() => { scale.value = withSpring(1, { damping: 18 }); setShowTip(false); }}
          onLongPress={async () => { if (!tooltip) return; setShowTip(true); try { await Haptics.selectionAsync(); } catch {} }}
          delayLongPress={350}
          onPress={async () => { if (disabled) return; try { await Haptics.selectionAsync(); } catch {}; onPress(); }}
          disabled={disabled}
        >
          <Feather name={icon} size={size} color={color || theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default AnimatedIconButton;


