// src/components/PrioritySelector.tsx
import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native'; // Dodano Text do podglądu priorytetu
import { Colors, Spacing, Typography } from '../styles/AppStyles';

interface PrioritySelectorProps {
    value: number;
    onSelect: (priority: number) => void;
}

const PrioritySelector = ({ value, onSelect }: PrioritySelectorProps) => {
    const priorities = [1, 2, 3, 4, 5];
    const colors = [Colors.success, Colors.success, Colors.warning, Colors.danger, Colors.danger];

    return (
        <View style={styles.priorityContainer}>
            {priorities.map(p => {
                return (
                    <TouchableOpacity key={p} onPress={() => onSelect(p)} style={styles.priorityButton}>
                        <View style={[
                            styles.priorityBar,
                            {
                                height: 10 + p * 5,
                                backgroundColor: p <= value ? colors[p - 1] : Colors.border
                            }
                        ]} />
                        {/* JEŚLI CHCESZ WYŚWIETLAĆ NUMER PRIORYTETU, MUSI BYĆ TAK: */}
                        {/* <Text style={styles.priorityNumber}>{p}</Text> */}
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
    },
    priorityBar: {
        width: 25,
        borderRadius: 5,
    },
    // Jeśli zdecydujesz się na wyświetlanie numeru priorytetu:
    // priorityNumber: {
    //     fontSize: Typography.small.fontSize,
    //     color: Colors.textSecondary,
    //     marginTop: Spacing.xSmall,
    // },
});

export default PrioritySelector;