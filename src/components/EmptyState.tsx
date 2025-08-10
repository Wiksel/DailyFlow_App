import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ActionButton from './ActionButton';
import { useTheme } from '../contexts/ThemeContext';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';

interface EmptyStateProps {
    icon: keyof typeof Feather.glyphMap;
    title: string;
    subtitle: string;
    actionTitle?: string;
    onActionPress?: () => void;
}

const EmptyState = ({ icon, title, subtitle, actionTitle, onActionPress }: EmptyStateProps) => {
    const theme = useTheme();
    return (
        <Animated.View style={styles.container} entering={FadeIn.duration(220)} layout={Layout.springify()} accessibilityRole="summary">
            <Feather name={icon} size={64} color={theme.colors.placeholder} />
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
            {actionTitle && onActionPress && (
                <ActionButton 
                    title={actionTitle} 
                    onPress={onActionPress}
                    style={[styles.button, { backgroundColor: theme.colors.primary }]}
                />
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        marginTop: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 20,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    button: {
        paddingHorizontal: 30,
    }
});

export default EmptyState;
