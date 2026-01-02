import React, { useMemo } from 'react';
import { StyleSheet, ViewStyle, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import Animated, { useAnimatedStyle, withTiming, interpolateColor, useDerivedValue } from 'react-native-reanimated';
import { Colors } from '../styles/AppStyles';

interface Props {
    children: React.ReactNode;
    style?: ViewStyle;
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const GradientBackground: React.FC<Props> = ({ children, style }) => {
    const theme = useTheme();
    const isDark = theme.colorScheme === 'dark';

    // Derived values for smooth transition
    const progress = useDerivedValue(() => {
        return withTiming(isDark ? 1 : 0, { duration: 500 });
    }, [isDark]);

    // Define gradient colors
    // Light: White -> Distinct Light Cool Blue/Grey to be visible
    // Dark: Dark Grey -> Slightly lighter Dark Grey (Deep BG)
    const lightColorsArr = ['#FFFFFF', '#E8F1F5']; // Slightly darker second color to make gradient visible
    const darkColorsArr = [Colors.darkBackground, '#252525']; // Deep customized dark

    // Since LinearGradient 'colors' prop isn't easily animatable directly component-wise in all versions,
    // we overlay two gradients or use a solid background implementation.
    // However, expo-linear-gradient works best with static colors.
    // For simplicity & performance: We will return the LinearGradient with key to force re-render on theme change
    // OR we can just standard colors if we don't need *perfect* mid-transition gradient interpolation.
    // Given user concern for performance, direct render is safer than complex overlay blending.

    // We need to ensure the gradient covers the entire screen behind content.
    // Use absolute positioning if standard flex doesn't work well with content wrapping,
    // but typically flex:1 on parent is enough. 
    // Problem: User sees "gray blocks". This implies transparency issues or component background overriding gradient.
    // Solution: Ensure HomeScreen container is transparent.

    return (
        <View style={styles.wrapper}>
            <LinearGradient
                colors={isDark ? darkColorsArr : lightColorsArr}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill} // Stick to background
            />
            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
    },
    content: {
        flex: 1,
        // Ensure no opaque background here
        backgroundColor: 'transparent',
    }
});

export default GradientBackground;
