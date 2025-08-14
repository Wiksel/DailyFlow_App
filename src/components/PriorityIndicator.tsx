import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../styles/AppStyles'; // Import globalnych stylów
import { useTheme } from '../contexts/ThemeContext';

interface PriorityIndicatorProps {
    priority: number;
}

const PriorityIndicator = ({ priority }: PriorityIndicatorProps) => {
    const theme = useTheme();
    const bars = [1, 2, 3, 4, 5];
    // Możesz użyć tej samej palety kolorów co w PrioritySelector lub dostosować
    const colors = [theme.colors.success, theme.colors.success, theme.colors.warning, theme.colors.danger, theme.colors.danger];

    const activeCount = Math.max(1, Math.min(5, Math.round(priority)));
    return (
        <View style={styles.priorityIndicatorContainer}>
            {bars.map(bar => (
                <View key={bar} style={[
                    styles.priorityBar,
                    {
                        height: 6 + bar * 2.5,
                        backgroundColor: bar <= activeCount ? colors[bar - 1] : theme.colors.border,
                        opacity: bar <= activeCount ? 1 : 0.75,
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