// src/components/CategoryFilter.tsx
import React from 'react';
import { ScrollView, Text, StyleSheet, ActivityIndicator, View, Pressable } from 'react-native';
import { useCategories } from '../contexts/CategoryContext';
import { Category } from '../types';
import { Colors, Spacing, Typography, isColorLight } from '../styles/AppStyles';
import { useTheme } from '../contexts/ThemeContext';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface CategoryFilterProps {
    activeCategory: string | 'all';
    onSelectCategory: (categoryId: string | 'all') => void;
    compact?: boolean;
    allowDeselect?: boolean;
    hideAllOption?: boolean;
    dimInactive?: boolean;
    leftAccessory?: React.ReactNode;
}

const CategoryFilter = ({ activeCategory, onSelectCategory, compact = false, allowDeselect = false, hideAllOption = false, dimInactive = false, leftAccessory }: CategoryFilterProps) => {
    const { categories, loading } = useCategories();
    const theme = useTheme();
    const dim = (hex: string, alpha: number) => {
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!m) return hex;
        const r = parseInt(m[1], 16);
        const g = parseInt(m[2], 16);
        const b = parseInt(m[3], 16);
        return `rgba(${r},${g},${b},${alpha})`;
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <ActivityIndicator color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.filterScrollView, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, compact && { borderBottomWidth: 0, minHeight: undefined }]}
            contentContainerStyle={[styles.filterContainer, compact && { paddingVertical: Spacing.xSmall }]}
        >
            {leftAccessory}
            {/* Opcja "Wszystkie" usunięta w trybie filtrów inline */}
            {categories.map((cat: Category) => (
                <Chip
                    key={cat.id}
                    onPress={() => {
                        if (allowDeselect && activeCategory === cat.id) { onSelectCategory('all'); } else { onSelectCategory(cat.id); }
                    }}
                    active={activeCategory === cat.id}
                    activeColor={cat.color}
                    inactiveColor={dimInactive ? dim(cat.color, 0.35) : theme.colors.inputBackground}
                    textColorActive={'white'}
                    textColorInactive={theme.colors.placeholder}
                    label={cat.name}
                />
            ))}
        </ScrollView>
    );
};

const Chip = ({ onPress, active, activeColor, inactiveColor, textColorActive, textColorInactive, label }: { onPress: () => void; active: boolean; activeColor: string; inactiveColor: string; textColorActive: string; textColorInactive: string; label: string; }) => {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    return (
        <Pressable
            onPressIn={() => { scale.value = withSpring(0.98, { damping: 15 }); }}
            onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
            onPress={async () => {
                try { const mod = await import('expo-haptics'); await mod.selectionAsync(); } catch {}
                onPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Filtr: ${label}${active ? ' (aktywny)' : ''}`}
            style={({ pressed }) => ([
                styles.filterButton,
                { backgroundColor: active ? activeColor : inactiveColor, opacity: pressed ? 0.95 : 1 },
            ])}
        >
            <Animated.Text style={[
                styles.filterText,
                { color: active ? textColorActive : textColorInactive },
                animatedStyle,
            ]}>{label}</Animated.Text>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        backgroundColor: 'transparent',
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderColor: Colors.border,
    },
    filterScrollView: {
        flexGrow: 0,
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderColor: Colors.border,
        minHeight: 48,
    },
    filterContainer: {
        paddingVertical: Spacing.small,
        paddingHorizontal: Spacing.medium,
        alignItems: 'center',
    },
    filterButton: {
        paddingVertical: Spacing.xSmall,
        paddingHorizontal: Spacing.medium,
        borderRadius: 20,
        marginRight: Spacing.small,
    },
    filterButtonDefault: {
        backgroundColor: Colors.inputBackground,
    },
    filterButtonActiveAll: {
        backgroundColor: Colors.primary,
    },
    filterText: {
        ...Typography.body,
        fontWeight: '400',
    },
    filterTextDefault: {
        color: Colors.textPrimary,
    },
    filterTextActive: {
        color: 'white',
    },
    filterTextActiveLightBg: {
        color: Colors.textPrimary,
    },
});

export default CategoryFilter;