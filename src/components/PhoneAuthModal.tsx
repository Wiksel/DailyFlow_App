import React, { useState, useRef } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Keyboard } from 'react-native';
import auth from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { useToast } from '../contexts/ToastContext';
import { createNewUserInFirestore } from '../utils/authUtils';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import PasswordInput from './PasswordInput';

interface PhoneAuthModalProps {
  visible: boolean;
  onClose: () => void;
}

type AuthStep = 'enter-phone' | 'enter-code' | 'enter-details';

const PhoneAuthModal = ({ visible, onClose }: PhoneAuthModalProps) => {
  const [step, setStep] = useState<AuthStep>('enter-phone');
  const [isLoading, setIsLoading] = useState(false);
  
  const [countryCode, setCountryCode] = useState('+48');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formattedPhoneNumber, setFormattedPhoneNumber] = useState('');

  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmation, setConfirmation] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const { showToast } = useToast();
  
  const actionLock = useRef(false);

  const resetState = () => {
    setStep('enter-phone');
    setIsLoading(false);
    setPhoneNumber('');
    setFormattedPhoneNumber('');
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

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = '';
    if (cleaned.length > 0) {
      formatted += cleaned.substring(0, 3);
    }
    if (cleaned.length > 3) {
      formatted += ' ' + cleaned.substring(3, 6);
    }
    if (cleaned.length > 6) {
      formatted += ' ' + cleaned.substring(6, 9);
    }
    return formatted;
  };

  const handlePhoneNumberChange = (text: string) => {
      const cleaned = text.replace(/\D/g, '');
      setPhoneNumber(cleaned);
      setFormattedPhoneNumber(formatPhoneNumber(cleaned));
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
    if (actionLock.current) return;
    actionLock.current = true;

    Keyboard.dismiss();
    if (phoneNumber.length !== 9) {
      showToast('Proszę podać poprawny 9-cyfrowy numer telefonu.', 'error');
      setTimeout(() => { actionLock.current = false; }, 1000);
      return;
    }
    setIsLoading(true);
    try {
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;
      const confirmationResult = await auth().signInWithPhoneNumber(fullPhoneNumber, true);
      setConfirmation(confirmationResult);
      setStep('enter-code');
      showToast('Kod weryfikacyjny został wysłany!', 'success');
    } catch (error: any) {
      console.log('Błąd wysyłania kodu SMS (obsłużony):', error.code);
      if (error.code === 'auth/too-many-requests') {
        showToast('Zbyt wiele prób. Spróbuj ponownie później.', 'error');
      } else if (error.code === 'auth/invalid-phone-number') {
        showToast('Nieprawidłowy format numeru telefonu.', 'error');
      } else {
        showToast('Wystąpił nieoczekiwany błąd. Sprawdź numer i spróbuj ponownie.', 'error');
      }
    } finally {
      setIsLoading(false);
      actionLock.current = false;
    }
  };

  // ZMIANA: Uproszczona i bardziej niezawodna blokada przycisku
  const confirmCode = async () => {
    if (isLoading) return; // Jeśli już trwa operacja, zignoruj kliknięcie

    Keyboard.dismiss();
    
    // Walidacja synchroniczna
    if (code.length !== 6) {
        showToast('Kod musi mieć 6 cyfr.', 'error');
        return; // Po prostu zakończ funkcję, nie ma potrzeby blokady
    }

    if (!confirmation) {
        return;
    }

    // Rozpocznij operację asynchroniczną i zablokuj przycisk
    setIsLoading(true);
    try {
      const userCredential = await confirmation.confirm(code);
      if (userCredential && auth().currentUser) {
        const user = auth().currentUser!;
        if (user.providerData.some(provider => provider.providerId === 'password')) {
          showToast('Konto z tym numerem już istnieje.\nZaloguj się.', 'success');
          await auth().signOut();
          handleClose();
        } else {
          setStep('enter-details');
        }
      }
    } catch (error: any) {
      console.log('Błąd weryfikacji kodu (obsłużony):', error.code);
      showToast('Nieprawidłowy kod weryfikacyjny.', 'error');
    } finally {
      // Zawsze odblokuj przycisk na końcu operacji
      setIsLoading(false);
    }
  };

  const finishRegistration = async () => {
    if (isLoading) return;

    if (!nickname.trim()) {
      showToast('Nick jest wymagany.', 'error');
      return;
    }
    if (!validatePassword(password)) {
        return;
    }

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
      console.log("Błąd finalizacji rejestracji (obsłużony):", error);
      showToast(`Błąd rejestracji. Spróbuj ponownie.`, 'error');
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
              <TouchableOpacity onPress={() => showToast('Wybór kraju wkrótce!', 'info')}>
                <Text style={styles.phonePrefix}>{countryCode}</Text>
              </TouchableOpacity>
              <TextInput 
                style={styles.phoneInput} 
                placeholder="000 000 000" 
                keyboardType="phone-pad" 
                value={formattedPhoneNumber}
                onChangeText={handlePhoneNumberChange}
                maxLength={11}
                onSubmitEditing={sendVerificationCode} 
                blurOnSubmit={true} 
              />
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
            <Text style={styles.modalSubtitle}>{`Wysłaliśmy 6-cyfrowy kod\nna numer ${countryCode} ${formattedPhoneNumber}.`}</Text>
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
                placeholder="Hasło (min. 6 znaków, 1 litera, 1 cyfra)"
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
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={handleClose}>
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
    modalContent: { width: '90%', backgroundColor: 'white', borderRadius: 20, padding: Spacing.large, paddingTop: Spacing.xLarge, elevation: 5, alignItems: 'center' },
    modalTitle: { ...Typography.h2, textAlign: 'center', marginBottom: Spacing.small },
    modalSubtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.large },
    phoneInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: 8, marginBottom: Spacing.medium, width: '100%' },
    phonePrefix: { ...Typography.body, paddingHorizontal: Spacing.medium, fontWeight: '600', color: Colors.textPrimary, },
    phoneInput: { ...GlobalStyles.input, flex: 1, borderWidth: 0, backgroundColor: 'transparent', },
    closeButton: { position: 'absolute', top: Spacing.medium, right: Spacing.medium, padding: Spacing.small },
    closeButtonText: { color: Colors.textSecondary, fontSize: 16 },
    inputError: {
        borderColor: Colors.danger,
    },
    errorText: {
        color: Colors.danger,
        alignSelf: 'flex-start',
        width: '100%',
        marginLeft: Spacing.small,
        marginBottom: Spacing.small,
        marginTop: -Spacing.small,
    },
});

export default PhoneAuthModal;
