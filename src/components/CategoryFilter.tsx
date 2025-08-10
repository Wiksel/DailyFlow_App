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
}

const CategoryFilter = ({ activeCategory, onSelectCategory }: CategoryFilterProps) => {
    const { categories, loading } = useCategories();
    const theme = useTheme();

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
            style={[styles.filterScrollView, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            contentContainerStyle={styles.filterContainer}
        >
            <Chip
                onPress={() => onSelectCategory('all')}
                active={activeCategory === 'all'}
                activeColor={theme.colors.primary}
                inactiveColor={theme.colors.inputBackground}
                textColorActive={'white'}
                textColorInactive={theme.colors.textPrimary}
                label="Wszystkie"
            />
            {categories.map((cat: Category) => (
                <Chip
                    key={cat.id}
                    onPress={() => onSelectCategory(cat.id)}
                    active={activeCategory === cat.id}
                    activeColor={cat.color}
                    inactiveColor={theme.colors.inputBackground}
                    textColorActive={isColorLight(cat.color) ? Colors.textPrimary : 'white'}
                    textColorInactive={theme.colors.textPrimary}
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
            onPress={onPress}
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
        fontWeight: Typography.semiBold.fontWeight, // <-- Zmiana tutaj
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