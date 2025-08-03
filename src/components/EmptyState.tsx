import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ActionButton from './ActionButton';

interface EmptyStateProps {
    icon: keyof typeof Feather.glyphMap;
    title: string;
    subtitle: string;
    actionTitle?: string;
    onActionPress?: () => void;
}

const EmptyState = ({ icon, title, subtitle, actionTitle, onActionPress }: EmptyStateProps) => {
    return (
        <View style={styles.container}>
            <Feather name={icon} size={60} color="#ced4da" />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {actionTitle && onActionPress && (
                <ActionButton 
                    title={actionTitle} 
                    onPress={onActionPress}
                    style={styles.button}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        marginTop: 50,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#495057',
        marginTop: 20,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#adb5bd',
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    button: {
        paddingHorizontal: 30,
    }
});

export default EmptyState;
