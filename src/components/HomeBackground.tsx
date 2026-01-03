import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withDelay,
    withSequence,
    Easing,
    interpolateColor,
    useDerivedValue,
    interpolate
} from 'react-native-reanimated';
import { useTheme, lightColors, darkColors } from '../contexts/ThemeContext';
import { getAccentColors, getSpherePalette } from '../utils/themeUtils';

const { width, height } = Dimensions.get('window');

// Optimized for background - scattered wandering motion
const SPHERES_COUNT = 8;

const Sphere = React.memo(({ config, themeAnim, lightPalette, darkPalette }: any) => {
    const svX = useSharedValue(0);
    const svY = useSharedValue(0);

    React.useEffect(() => {
        // Random wandering motion X
        svX.value = withDelay(
            config.delayX,
            withRepeat(
                withSequence(
                    withTiming(1, { duration: config.durX / 4, easing: Easing.inOut(Easing.sin) }),
                    withTiming(-1, { duration: config.durX / 2, easing: Easing.inOut(Easing.sin) }),
                    withTiming(0, { duration: config.durX / 4, easing: Easing.inOut(Easing.sin) })
                ),
                -1,
                false
            )
        );

        // Random wandering motion Y (with different timing/delay)
        svY.value = withDelay(
            config.delayY,
            withRepeat(
                withSequence(
                    withTiming(1, { duration: config.durY / 4, easing: Easing.inOut(Easing.sin) }),
                    withTiming(-1, { duration: config.durY / 2, easing: Easing.inOut(Easing.sin) }),
                    withTiming(0, { duration: config.durY / 4, easing: Easing.inOut(Easing.sin) })
                ),
                -1,
                false
            )
        );
    }, []);

    const style = useAnimatedStyle(() => {
        const transX = svX.value * config.ampX;
        const transY = svY.value * config.ampY;

        return {
            transform: [
                { translateX: transX },
                { translateY: transY },
                { scale: 1 + (svX.value + svY.value) * 0.05 } // Subtle pulsing based on movement
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
            [0.35, 0.45] // More distinct in light mode (was 0.25)
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
        return Array.from({ length: SPHERES_COUNT }).map((_, i) => {
            const size = 80 + Math.random() * 140; // Varying sizes

            // Constrain amplitude to ensure we can find a valid valid position
            const maxAmpX = width / 2.5;
            const maxAmpY = height / 2.5;
            const ampX = 40 + Math.random() * (maxAmpX - 40);
            const ampY = 40 + Math.random() * (maxAmpY - 40);

            // Calculate safe bounds so sphere only goes offscreen by max size/2
            // min_left = x - amp. we want min_left >= -size/2  => x >= amp - size/2
            // max_right = x + size + amp. we want max_right <= width + size/2 => x <= width + size/2 - size - amp => x <= width - size/2 - amp

            const minX = Math.max(0, ampX - size / 2);
            const maxX = Math.min(width, width - size / 2 - ampX);
            const minY = Math.max(0, ampY - size / 2);
            const maxY = Math.min(height, height - size / 2 - ampY);

            // Fallback if range is inverted (too big amplitude/size) - center it
            const x = minX < maxX ? minX + Math.random() * (maxX - minX) : (width - size) / 2;
            const y = minY < maxY ? minY + Math.random() * (maxY - minY) : (height - size) / 2;

            return {
                id: i,
                x,
                y,
                size,
                colorIndex: i,
                // Ultra slow duration (60s - 120s)
                durX: 60000 + Math.random() * 60000,
                durY: 60000 + Math.random() * 60000,
                ampX,
                ampY,
                delayX: Math.random() * 20000,
                delayY: Math.random() * 20000,
            };
        });
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
