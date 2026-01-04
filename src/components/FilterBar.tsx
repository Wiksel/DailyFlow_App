import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, UIManager } from 'react-native';
import Animated, { Layout, FadeIn, FadeOut } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, Glass, Colors } from '../styles/AppStyles';
import { Category } from '../types';
import { Feather } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
    activeCategoryIds: string[];
    categories: Category[];
    onToggleCategory: (id: string) => void;
    activeTimeFilters: string[];
    onTimeFilterChange: (filter: string) => void;
    onClearAll: () => void;
    // New Props for Advanced Filters
    onOpenAdvancedFilters: () => void;
    activePriorityFilters: number[];
    onTogglePriority: (priority: number) => void;
    activeDifficultyFilters: number[];
    onToggleDifficulty: (difficulty: number) => void;
}

const FilterBar: React.FC<Props> = ({
    activeCategoryIds,
    categories,
    onToggleCategory,
    activeTimeFilters,
    onTimeFilterChange,
    onClearAll,
    onOpenAdvancedFilters,
    activePriorityFilters,
    onTogglePriority,
    activeDifficultyFilters,
    onToggleDifficulty,
}) => {
    const theme = useTheme();
    const isDark = theme.colorScheme === 'dark';
    const glassStyle = isDark ? Glass.dark : Glass.light;

    const Pill = ({ label, active, onPress, color, icon, onClear, isFirst, variant = 'default' }: any) => {
        const activeColor = color || theme.colors.primary;

        let bgColor = active ? activeColor : glassStyle.inputBackground;
        let borderColor = active ? activeColor : 'rgba(150,150,150,0.15)';
        let textColor = active ? 'white' : glassStyle.textSecondary;

        if (variant === 'tab') {
            // specialized tab style for top row
            bgColor = active ? activeColor : 'transparent';
            borderColor = active ? activeColor : 'transparent';
            textColor = active ? 'white' : glassStyle.textSecondary;
        }

        return (
            <Animated.View layout={Layout.springify().damping(20).mass(1)} entering={FadeIn} exiting={FadeOut}>
                <TouchableOpacity
                    onPress={() => { onPress(); }}
                    style={[
                        styles.pill,
                        variant === 'tab' && styles.tabPill,
                        isFirst && { marginLeft: Spacing.medium },
                        {
                            backgroundColor: bgColor,
                            borderColor: borderColor,
                            borderWidth: 1,
                        }
                    ]}
                >
                    {icon && <Feather name={icon} size={14} color={active ? 'white' : glassStyle.textSecondary} style={{ marginRight: 6 }} />}
                    <Text style={[styles.pillText, { color: textColor }]}>{label}</Text>
                    {active && onClear && (
                        <TouchableOpacity onPress={(e) => { e.stopPropagation(); onClear(); }} style={{ marginLeft: 6 }}>
                            <Feather name="x" size={14} color="white" />
                        </TouchableOpacity>
                    )}
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const hasActiveFilters = activeCategoryIds.length > 0 || !activeTimeFilters.includes('all') || activePriorityFilters.length > 0 || activeDifficultyFilters.length > 0;

    return (
        <View style={styles.container}>
            {/* ROW 1: Smart Time Tabs (Space Between, No Scroll) */}
            <View style={styles.tabRow}>
                <Pill variant="tab" label="Dziś" active={activeTimeFilters.includes('today')} onPress={() => onTimeFilterChange('today')} icon="sun" />
                <Pill variant="tab" label="Jutro" active={activeTimeFilters.includes('tomorrow')} onPress={() => onTimeFilterChange('tomorrow')} icon="sunrise" />
                <Pill variant="tab" label="Nadchodzące" active={activeTimeFilters.includes('upcoming')} onPress={() => onTimeFilterChange('upcoming')} icon="calendar" />
                <Pill variant="tab" label="Zaległe" active={activeTimeFilters.includes('overdue')} onPress={() => onTimeFilterChange('overdue')} icon="alert-circle" color={Colors.danger} />
                <Pill variant="tab" label="Wykonane" active={activeTimeFilters.includes('completed')} onPress={() => onTimeFilterChange('completed')} icon="check-circle" color={Colors.success} />
            </View>

            {/* ROW 2: Detailed Filters (Horizontal Scroll) + Clear Button */}
            <View style={styles.filterRowContainer}>
                <View style={styles.scrollContainer}>
                    <TouchableOpacity style={[styles.tuneButton, { backgroundColor: glassStyle.inputBackground }]} onPress={onOpenAdvancedFilters}>
                        <Feather name="sliders" size={16} color={glassStyle.textPrimary} />
                    </TouchableOpacity>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ alignItems: 'center', paddingRight: Spacing.medium }}
                    >
                        {/* Active Priority Chips */}
                        {activePriorityFilters.map(p => (
                            <Pill key={`p-${p}`} label={`Priorytet: ${p}`} active={true} onPress={() => onTogglePriority(p)} color={theme.colors.warning} isFirst={false} />
                        ))}

                        {/* Active Difficulty Chips */}
                        {activeDifficultyFilters.map(d => (
                            <Pill key={`d-${d}`} label={`Trudność: ${d}`} active={true} onPress={() => onToggleDifficulty(d)} color={theme.colors.info} isFirst={false} />
                        ))}

                        {/* Categories */}
                        {activeCategoryIds.map((id) => {
                            const cat = categories.find(c => c.id === id);
                            if (!cat) return null;
                            return <Pill key={id} label={cat.name} active={true} onPress={() => onToggleCategory(id)} color={cat.color} />;
                        })}

                        {categories.filter(c => !activeCategoryIds.includes(c.id)).map((cat, index) => (
                            <Pill key={cat.id} label={cat.name} active={false} onPress={() => onToggleCategory(cat.id)} color={cat.color} />
                        ))}
                    </ScrollView>
                </View>

                {hasActiveFilters && (
                    <TouchableOpacity onPress={onClearAll} style={styles.clearButton}>
                        <Feather name="x-circle" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};
const styles = StyleSheet.create({
    container: {
        marginBottom: 4,
    },
    tabRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between', // Distribute evenly
        paddingHorizontal: Spacing.medium,
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(150,150,150,0.1)',
        marginBottom: 2,
    },
    filterRowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: Spacing.medium,
        paddingRight: Spacing.small,
    },
    scrollContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8
    },
    tuneButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 6,
    },
    tabPill: {
        borderRadius: 12,
        paddingVertical: 6,
        paddingHorizontal: 8, // Reduced padding to fit
        borderWidth: 0,
        marginRight: 0,
    },
    pillText: {
        fontSize: 12,
        fontWeight: '600',
    },
    clearButton: {
        padding: 4,
        marginLeft: 4
    }
});

export default FilterBar;

