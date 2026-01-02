import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing } from '../styles/AppStyles';
import { Category } from '../types';

interface FilterChipsProps {
    categories: Category[];
    activeCategories: string[];
    onToggleCategory: (id: string) => void;
    activeFilter: 'all' | 'today' | 'upcoming' | 'overdue';
    onSetFilter: (filter: 'all' | 'today' | 'upcoming' | 'overdue') => void;
    hideDateFilters?: boolean;
}

const FilterChips: React.FC<FilterChipsProps> = ({
    categories,
    activeCategories,
    onToggleCategory,
    activeFilter,
    onSetFilter,
    hideDateFilters = false
}) => {
    const theme = useTheme();

    const Chip = ({ label, active, onPress, color }: { label: string, active: boolean, onPress: () => void, color?: string }) => (
        <TouchableOpacity
            onPress={onPress}
            style={[
                styles.chip,
                {
                    backgroundColor: active ? (color || theme.colors.primary) : theme.colors.card,
                    borderColor: active ? (color || theme.colors.primary) : theme.colors.border,
                }
            ]}
        >
            <Text style={[
                styles.chipText,
                { color: active ? '#fff' : theme.colors.textSecondary, fontWeight: active ? '700' : '500' }
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.container}
            style={{ maxHeight: 50, marginBottom: Spacing.small }}
        >
            {!hideDateFilters && (
                <>
                    <Chip label="Wszystkie" active={activeFilter === 'all'} onPress={() => onSetFilter('all')} />
                    <Chip label="Dzisiaj" active={activeFilter === 'today'} onPress={() => onSetFilter('today')} />
                    <Chip label="Nadchodzące" active={activeFilter === 'upcoming'} onPress={() => onSetFilter('upcoming')} />
                    <Chip label="Zaległe" active={activeFilter === 'overdue'} onPress={() => onSetFilter('overdue')} />
                    <View style={styles.separator} />
                </>
            )}

            {categories.map(cat => (
                <Chip
                    key={cat.id}
                    label={cat.name}
                    active={activeCategories.includes(cat.id)}
                    onPress={() => onToggleCategory(cat.id)}
                    color={cat.color}
                />
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: Spacing.medium,
        alignItems: 'center',
        paddingVertical: 4
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
    },
    chipText: {
        fontSize: 13,
    },
    separator: {
        width: 1,
        height: 20,
        backgroundColor: '#ccc',
        marginRight: 8,
        opacity: 0.5
    }
});

export default FilterChips;
