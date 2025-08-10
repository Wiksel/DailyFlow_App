import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import PasswordInput from './PasswordInput';

interface LinkAccountsModalProps {
  visible: boolean;
  email: string;
  onCancel: () => void;
  onConfirm: (password: string) => void;
}

const LinkAccountsModal = ({ visible, email, onCancel, onConfirm }: LinkAccountsModalProps) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!password.trim() || isLoading) return;
    setIsLoading(true);
    try {
      await onConfirm(password);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Połączyć konta?</Text>
          <Text style={styles.message}>
            Wykryto istniejące konto z adresem {email}. Możemy połączyć je z kontem Google.
            Aby potwierdzić, wpisz hasło do istniejącego konta.
          </Text>
          <PasswordInput value={password} onChangeText={setPassword} placeholder="Hasło do konta" />
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[GlobalStyles.button, styles.secondaryButton]} onPress={onCancel}>
              <Text style={GlobalStyles.buttonText}>Anuluj</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[GlobalStyles.button]} onPress={handleConfirm} disabled={isLoading}>
              <Text style={GlobalStyles.buttonText}>Połącz i zaloguj</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.large },
  card: { width: '100%', backgroundColor: 'white', borderRadius: 16, padding: Spacing.large },
  title: { ...Typography.h2, textAlign: 'center', marginBottom: Spacing.small },
  message: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.medium },
  actionsRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.medium, marginTop: Spacing.medium },
  secondaryButton: { backgroundColor: Colors.secondary },
});

export default LinkAccountsModal;


