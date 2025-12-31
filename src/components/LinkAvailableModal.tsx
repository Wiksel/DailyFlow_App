import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';

interface LinkAvailableModalProps {
    visible: boolean;
    email: string;
    onClose: () => void;
    onGoogleSignIn: () => void;
}

const LinkAvailableModal = ({ visible, email, onClose, onGoogleSignIn }: LinkAvailableModalProps) => {
    const theme = useTheme();

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Konto już istnieje</Text>
                    <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
                        Adres {email} jest już powiązany z kontem Google.
                        {'\n\n'}
                        Zaloguj się przez Google, aby potwierdzić tożsamość i dodać hasło do swojego konta.
                    </Text>

                    <TouchableOpacity
                        style={[styles.googleButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                        onPress={onGoogleSignIn}
                    >
                        <Image source={require('../../assets/google-icon.png')} style={styles.googleIcon} />
                        <Text style={[styles.googleButtonText, { color: theme.colors.textPrimary }]}>Zweryfikuj przez Google</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                        <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>Anuluj</Text>
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
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.medium,
        borderRadius: 12,
        borderWidth: 1,
        width: '100%',
        marginBottom: Spacing.medium,
    },
    googleIcon: {
        width: 24,
        height: 24,
        marginRight: Spacing.medium,
    },
    googleButtonText: {
        ...Typography.body,
        fontWeight: '600',
    },
    cancelButton: {
        padding: Spacing.small,
    },
    cancelButtonText: {
        ...Typography.body,
    },
});

export default LinkAvailableModal;
