import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';

interface NicknameConflictModalProps {
    visible: boolean;
    oldNickname: string;
    newNickname: string;
    onKeepOld: () => void;
    onUseNew: () => void;
}

const NicknameConflictModal = ({ visible, oldNickname, newNickname, onKeepOld, onUseNew }: NicknameConflictModalProps) => {
    const theme = useTheme();

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { }}>
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Wybierz swój nick</Text>
                    <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
                        Na twoim koncie Google masz ustawiony nick:
                        {'\n'}
                        <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{oldNickname}</Text>
                        {'\n\n'}
                        W formularzu podałeś:
                        {'\n'}
                        <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{newNickname}</Text>
                        {'\n\n'}
                        Który chcesz zachować?
                    </Text>

                    <TouchableOpacity style={[GlobalStyles.button, styles.button]} onPress={onKeepOld}>
                        <Text style={GlobalStyles.buttonText}>Zachowaj "{oldNickname}"</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[GlobalStyles.button, styles.button, { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border }]}
                        onPress={onUseNew}
                    >
                        <Text style={[GlobalStyles.buttonText, { color: theme.colors.textPrimary }]}>Użyj "{newNickname}"</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.large,
    },
    container: {
        width: '100%',
        borderRadius: 20,
        padding: Spacing.large,
        borderWidth: 1,
        alignItems: 'center',
    },
    title: {
        ...Typography.h2,
        marginBottom: Spacing.medium,
        textAlign: 'center',
    },
    message: {
        ...Typography.body,
        textAlign: 'center',
        marginBottom: Spacing.large,
    },
    button: {
        width: '100%',
        marginBottom: Spacing.medium,
    },
});

export default NicknameConflictModal;
