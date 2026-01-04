import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ActionModal from './ActionModal';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, Colors, Typography } from '../styles/AppStyles';

interface Props {
    visible: boolean;
    onClose: () => void;
    activePriorityFilters: number[];
    onPriorityFilterChange: (filters: number[]) => void;
    activeDifficultyFilters: number[];
    onDifficultyFilterChange: (filters: number[]) => void;
}

const AdvancedFilterModal: React.FC<Props> = ({
    visible,
    onClose,
    activePriorityFilters,
    onPriorityFilterChange,
    activeDifficultyFilters,
    onDifficultyFilterChange,
}) => {
    const theme = useTheme();

    // Local state to hold changes before applying? 
    // Or apply live? Let's apply live for responsiveness, or use local state if "Apply" button is desired.
    // Given it's a modal with "Close", live update might be confusing if user cancels? 
    // ActionModal has "Close". Let's use local state and "Apply" / "Reset".

    const [localPriority, setLocalPriority] = useState<number[]>(activePriorityFilters);
    const [localDifficulty, setLocalDifficulty] = useState<number[]>(activeDifficultyFilters);

    useEffect(() => {
        if (visible) {
            setLocalPriority(activePriorityFilters);
            setLocalDifficulty(activeDifficultyFilters);
        }
    }, [visible, activePriorityFilters, activeDifficultyFilters]);

    const togglePriority = (p: number) => {
        setLocalPriority(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
    };

    const toggleDifficulty = (d: number) => {
        setLocalDifficulty(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
    };

    const handleApply = () => {
        onPriorityFilterChange(localPriority);
        onDifficultyFilterChange(localDifficulty);
        onClose();
    };

    const handleReset = () => {
        setLocalPriority([]);
        setLocalDifficulty([]);
    };

    const PriorityOption = ({ level, label, color }: { level: number, label: string, color: string }) => {
        const isActive = localPriority.includes(level);
        return (
            <TouchableOpacity
                onPress={() => togglePriority(level)}
                style={[
                    styles.optionChip,
                    {
                        backgroundColor: isActive ? color : 'transparent',
                        borderColor: color,
                        borderWidth: 1
                    }
                ]}
            >
                <Text style={{
                    color: isActive ? 'white' : theme.colors.textPrimary,
                    fontWeight: isActive ? 'bold' : 'normal'
                }}>
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    const DifficultyOption = ({ level }: { level: number }) => {
        const isActive = localDifficulty.includes(level);
        return (
            <TouchableOpacity
                onPress={() => toggleDifficulty(level)}
                style={[
                    styles.difficultyCircle,
                    {
                        backgroundColor: isActive ? theme.colors.primary : 'transparent',
                        borderColor: theme.colors.border,
                        borderWidth: isActive ? 0 : 1
                    }
                ]}
            >
                <Text style={{
                    color: isActive ? 'white' : theme.colors.textSecondary,
                    fontWeight: '600', fontSize: 13
                }}>
                    {level}
                </Text>
            </TouchableOpacity>
        );
    };

    // Unified priority levels and colors
    const priorityColors: { [key: number]: string } = {
        1: Colors.primary,   // Niski - Blue
        2: Colors.success,   // Normalny - Green
        3: Colors.warning,   // Sredni - Yellow
        4: '#ff9800',        // Wysoki - Orange (custom hex as Colors.orange might not exist, checking AppStyles later)
        5: Colors.danger     // Krytyczny - Red
    };

    return (
        <ActionModal
            visible={visible}
            title="Zaawansowane filtry"
            onRequestClose={onClose}
            placement="bottom"
            actions={[
                { text: 'Resetuj', onPress: handleReset, variant: 'secondary' },
                { text: 'Zastosuj', onPress: handleApply, variant: 'primary' }
            ]}
        >
            <ScrollView style={{ maxHeight: 400, width: '100%' }}>
                {/* Priority Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Priorytet</Text>
                    <View style={styles.chipContainer}>
                        <PriorityOption level={1} label="Niski" color={priorityColors[1]} />
                        <PriorityOption level={2} label="Normalny" color={priorityColors[2]} />
                        <PriorityOption level={3} label="Średni" color={priorityColors[3]} />
                        <PriorityOption level={4} label="Wysoki" color={priorityColors[4]} />
                        <PriorityOption level={5} label="Krytyczny" color={priorityColors[5]} />
                    </View>
                </View>

                {/* Difficulty Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Trudność (1-10)</Text>
                    <View style={styles.chipContainer}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(l => (
                            <DifficultyOption key={l} level={l} />
                        ))}
                    </View>
                </View>

                {/* Future sections (e.g. Creator) can go here */}
            </ScrollView>
        </ActionModal>
    );
};

const styles = StyleSheet.create({
    section: {
        marginBottom: Spacing.large,
    },
    sectionTitle: {
        fontSize: Typography.body.fontSize,
        fontWeight: '600',
        marginBottom: Spacing.medium,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 80,
        alignItems: 'center',
    },
    difficultyCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default AdvancedFilterModal;
