// src/components/NicknameModal.tsx

import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { useToast } from '../contexts/ToastContext';
import { createNewUserInFirestore } from '../utils/authUtils';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';

interface NicknameModalProps {
  visible: boolean;
  onClose: () => void;
  user: FirebaseAuthTypes.User | null;
}

const NicknameModal = ({ visible, onClose, user }: NicknameModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [nickname, setNickname] = useState(user?.displayName || '');
  const { showToast } = useToast();

  const handleFinish = async () => {
    if (!nickname.trim() || !user) {
      showToast('Nick nie może być pusty.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await createNewUserInFirestore(user, nickname);
      showToast('Konto pomyślnie utworzone!', 'success');
      onClose(); // Zamknięcie modala spowoduje, że AppNavigator zaloguje użytkownika
    } catch (error: any) {
      showToast(`Błąd finalizacji rejestracji: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Witaj w DailyFlow!</Text>
          <Text style={styles.modalSubtitle}>Wybierz swój nick, który będzie widoczny w aplikacji dla Twoich znajomych i partnera.</Text>
          <TextInput
            style={GlobalStyles.input}
            placeholder="Twój Nick"
            value={nickname}
            onChangeText={setNickname}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[GlobalStyles.button, { marginTop: Spacing.medium }]}
            onPress={handleFinish}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color="white" /> : <Text style={GlobalStyles.buttonText}>Zaczynajmy!</Text>}
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
});

export default NicknameModal;