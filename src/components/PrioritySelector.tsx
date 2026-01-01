// src/components/PrioritySelector.tsx
import React from 'react';
import { View, TouchableOpacity, StyleSheet, AccessibilityRole, ViewStyle } from 'react-native';
import { Colors, Spacing } from '../styles/AppStyles';
import { useTheme } from '../contexts/ThemeContext';

interface PrioritySelectorProps {
    value: number;
    onSelect: (priority: number) => void;
}

const getPriorityLabel = (level: number): string => {
    switch (level) {
        case 1: return "Najniższy";
        case 2: return "Niski";
        case 3: return "Średni";
        case 4: return "Wysoki";
        case 5: return "Krytyczny";
        default: return "Nieznany";
    }
};

const PrioritySelector = ({ value, onSelect }: PrioritySelectorProps) => {
    const priorities = [1, 2, 3, 4, 5];
    const theme = useTheme();
    const colors = [theme.colors.success, theme.colors.success, theme.colors.warning, theme.colors.danger, theme.colors.danger];

    return (
        <View
            style={styles.priorityContainer}
            accessibilityRole="radiogroup"
            accessibilityLabel="Wybór priorytetu"
        >
            {priorities.map(p => {
                const isSelected = p === value;
                return (
                    <TouchableOpacity
                        key={p}
                        onPress={() => onSelect(p)}
                        style={styles.priorityButton}
                        accessibilityRole="radio"
                        accessibilityLabel={`Priorytet ${p} - ${getPriorityLabel(p)}`}
                        accessibilityState={{ checked: isSelected }}
                    >
                        <View style={[
                            styles.priorityBar,
                            {
                                height: 10 + p * 5,
                                backgroundColor: p <= value ? colors[p - 1] : theme.colors.border
                            }
                        ]} />
                    </TouchableOpacity>
                )
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    priorityContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        paddingVertical: Spacing.small,
        height: 70,
    },
    priorityButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingHorizontal: Spacing.xSmall,
        height: '100%', // Ensure the touch target covers the full height
    },
    priorityBar: {
        width: 25,
        borderRadius: 5,
    },
});

export default PrioritySelector;
