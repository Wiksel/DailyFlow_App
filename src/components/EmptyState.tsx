import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ActionButton from './ActionButton';
import { useTheme } from '../contexts/ThemeContext';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';

type EmptyAction = {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary';
};

interface EmptyStateProps {
    icon: keyof typeof Feather.glyphMap;
    title: string;
    subtitle: string;
    actionTitle?: string;
    onActionPress?: () => void;
    illustration?: any; // require('...') lub undefined
    actions?: EmptyAction[];
}

const EmptyState = ({ icon, title, subtitle, actionTitle, onActionPress, illustration, actions }: EmptyStateProps) => {
    const theme = useTheme();
    return (
        <Animated.View style={styles.container} entering={FadeIn.duration(220)} layout={Layout.springify()} accessibilityRole="summary">
            {illustration ? (
              <Image source={illustration} style={styles.illustration} resizeMode="contain" />
            ) : (
              <Feather name={icon} size={64} color={theme.colors.placeholder} />
            )}
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
            {actionTitle && onActionPress && !actions?.length && (
                <ActionButton 
                    title={actionTitle} 
                    onPress={onActionPress}
                    style={[styles.button, { backgroundColor: theme.colors.primary }]}
                />
            )}
            {actions && actions.length > 0 && (
              <View style={styles.actionsRow}>
                {actions.map((a, idx) => (
                  <ActionButton
                    key={`${a.title}-${idx}`}
                    title={a.title}
                    onPress={a.onPress}
                    style={[styles.actionChip, { backgroundColor: a.variant === 'secondary' ? theme.colors.info : theme.colors.primary }]}
                  />
                ))}
              </View>
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
    ,illustration: {
        width: 180,
        height: 180,
        opacity: 0.9,
    },
    actionsRow: { flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
    actionChip: { paddingHorizontal: 16, minWidth: 140 },
});

export default EmptyState;
