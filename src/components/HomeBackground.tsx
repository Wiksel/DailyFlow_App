import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
    interpolateColor,
    useDerivedValue,
    interpolate
} from 'react-native-reanimated';
import { useTheme, lightColors, darkColors } from '../contexts/ThemeContext';
import { getAccentColors, getSpherePalette } from '../utils/themeUtils';

const { width, height } = Dimensions.get('window');

// Optimized for background - fewer spheres, slower movement
const SPHERES_COUNT = 6;

const Sphere = React.memo(({ config, themeAnim, lightPalette, darkPalette }: any) => {
    const sv = useSharedValue(0);

    React.useEffect(() => {
        sv.value = withRepeat(
            withTiming(1, { duration: config.duration, easing: Easing.inOut(Easing.sin) }),
            -1,
            true
        );
    }, []);

    const style = useAnimatedStyle(() => {
        const transX = sv.value * config.moveX;
        const transY = sv.value * config.moveY;

        return {
            transform: [
                { translateX: transX },
                { translateY: transY },
                { scale: 1 + sv.value * 0.1 }
            ]
        };
    });

    const colorStyle = useAnimatedStyle(() => {
        const backgroundColor = interpolateColor(
            themeAnim.value,
            [0, 1],
            [
                lightPalette[config.colorIndex % lightPalette.length],
                darkPalette[config.colorIndex % darkPalette.length]
            ]
        );
        const opacity = interpolate(
            themeAnim.value,
            [0, 1],
            [0.25, 0.6] // Less distinct in light mode, moderate in dark
        );
        return { backgroundColor, opacity };
    });

    return (
        <Animated.View
            style={[
                styles.sphere,
                {
                    left: config.x,
                    top: config.y,
                    width: config.size,
                    height: config.size,
                    borderRadius: config.size / 2,
                },
                style,
                colorStyle
            ]}
        />
    );
});

export const HomeBackground = ({ children }: { children: React.ReactNode }) => {
    const theme = useTheme();

    // Theme Transition Animation
    const themeAnim = useDerivedValue(() => {
        return withTiming(theme.colorScheme === 'dark' ? 1 : 0, { duration: 500 });
    }, [theme.colorScheme]);

    const bgStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            themeAnim.value,
            [0, 1],
            [lightColors.background, darkColors.background]
        )
    }));

    // Spheres Setup
    const lightPalette = useMemo(() => getSpherePalette(theme.accent, 'light'), [theme.accent]);
    const darkPalette = useMemo(() => getSpherePalette(theme.accent, 'dark'), [theme.accent]);

    const spheres = useMemo(() => {
        return Array.from({ length: SPHERES_COUNT }).map((_, i) => ({
            id: i,
            x: Math.random() * width, // Full width spread
            y: Math.random() * height * 0.9, // Spread across 90% of height
            size: 100 + Math.random() * 150,
            colorIndex: i,
            duration: 4000 + Math.random() * 4000, // Faster
            moveX: -50 + Math.random() * 100,
            moveY: -30 + Math.random() * 60,
        }));
    }, []);

    return (
        <Animated.View style={[styles.container, bgStyle]}>
            {/* Ambient Spheres Layer */}
            <View style={StyleSheet.absoluteFill}>
                {spheres.map((s) => (
                    <Sphere
                        key={s.id}
                        config={s}
                        themeAnim={themeAnim}
                        lightPalette={lightPalette}
                        darkPalette={darkPalette}
                    />
                ))}
            </View>

            {/* Glass Overlay/Blur Effect using a subtle gradient */}
            <LinearGradient
                colors={theme.colorScheme === 'dark'
                    ? ['rgba(18,18,18,0.4)', 'rgba(18,18,18,0.7)']
                    : ['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.6)']
                }
                style={StyleSheet.absoluteFill}
            />

            {/* Content */}
            <View style={styles.content}>
                {children}
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
    },
    sphere: {
        position: 'absolute',
        // Opacity handled by animated style
    },
    content: {
        flex: 1,
        zIndex: 1,
    }
});
