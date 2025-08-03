import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import auth from '@react-native-firebase/auth';
import { useToast } from '../contexts/ToastContext';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';

interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

const ForgotPasswordModal = ({ visible, onClose }: ForgotPasswordModalProps) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      showToast('Proszę wprowadzić adres e-mail.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await auth().sendPasswordResetEmail(email.trim());
      Alert.alert(
        "Sprawdź skrzynkę e-mail",
        `Wysłaliśmy link do zresetowania hasła na adres ${email.trim()}. Sprawdź również folder spam.`,
        [{ text: "OK", onPress: onClose }]
      );
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        showToast('Nie znaleziono użytkownika o podanym adresie e-mail.', 'error');
      } else {
        showToast('Wystąpił nieoczekiwany błąd. Spróbuj ponownie.', 'error');
        console.error("Błąd resetowania hasła:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Zresetuj hasło</Text>
          <Text style={styles.modalSubtitle}>Podaj swój adres e-mail, a wyślemy Ci link do ustawienia nowego hasła.</Text>
          <TextInput
            style={GlobalStyles.input}
            placeholder="Adres e-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLoading}
            placeholderTextColor={Colors.placeholder}
          />
          <TouchableOpacity
            style={[GlobalStyles.button, { marginTop: Spacing.medium, width: '100%' }]}
            onPress={handlePasswordReset}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color="white" /> : <Text style={GlobalStyles.buttonText}>Wyślij link</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>Anuluj</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { width: '90%', backgroundColor: 'white', borderRadius: 20, padding: Spacing.large, elevation: 5, alignItems: 'center' },
    modalTitle: { ...Typography.h2, textAlign: 'center', marginBottom: Spacing.small },
    modalSubtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.large },
    cancelButton: { marginTop: Spacing.medium, padding: Spacing.small },
    cancelButtonText: { color: Colors.primary, fontSize: 16 },
});

export default ForgotPasswordModal;