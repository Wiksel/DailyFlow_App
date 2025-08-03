import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Keyboard } from 'react-native';
import auth from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { useToast } from '../contexts/ToastContext';
import { createNewUserInFirestore } from '../utils/authUtils';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import PasswordInput from './PasswordInput'; // ZMIANA: Import reużywalnego komponentu

interface PhoneAuthModalProps {
  visible: boolean;
  onClose: () => void;
}

type AuthStep = 'enter-phone' | 'enter-code' | 'enter-details';

const PhoneAuthModal = ({ visible, onClose }: PhoneAuthModalProps) => {
  const [step, setStep] = useState<AuthStep>('enter-phone');
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(''); // ZMIANA: Stan dla błędu hasła
  const [confirmation, setConfirmation] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const { showToast } = useToast();

  const resetState = () => {
    setStep('enter-phone');
    setIsLoading(false);
    setPhoneNumber('');
    setCode('');
    setNickname('');
    setPassword('');
    setPasswordError('');
    setConfirmation(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const validatePassword = (passwordToValidate: string) => {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
    if (!passwordToValidate.trim() || !passwordRegex.test(passwordToValidate)) {
        setPasswordError('Hasło jest za słabe.');
        return false;
    }
    setPasswordError('');
    return true;
  };

  const sendVerificationCode = async () => {
    Keyboard.dismiss();
    if (phoneNumber.length !== 9) {
      showToast('Proszę podać poprawny 9-cyfrowy numer telefonu.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const fullPhoneNumber = `+48${phoneNumber}`;
      const confirmationResult = await auth().signInWithPhoneNumber(fullPhoneNumber, true);
      setConfirmation(confirmationResult);
      setStep('enter-code');
      showToast('Kod weryfikacyjny został wysłany!', 'success');
    } catch (error: any) {
      console.error('Błąd wysyłania kodu SMS:', error);
      if (error.code === 'auth/too-many-requests') {
        showToast('Zbyt wiele prób. Spróbuj ponownie później.', 'error');
      } else {
        showToast('Wystąpił nieoczekiwany błąd przy wysyłaniu kodu.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const confirmCode = async () => {
    Keyboard.dismiss();
    if (code.length !== 6 || !confirmation) return;
    setIsLoading(true);
    try {
      const userCredential = await confirmation.confirm(code);
      if (userCredential && auth().currentUser) {
        const user = auth().currentUser!;
        if (user.email) {
          showToast('Konto z tym numerem już istnieje. Zaloguj się.', 'success');
          await auth().signOut();
          handleClose();
        } else {
          setStep('enter-details');
        }
      }
    } catch (error: any) {
      console.error('Błąd weryfikacji kodu:', error);
      showToast('Nieprawidłowy kod weryfikacyjny.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const finishRegistration = async () => {
    if (!nickname.trim()) {
      showToast('Nick jest wymagany.', 'error');
      return;
    }
    if (!validatePassword(password)) return;

    const user = auth().currentUser;
    if (!user || !user.phoneNumber) {
      showToast('Błąd: Brak uwierzytelnionego użytkownika.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const dummyEmail = `${user.phoneNumber}@dailyflow.app`;
      const emailCredential = auth.EmailAuthProvider.credential(dummyEmail, password);
      await user.linkWithCredential(emailCredential);
      await createNewUserInFirestore(user, nickname);
      showToast('Rejestracja zakończona!', 'success');
      handleClose();
    } catch (error: any) {
      console.error("Błąd finalizacji rejestracji:", error)
      showToast(`Błąd rejestracji: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const isDetailsFormValid = nickname.trim().length > 0 && /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(password);
  
  const renderStep = () => {
    switch (step) {
      case 'enter-phone':
        return (
          <>
            <Text style={styles.modalTitle}>Zarejestruj się</Text>
            <Text style={styles.modalSubtitle}>Podaj swój numer, aby otrzymać kod weryfikacyjny SMS.</Text>
            <View style={styles.phoneInputContainer}>
              <Text style={styles.phonePrefix}>+48</Text>
              <TextInput style={styles.phoneInput} placeholder="000 000 000" keyboardType="phone-pad" value={phoneNumber} onChangeText={setPhoneNumber} maxLength={9} onSubmitEditing={sendVerificationCode} blurOnSubmit={true} />
            </View>
            <TouchableOpacity style={GlobalStyles.button} onPress={sendVerificationCode} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="white" /> : <Text style={GlobalStyles.buttonText}>Wyślij kod</Text>}
            </TouchableOpacity>
          </>
        );
      case 'enter-code':
        return (
          <>
            <Text style={styles.modalTitle}>Wpisz kod weryfikacyjny</Text>
            <Text style={styles.modalSubtitle}>Wysłaliśmy 6-cyfrowy kod na numer +48 {phoneNumber}.</Text>
            <TextInput style={[GlobalStyles.input, { textAlign: 'center', letterSpacing: 8 }]} placeholder="000000" keyboardType="number-pad" value={code} onChangeText={setCode} maxLength={6} onSubmitEditing={confirmCode} blurOnSubmit={true} />
            <TouchableOpacity style={[GlobalStyles.button, { marginTop: Spacing.small }]} onPress={confirmCode} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="white" /> : <Text style={GlobalStyles.buttonText}>Zatwierdź</Text>}
            </TouchableOpacity>
          </>
        );
      case 'enter-details':
        return (
          <>
            <Text style={styles.modalTitle}>Dokończ rejestrację</Text>
            <Text style={styles.modalSubtitle}>Uzupełnij dane swojego konta.</Text>
            <TextInput style={[GlobalStyles.input, {marginBottom: Spacing.medium}]} placeholder="Twój Nick" value={nickname} onChangeText={setNickname} />
            <PasswordInput
                value={password}
                onChangeText={(val) => {
                    setPassword(val);
                    if(passwordError) validatePassword(val);
                }}
                onBlur={() => validatePassword(password)}
                containerStyle={passwordError ? styles.inputError : {}}
                placeholder="Ustaw hasło (min. 6 znaków, litera i cyfra)"
            />
            {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
            <TouchableOpacity 
                style={[GlobalStyles.button, { marginTop: Spacing.medium }, (isLoading || !isDetailsFormValid) && GlobalStyles.disabledButton]} 
                onPress={finishRegistration} 
                disabled={isLoading || !isDetailsFormValid}
            >
              {isLoading ? <ActivityIndicator color="white" /> : <Text style={GlobalStyles.buttonText}>Zapisz i zakończ</Text>}
            </TouchableOpacity>
          </>
        );
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>Anuluj</Text>
          </TouchableOpacity>
          {renderStep()}
        </View>
      </View>
    </Modal>
  );
};
const styles = StyleSheet.create({
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { width: '90%', backgroundColor: 'white', borderRadius: 20, padding: Spacing.large, elevation: 5, },
    modalTitle: { ...Typography.h2, textAlign: 'center', marginBottom: Spacing.small },
    modalSubtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.large },
    phoneInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: 8, marginBottom: Spacing.medium, },
    phonePrefix: { ...Typography.body, paddingHorizontal: Spacing.medium, fontWeight: '600', color: Colors.textSecondary, },
    phoneInput: { ...GlobalStyles.input, flex: 1, borderWidth: 0, backgroundColor: 'transparent', },
    closeButton: { alignSelf: 'flex-end', padding: Spacing.small, marginBottom: -Spacing.small },
    closeButtonText: { color: Colors.textSecondary, fontSize: 16 },
    inputError: {
        borderColor: Colors.danger,
    },
    errorText: {
        color: Colors.danger,
        alignSelf: 'flex-start',
        marginLeft: Spacing.small,
        marginBottom: Spacing.small,
        marginTop: Spacing.xSmall,
    },
});

export default PhoneAuthModal;