// src/components/CategoryFilter.tsx
import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { useCategories } from '../contexts/CategoryContext';
import { Category } from '../types';
import { Colors, Spacing, Typography, isColorLight } from '../styles/AppStyles';

interface CategoryFilterProps {
    activeCategory: string | 'all';
    onSelectCategory: (categoryId: string | 'all') => void;
}

const CategoryFilter = ({ activeCategory, onSelectCategory }: CategoryFilterProps) => {
    const { categories, loading } = useCategories();

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator color={Colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScrollView}
            contentContainerStyle={styles.filterContainer}
        >
            <TouchableOpacity
                style={[
                    styles.filterButton,
                    activeCategory === 'all' ? styles.filterButtonActiveAll : styles.filterButtonDefault
                ]}
                onPress={() => onSelectCategory('all')}
            >
                <Text style={[
                    styles.filterText,
                    activeCategory === 'all' ? styles.filterTextActive : styles.filterTextDefault
                ]}>Wszystkie</Text>
            </TouchableOpacity>
            {categories.map((cat: Category) => (
                <TouchableOpacity
                    key={cat.id}
                    style={[
                        styles.filterButton,
                        {backgroundColor: activeCategory === cat.id ? cat.color : Colors.inputBackground}
                    ]}
                    onPress={() => onSelectCategory(cat.id)}
                >
                    <Text
                        style={[
                            styles.filterText,
                            activeCategory === cat.id ?
                                (isColorLight(cat.color) ? styles.filterTextActiveLightBg : styles.filterTextActive)
                                : styles.filterTextDefault
                        ]}
                    >
                        {cat.name}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        backgroundColor: 'white',
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderColor: Colors.border,
    },
    filterScrollView: {
        flexGrow: 0,
        backgroundColor: 'white',
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