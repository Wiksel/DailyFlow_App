import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../styles/AppStyles'; // Import globalnych stylów

interface PriorityIndicatorProps {
    priority: number;
}

const PriorityIndicator = ({ priority }: PriorityIndicatorProps) => {
    const bars = [1, 2, 3, 4, 5];
    // Możesz użyć tej samej palety kolorów co w PrioritySelector lub dostosować
    const colors = [Colors.success, Colors.success, Colors.warning, Colors.danger, Colors.danger];

    return (
        <View style={styles.priorityIndicatorContainer}>
            {bars.map(bar => (
                <View key={bar} style={[
                    styles.priorityBar,
                    {
                        height: 6 + bar * 2.5,
                        // Wizualizacja każdego słupka kolorem odpowiadającym jego 'poziomowi'
                        backgroundColor: bar <= priority ? colors[bar - 1] : Colors.border // <-- Zmiana tutaj
                    }
                ]} />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    priorityIndicatorContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: Spacing.xSmall, // 5px
    },
    priorityBar: {
        width: 4,
        borderRadius: 2,
        marginLeft: 2,
    },
});

export default PriorityIndicator;