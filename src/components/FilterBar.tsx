import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, Glass, Colors } from '../styles/AppStyles';
import { Category } from '../types';
import { Feather } from '@expo/vector-icons';
import ActionModal from './ActionModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {

    activeCategoryIds: string[];
    categories: Category[];
    onToggleCategory: (id: string) => void;
    activeTimeFilter: 'all' | 'today' | 'upcoming' | 'overdue';
    onTimeFilterChange: (filter: 'all' | 'today' | 'upcoming' | 'overdue') => void;
    onClearAll: () => void;
}

const FilterBar: React.FC<Props> = ({
    activeCategoryIds,
    categories,
    onToggleCategory,
    activeTimeFilter,
    onTimeFilterChange,
    onClearAll,
}) => {
    const theme = useTheme();
    const isDark = theme.colorScheme === 'dark';
    const glassStyle = isDark ? Glass.dark : Glass.light;

    const [moreVisible, setMoreVisible] = useState(false);

    const Pill = ({ label, active, onPress, color, icon, onClear, isFirst }: any) => {
        const activeColor = color || theme.colors.primary;
        return (
            <TouchableOpacity
                onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); onPress(); }}
                style={[
                    styles.pill,
                    isFirst && { marginLeft: Spacing.medium },
                    {
                        backgroundColor: active ? activeColor : glassStyle.inputBackground,
                        borderColor: active ? activeColor : 'rgba(150,150,150,0.15)',
                        borderWidth: 1,
                    }
                ]}
            >
                {icon && <Feather name={icon} size={14} color={active ? 'white' : glassStyle.textSecondary} style={{ marginRight: 6 }} />}
                <Text style={[styles.pillText, { color: active ? 'white' : glassStyle.textSecondary }]}>{label}</Text>
                {active && onClear && (
                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); onClear(); }} style={{ marginLeft: 6 }}>
                        <Feather name="x" size={14} color="white" />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>


            {/* Horizontal Scroll Filters - Row 1: More + Time Filters */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.medium, marginBottom: 2 }}>
                <TouchableOpacity style={[styles.iconButton, { backgroundColor: glassStyle.inputBackground, marginRight: 8 }]} onPress={() => setMoreVisible(true)}>
                    <Feather name="sliders" size={18} color={glassStyle.textPrimary} />
                </TouchableOpacity>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ alignItems: 'center' }}
                    style={{ flex: 1 }}
                >
                    <Pill isFirst={false} label="Dziś" active={activeTimeFilter === 'today'} onPress={() => onTimeFilterChange(activeTimeFilter === 'today' ? 'all' : 'today')} icon="sun" />
                    <Pill label="Jutro" active={activeTimeFilter === 'upcoming'} onPress={() => onTimeFilterChange(activeTimeFilter === 'upcoming' ? 'all' : 'upcoming')} icon="sunrise" />
                    <Pill label="Zaległe" active={activeTimeFilter === 'overdue'} onPress={() => onTimeFilterChange(activeTimeFilter === 'overdue' ? 'all' : 'overdue')} icon="alert-circle" color={Colors.danger} />
                </ScrollView>
            </View>

            {/* Row 2: Categories */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ alignItems: 'center', paddingRight: Spacing.medium, paddingBottom: 4 }}
            >
                {activeCategoryIds.map((id, index) => {
                    const cat = categories.find(c => c.id === id);
                    if (!cat) return null;
                    return <Pill key={id} isFirst={index === 0} label={cat.name} active={true} onPress={() => { }} color={cat.color} onClear={() => onToggleCategory(id)} />;
                })}

                {categories.filter(c => !activeCategoryIds.includes(c.id)).map((cat, index, arr) => (
                    <Pill key={cat.id} isFirst={activeCategoryIds.length === 0 && index === 0} label={cat.name} active={false} onPress={() => onToggleCategory(cat.id)} color={cat.color} />
                ))}
            </ScrollView>

            <ActionModal
                visible={moreVisible}
                title="Więcej filtrów"
                onRequestClose={() => setMoreVisible(false)}
                actions={[{ text: 'Zamknij', onPress: () => setMoreVisible(false), variant: 'secondary' }]}
            >
                <View style={{ padding: Spacing.medium }}>
                    <Text style={{ textAlign: 'center', color: glassStyle.textSecondary }}>Filtrowanie zaawansowane wkrótce.</Text>
                </View>
            </ActionModal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 0,
    },

    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
    },
    pillText: {
        fontSize: 13,
        fontWeight: '600',
    },
});

export default FilterBar;
