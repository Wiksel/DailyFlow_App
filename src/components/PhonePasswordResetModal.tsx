import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Keyboard, AppState, AppStateStatus } from 'react-native';
import auth, { getAuth } from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import CountryPicker, { Country } from 'react-native-country-picker-modal';
import { findUserEmailByIdentifier, setPasswordResetInProgress } from '../utils/authUtils';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import PasswordInput from './PasswordInput';
import { Feather } from '@expo/vector-icons';
import { useToast, ToastOverlay, ToastOverlaySuppressor } from '../contexts/ToastContext';

interface PhonePasswordResetModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void; // Wywoływane po pomyślnej zmianie hasła, aby zamknąć nadrzędne okno
}

type ResetStep = 'enter-phone' | 'enter-code' | 'enter-new-password';

const PhonePasswordResetModal = ({ visible, onClose, onSuccess }: PhonePasswordResetModalProps) => {
  const [step, setStep] = useState<ResetStep>('enter-phone');
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  
  const [country, setCountry] = useState<Country>({
    cca2: 'PL',
    currency: ['PLN'],
    callingCode: ['48'],
    region: 'Europe',
    subregion: 'Eastern Europe',
    flag: 'flag-pl',
    name: 'Poland',
  });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formattedPhoneNumber, setFormattedPhoneNumber] = useState('');
  const phoneInputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmation, setConfirmation] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [isResending, setIsResending] = useState(false);
  const verificationIdRef = useRef<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  const showCustomToast = useToast().showToast;

  const resetState = () => {
    setStep('enter-phone');
    setIsLoading(false);
    setPhoneNumber('');
    setFormattedPhoneNumber('');
    setCode('');
    setNewPassword('');
    setPasswordError('');
    setConfirmation(null);
    setUserEmail(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
    // Upewnij się, że globalna flaga nie pozostanie ustawiona po zamknięciu
    setPasswordResetInProgress(false);
  };

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = '';
    if (cleaned.length > 0) formatted += cleaned.substring(0, 3);
    if (cleaned.length > 3) formatted += ' ' + cleaned.substring(3, 6);
    if (cleaned.length > 6) formatted += ' ' + cleaned.substring(6, 9);
    return formatted;
  };

  const handlePhoneNumberChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    setPhoneNumber(cleaned);
    setFormattedPhoneNumber(formatPhoneNumber(cleaned));
  };

  const validatePassword = (passwordToValidate: string) => {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
    if (!passwordToValidate.trim() || !passwordRegex.test(passwordToValidate)) {
      setPasswordError('Hasło jest za słabe.');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const [resendSeconds, setResendSeconds] = useState(0);
  const resendUntilRef = useRef<number | null>(null);
  useEffect(() => {
    if (visible && step === 'enter-phone') {
      const t = setTimeout(() => phoneInputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [visible, step]);

  // Aktualizacja licznika oparta na znaczniku czasu, aby działała także w tle
  useEffect(() => {
    if (!visible || step !== 'enter-code') return;
    const updateRemaining = () => {
      const now = Date.now();
      const until = resendUntilRef.current ?? now;
      const remaining = Math.max(0, Math.ceil((until - now) / 1000));
      setResendSeconds(remaining);
      if (remaining <= 0) {
        resendUntilRef.current = null;
      }
    };

    updateRemaining();
    const intervalId = setInterval(updateRemaining, 500);

    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') updateRemaining();
    };
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      clearInterval(intervalId);
      appStateSub.remove();
    };
  }, [visible, step]);

  const sendVerificationCode = async (isResend: boolean = false) => {
    if (isResend ? isResending : isLoading) return;
    Keyboard.dismiss();

    if (phoneNumber.length !== 9) {
      showCustomToast('Proszę podać poprawny 9-cyfrowy numer telefonu.', 'error');
      return;
    }
    
    if (isResend) { setIsResending(true); } else { setIsLoading(true); }
    const fullPhoneNumber = `+${country.callingCode[0]}${phoneNumber}`;
    
    try {
      setPasswordResetInProgress(true);
      // Sprawdź czy użytkownik istnieje
      const email = await findUserEmailByIdentifier(fullPhoneNumber);
      if (!email) {
        showCustomToast('Nie znaleziono użytkownika z tym numerem telefonu.', 'error');
        setIsLoading(false);
        return;
      }
      
      setUserEmail(email);
      
      // Wyślij kod SMS z timeoutem
      const confirmationResult = await Promise.race([
        auth().signInWithPhoneNumber(fullPhoneNumber),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 20000)),
      ]);
      setConfirmation(confirmationResult);
      // @ts-ignore
      verificationIdRef.current = (confirmationResult as any).verificationId || null;
      setStep('enter-code');
      showCustomToast('Kod weryfikacyjny został wysłany!', 'success');
      resendUntilRef.current = Date.now() + 30_000;
      setResendSeconds(30);
    } catch (error: any) {
      if (error?.code === 'auth/too-many-requests') {
        showCustomToast('Zbyt wiele prób. Spróbuj ponownie później.', 'error');
      } else if (error?.code === 'auth/invalid-phone-number') {
        showCustomToast('Nieprawidłowy format numeru telefonu.', 'error');
      } else if (error?.message === 'timeout') {
        showCustomToast('Przekroczono czas wysyłki SMS. Spróbuj ponownie.', 'error');
      } else {
        showCustomToast('Wystąpił nieoczekiwany błąd.', 'error');
      }
    } finally {
      if (isResend) { setIsResending(false); } else { setIsLoading(false); }
    }
  };

  const resendCode = async () => {
    if (isResending || resendSeconds > 0) return;
    const fullPhoneNumber = `+${country.callingCode[0]}${phoneNumber}`;
    setIsResending(true);
    try {
      const confirmationResult = await Promise.race([
        auth().signInWithPhoneNumber(fullPhoneNumber),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 20000)),
      ]);
      setConfirmation(confirmationResult);
      // @ts-ignore
      verificationIdRef.current = (confirmationResult as any).verificationId || null;
      showCustomToast('Kod weryfikacyjny został wysłany!', 'success');
      resendUntilRef.current = Date.now() + 30_000;
      setResendSeconds(30);
    } catch (e: any) {
      if (e?.message === 'timeout') {
        showCustomToast('Przekroczono czas wysyłki SMS. Spróbuj ponownie.', 'error');
      } else {
        showCustomToast('Nie udało się wysłać kodu. Spróbuj ponownie.', 'error');
      }
    } finally {
      setIsResending(false);
    }
  };

  const confirmCode = async () => {
    if (isLoading) return;
    Keyboard.dismiss();
    
    if (code.length !== 6) {
      showCustomToast('Kod musi mieć 6 cyfr.', 'error');
      return;
    }

    if (!confirmation && !verificationIdRef.current) return;

    setIsLoading(true);
    try {
      if (confirmation) {
        await confirmation.confirm(code);
      } else if (verificationIdRef.current) {
        const credential = auth.PhoneAuthProvider.credential(verificationIdRef.current, code);
        await auth().signInWithCredential(credential);
      }
      showCustomToast('Numer zweryfikowany! Teraz ustaw nowe hasło.', 'success');
      setStep('enter-new-password');
    } catch (error: any) {
      showCustomToast('Nieprawidłowy kod weryfikacyjny.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async () => {
    if (isLoading) return;
    if (!validatePassword(newPassword)) return;
    if (!userEmail) {
      showCustomToast('Błąd: Brak adresu email.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const user = getAuth().currentUser;
      if (!user) {
        showCustomToast('Błąd: Brak uwierzytelnionego użytkownika.', 'error');
        return;
      }
      // Po potwierdzeniu kodu SMS użytkownik jest świeżo uwierzytelniony -> można zmienić hasło
      await user.updatePassword(newPassword);
      showCustomToast('Hasło zostało zmienione pomyślnie!', 'success');
      // Najpierw zamknij wewnętrzny modal
      handleClose();
      // Następnie powiadom nadrzędny modal, aby się zamknął i odsłonił ekran logowania
      if (onSuccess) {
        onSuccess();
      }
      // Po zmianie hasła wracamy do ekranu logowania
      try { await getAuth().signOut(); } catch {}
    } catch (error: any) {
      showCustomToast('Błąd resetowania hasła. Spróbuj ponownie.', 'error');
    } finally {
      setIsLoading(false);
      setPasswordResetInProgress(false);
    }
  };

  const isPasswordFormValid = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(newPassword);
  
  const renderStep = () => {
    switch (step) {
      case 'enter-phone':
        return (
          <>
            <Text style={styles.modalTitle}>Resetuj hasło</Text>
            <Text style={styles.modalSubtitle}>Podaj swój numer telefonu, aby otrzymać kod weryfikacyjny SMS.</Text>
            <View style={styles.phoneInputContainer}>
              <CountryPicker
                countryCode={country.cca2}
                withFilter withFlag withCallingCode withCallingCodeButton withCountryNameButton={false}
                onSelect={(selectedCountry: Country) => setCountry(selectedCountry)}
                containerButtonStyle={styles.countryPickerButton}
                onOpen={() => setTimeout(() => phoneInputRef.current?.focus(), 0)}
              />
              <TextInput 
                style={styles.phoneInput} 
                placeholder="000 000 000" 
                keyboardType="phone-pad" 
                ref={phoneInputRef}
                autoFocus={false}
                value={formattedPhoneNumber}
                onChangeText={handlePhoneNumberChange}
                maxLength={11}
                onSubmitEditing={sendVerificationCode} 
                blurOnSubmit={true}
              />
            </View>
            <TouchableOpacity style={GlobalStyles.button} onPress={sendVerificationCode} disabled={isLoading}>
              <Text style={[GlobalStyles.buttonText, isLoading && styles.buttonTextHidden]}>Wyślij kod</Text>
              {isLoading && <ActivityIndicator color="white" style={styles.activityIndicator} />}
            </TouchableOpacity>
          </>
        );
      case 'enter-code':
        return (
          <>
            <Text style={styles.modalTitle}>Wpisz kod weryfikacyjny</Text>
            <Text style={styles.modalSubtitle}>{`Wysłaliśmy 6-cyfrowy kod\nna numer +${country.callingCode[0]} ${formattedPhoneNumber}.`}</Text>
            <TextInput 
              style={[GlobalStyles.input, { textAlign: 'center', letterSpacing: 8 }]} 
              placeholder="000000" 
              keyboardType="number-pad" 
              value={code} 
              onChangeText={setCode} 
              maxLength={6} 
              onSubmitEditing={confirmCode} 
              blurOnSubmit={true} 
            />
            <TouchableOpacity style={[GlobalStyles.button, { marginTop: Spacing.small }]} onPress={confirmCode} disabled={isLoading}>
              <Text style={[GlobalStyles.buttonText, isLoading && styles.buttonTextHidden]}>Zatwierdź</Text>
              {isLoading && <ActivityIndicator color="white" style={styles.activityIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity style={[GlobalStyles.button, { marginTop: Spacing.xSmall, backgroundColor: Colors.secondary }]} onPress={resendCode} disabled={isResending || resendSeconds > 0}>
              {isResending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={GlobalStyles.buttonText}>{resendSeconds > 0 ? `Wyślij ponownie (${resendSeconds}s)` : 'Wyślij kod ponownie'}</Text>
              )}
            </TouchableOpacity>
          </>
        );
      case 'enter-new-password':
        return (
          <>
            <Text style={styles.modalTitle}>Ustaw nowe hasło</Text>
            <Text style={styles.modalSubtitle}>Wprowadź nowe hasło dla swojego konta.</Text>
            <PasswordInput
              value={newPassword}
              onChangeText={(val) => {
                setNewPassword(val);
                if(passwordError) validatePassword(val);
              }}
              onBlur={() => validatePassword(newPassword)}
              containerStyle={passwordError ? styles.inputError : {}}
              placeholder="Nowe hasło (min. 6, litera, cyfra)"
            />
            {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
            <TouchableOpacity 
              style={[GlobalStyles.button, { marginTop: Spacing.medium }, (isLoading || !isPasswordFormValid) && GlobalStyles.disabledButton]} 
              onPress={resetPassword} 
              disabled={isLoading || !isPasswordFormValid}
            >
              <Text style={[GlobalStyles.buttonText, isLoading && styles.buttonTextHidden]}>Zmień hasło</Text>
              {isLoading && <ActivityIndicator color="white" style={styles.activityIndicator} />}
            </TouchableOpacity>
          </>
        );
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={handleClose}>
      <View style={styles.modalContainer}>
        {/* Wyłącz globalny overlay na czas wyświetlania modala */}
        <ToastOverlaySuppressor />
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>Anuluj</Text>
          </TouchableOpacity>
          {renderStep()}
        </View>
        {/* Lokalny ToastOverlay – wyżej, ale w granicach ekranu */}
        <ToastOverlay topOffset={-Spacing.large} />
      </View>
    </Modal>
  );
};

const getToastStyle = (type: 'success' | 'error' | 'info') => {
    switch (type) {
        case 'success': return { backgroundColor: Colors.success, iconName: 'check-circle' as const };
        case 'error': return { backgroundColor: Colors.error, iconName: 'alert-triangle' as const };
        case 'info': return { backgroundColor: Colors.info, iconName: 'info' as const };
        default: return { backgroundColor: Colors.textSecondary, iconName: 'help-circle' as const };
    }
};

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '90%', backgroundColor: 'white', borderRadius: 20, padding: Spacing.large, paddingTop: Spacing.xxLarge, elevation: 5, alignItems: 'center' },
  modalTitle: { ...Typography.h2, textAlign: 'center', marginBottom: Spacing.small },
  modalSubtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.large },
  phoneInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: 8, marginBottom: Spacing.medium, width: '100%' },
  countryPickerButton: { paddingVertical: Spacing.small, paddingHorizontal: Spacing.small, marginRight: Spacing.xSmall, },
  phoneInput: { ...GlobalStyles.input, flex: 1, borderWidth: 0, backgroundColor: 'transparent', paddingLeft: Spacing.small, },
  closeButton: { position: 'absolute', top: Spacing.small, right: Spacing.medium, padding: Spacing.small },
  closeButtonText: { color: Colors.textSecondary, fontSize: 16 },
  inputError: { borderColor: Colors.danger, },
  errorText: { color: Colors.danger, alignSelf: 'flex-start', width: '100%', marginLeft: Spacing.small, marginTop: Spacing.xSmall, marginBottom: Spacing.small, },
  buttonTextHidden: { opacity: 0, },
  activityIndicator: { position: 'absolute', },
  
});

export default PhonePasswordResetModal; 