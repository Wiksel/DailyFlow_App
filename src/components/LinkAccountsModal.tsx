import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Spacing } from '../styles/AppStyles';
import PasswordInput from './PasswordInput';
import ActionModal from './ActionModal';

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
    <ActionModal
      visible={visible}
      title="Połączyć konta?"
      onRequestClose={onCancel}
      actions={[
        { text: 'Anuluj', onPress: onCancel, variant: 'secondary' },
        { text: 'Połącz i zaloguj', onPress: handleConfirm, variant: 'primary' },
      ]}
    >
      <View>
        <Paragraph email={email} />
        <View style={styles.fieldSpacer}>
          <PasswordInput value={password} onChangeText={setPassword} placeholder="Hasło do konta" />
        </View>
      </View>
    </ActionModal>
  );
};

const Paragraph = ({ email }: { email: string }) => (
  <>
    <ParaText>
      Wykryto istniejące konto z adresem {email}. Możemy połączyć je z kontem Google.
      Aby potwierdzić, wpisz hasło do istniejącego konta.
    </ParaText>
  </>
);

const ParaText = ({ children }: { children: React.ReactNode }) => {
  return (
    // zachowujemy styl paragrafu poprzez GlobalStyles i AppStyles
    // unikamy duplikacji lokalnego StyleSheet
    // używamy prostego <Text> z marginesem dolnym
    // styl zdefiniowany inline dla minimalnej ingerencji
    // (zachowuje dotychczasowy wygląd)
    // eslint-disable-next-line react-native/no-inline-styles
    <Text style={{ marginBottom: 12, textAlign: 'center', color: '#ffffff', lineHeight: 20 }}>{children}</Text>
  );
};

const styles = StyleSheet.create({
  fieldSpacer: {
    marginBottom: Spacing.large,
  },
});

export default LinkAccountsModal;


