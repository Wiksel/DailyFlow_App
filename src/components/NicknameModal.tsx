// src/components/NicknameModal.tsx

import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import LabeledInput from './LabeledInput';
import ActionModal from './ActionModal';
import type { FirebaseAuthTypes } from '../utils/authCompat';
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
    <ActionModal
      visible={visible}
      title="Witaj w DailyFlow!"
      message="Wybierz swój nick, który będzie widoczny w aplikacji dla Twoich znajomych i partnera."
      onRequestClose={onClose}
      actions={[{ text: 'Zaczynajmy!', onPress: handleFinish, variant: 'primary' }]}
    >
      <LabeledInput label="Nick" placeholder="Twój Nick" value={nickname} onChangeText={setNickname} editable={!isLoading} />
      {isLoading && <ActivityIndicator color="white" style={{ marginTop: Spacing.small }} />}
    </ActionModal>
  );
};

const styles = StyleSheet.create({});

export default NicknameModal;