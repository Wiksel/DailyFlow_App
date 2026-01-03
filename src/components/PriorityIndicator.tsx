import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../styles/AppStyles'; // Import globalnych stylów
import { useTheme } from '../contexts/ThemeContext';

interface PriorityIndicatorProps {
    priority: number;
}

const PriorityIndicator = ({ priority }: PriorityIndicatorProps) => {
    const theme = useTheme();
    const bars = [1, 2, 3]; // Zmieniamy na 3 poziomy wizualne dla uproszczenia? Nie, trzymajmy 5 ale z lepszym stylem.
    // Wróć, zostańmy przy 5, ale jeśli user chce zmiany stylu, zróbmy to bardziej elegancko.

    // Nowa paleta kolorów - jeden kolor per poziom
    const getPriorityColor = (level: number) => {
        switch (level) {
            case 1: return Colors.secondary; // Info/Blue
            case 2: return Colors.success;   // Green
            case 3: return Colors.warning;   // Yellow
            case 4: return '#fb8c00';        // Orange (Warm) - Wysoki
            case 5: return Colors.danger;    // Red - Krytyczny
            default: return Colors.textSecondary;
        }
    };

    const activeColor = getPriorityColor(priority);
    const fullBars = [1, 2, 3, 4, 5];

    // Zmniejszmy nieco ten wskaźnik, żeby był subtelniejszy
    return (
        <View style={styles.priorityIndicatorContainer}>
            {fullBars.map(bar => (
                <View key={bar} style={[
                    styles.priorityBar,
                    {
                        height: 5 + bar * 2, // 7, 9, 11, 13, 15
                        backgroundColor: bar <= priority ? activeColor : (theme.colorScheme === 'dark' ? '#333333' : '#e0e0e0'),
                        shadowColor: bar <= priority ? activeColor : undefined,
                        shadowOpacity: bar <= priority ? 0.3 : 0,
                        shadowRadius: 2,
                        elevation: bar <= priority ? 2 : 0,
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
        gap: 2,
        height: 18,
        paddingBottom: 4, // Lift it up more
    },
    priorityBar: {
        width: 3,
        borderRadius: 4,
    },
});

export default PriorityIndicator;