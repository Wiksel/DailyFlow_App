import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Keyboard } from 'react-native';
import auth, { getAuth } from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { Country } from 'react-native-country-picker-modal';
import { findUserEmailByIdentifier, setPasswordResetInProgress, mapFirebaseAuthErrorToMessage } from '../utils/authUtils';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import { useTheme } from '../contexts/ThemeContext';
import PasswordInput from './PasswordInput';
import PhoneNumberField from './PhoneNumberField';
import { useToast, ToastOverlay, ToastOverlaySuppressor } from '../contexts/ToastContext';
import { formatPolishPhone, extractDigits, buildE164 } from '../utils/phone';
import { isStrongPassword } from '../utils/validation';
import { useResendTimer } from '../hooks/useResendTimer';

interface PhonePasswordResetModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void; // Wywoływane po pomyślnej zmianie hasła, aby zamknąć nadrzędne okno
}

type ResetStep = 'enter-phone' | 'enter-code' | 'enter-new-password';

const PhonePasswordResetModal = ({ visible, onClose }: PhonePasswordResetModalProps) => {
  const auth = getAuth();
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
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const showCustomToast = (message: string, type: 'success' | 'error' | 'info') => {
    // Zatrzymaj poprzednią animację jeśli istnieje
    if (animationRef.current) {
      animationRef.current.stop();
    }
    
    // Zawsze pokazuj nowy toast, niezależnie od tego czy poprzedni jest wyświetlany
    setIsToastVisible(true);
    setToast({ message, type });
    
    // Uruchom nową animację z pełnym czasem - zawsze zaczynaj od fade in
    animationRef.current = Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]);
    
    animationRef.current.start(() => {
      setToast(null);
      setIsToastVisible(false);
      animationRef.current = null;
    });
  };

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

  const handlePhoneNumberChange = (text: string) => {
    const cleaned = extractDigits(text);
    setPhoneNumber(cleaned);
    setFormattedPhoneNumber(formatPolishPhone(cleaned));
  };

  const validatePassword = (passwordToValidate: string) => {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
    if (!passwordToValidate.trim() || !passwordRegex.test(passwordToValidate)) {
      setPasswordError('Hasło musi mieć minimum 6 znaków, w tym literę i cyfrę.');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const { remainingSeconds: resendSeconds, start: startResendTimer } = useResendTimer(visible && step === 'enter-code');
  useEffect(() => {
    if (visible && step === 'enter-phone') {
      const t = setTimeout(() => phoneInputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [visible, step]);

  const sendVerificationCode = async (isResend: boolean = false) => {
    if (isResend ? isResending : isLoading) return;
    Keyboard.dismiss();

    if (phoneNumber.length !== 9) {
      showCustomToast('Proszę podać poprawny 9-cyfrowy numer telefonu.', 'error');
      // Automatycznie zamknij modal po 3 sekundach dla tego błędu
      setTimeout(() => {
        handleClose();
      }, 3000);
      return;
    }
    
    if (isResend) { setIsResending(true); } else { setIsLoading(true); }
    const fullPhoneNumber = buildE164(country.callingCode[0], phoneNumber);
    
    try {
      // Sprawdź czy numer telefonu istnieje w bazie danych
      const phoneExists = await checkIfPhoneExists(fullPhoneNumber);
      if (!phoneExists) {
        showCustomToast('Nie znaleziono konta z tym numerem telefonu.\n\nSprawdź czy numer jest poprawny\nlub zarejestruj się.', 'error');
        setIsLoading(false);
        // Automatycznie zamknij modal po 3 sekundach aby użytkownik mógł przeczytać alert
        setTimeout(() => {
          handleClose();
        }, 3000);
        return;
      }
      
      // Sprawdź czy użytkownik istnieje i pobierz email
      const email = await findUserEmailByIdentifier(fullPhoneNumber);
      if (!email) {
        showCustomToast('Nie znaleziono użytkownika z tym numerem telefonu.\nSprawdź czy numer jest poprawny.', 'error');
        setIsLoading(false);
        // Automatycznie zamknij modal po 3 sekundach aby użytkownik mógł przeczytać alert
        setTimeout(() => {
          handleClose();
        }, 3000);
        return;
      }
      
      setUserEmail(email);
      
      // Wyślij kod SMS z timeoutem
      const confirmationResult = await Promise.race([
        auth().signInWithPhoneNumber(fullPhoneNumber),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 20000)),
      ]);
      setConfirmation(confirmationResult);
      verificationIdRef.current = (
        confirmationResult as FirebaseAuthTypes.ConfirmationResult & { verificationId?: string }
      ).verificationId ?? null;
      setStep('enter-code');
      showCustomToast('Kod weryfikacyjny został wysłany!', 'success');
      startResendTimer(30_000);
    } catch (error: any) {
      console.log('Błąd wysyłania kodu SMS:', error.code);
      if (error.code === 'auth/too-many-requests') {
        showCustomToast('Zbyt wiele prób.\nDostęp został tymczasowo zablokowany.\n\nSpróbuj ponownie za kilka minut.', 'error');
        // Automatycznie zamknij modal po 3 sekundach dla tego błędu
        setTimeout(() => {
          handleClose();
        }, 3000);
      } else if (error.code === 'auth/invalid-phone-number') {
        showCustomToast('Nieprawidłowy format numeru telefonu.\nSprawdź czy numer jest poprawny.', 'error');
        // Automatycznie zamknij modal po 3 sekundach dla tego błędu
        setTimeout(() => {
          handleClose();
        }, 3000);
      } else if (error.code === 'auth/quota-exceeded') {
        showCustomToast('Przekroczono limit SMS. Spróbuj ponownie później.', 'error');
        // Automatycznie zamknij modal po 3 sekundach dla tego błędu
        setTimeout(() => {
          handleClose();
        }, 3000);
      } else {
        showCustomToast('Wystąpił nieoczekiwany błąd.\nSprawdź numer telefonu i spróbuj ponownie.', 'error');
        // Automatycznie zamknij modal po 3 sekundach dla tego błędu
        setTimeout(() => {
          handleClose();
        }, 3000);
      }
    } finally {
      if (isResend) { setIsResending(false); } else { setIsLoading(false); }
    }
  };

  const resendCode = async () => {
    if (isResending || resendSeconds > 0) return;
    const fullPhoneNumber = buildE164(country.callingCode[0], phoneNumber);
    setIsResending(true);
    try {
      try { await getAuth().signOut(); } catch {}
      await new Promise(r => setTimeout(r, 300));
      const confirmationResult = await Promise.race([
        auth().signInWithPhoneNumber(fullPhoneNumber),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 20000)),
      ]);
      setConfirmation(confirmationResult);
      verificationIdRef.current = (
        confirmationResult as FirebaseAuthTypes.ConfirmationResult & { verificationId?: string }
      ).verificationId ?? null;
      showCustomToast('Kod weryfikacyjny został wysłany!', 'success');
      startResendTimer(30_000);
    } catch (e: any) {
      if (e?.message === 'timeout') {
        showCustomToast('Przekroczono czas wysyłki SMS. Spróbuj ponownie.', 'error');
      } else {
        const { message, level } = mapFirebaseAuthErrorToMessage(String(e?.code || ''));
        showCustomToast(message, level);
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
      const { message, level } = mapFirebaseAuthErrorToMessage(String(error?.code || 'auth/invalid-verification-code'));
      showCustomToast(message, level);
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
      // Użytkownik jest już zalogowany przez SMS, więc możemy zmienić hasło
      const user = auth.currentUser;
      if (!user) {
        showCustomToast('Błąd: Brak zalogowanego użytkownika.', 'error');
        return;
      }

      // Zmień hasło bezpośrednio - używaj nowej składni Firebase Auth v22
      await updatePassword(user, newPassword);
      
      // Wyloguj się
      await signOut(auth);
      
      showCustomToast('Hasło zostało zmienione pomyślnie!', 'success');
      // Zamknij modal po 2 sekundach aby alert był widoczny
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error: any) {
      console.log('Błąd resetowania hasła:', error.code, error.message);
      if (error.code === 'auth/too-many-requests') {
        showCustomToast('Zbyt wiele prób.\nDostęp został tymczasowo zablokowany.\n\nSpróbuj ponownie za kilka minut.', 'error');
      } else {
        showCustomToast('Błąd resetowania hasła. Spróbuj ponownie.', 'error');
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

  const isPasswordFormValid = isStrongPassword(newPassword);
  
  const renderStep = () => {
    switch (step) {
      case 'enter-phone':
        return (
          <>
            <Text style={styles.modalTitle}>Resetuj hasło</Text>
            <Text style={styles.modalSubtitle}>Podaj swój numer telefonu, aby otrzymać kod weryfikacyjny SMS.</Text>
            <PhoneNumberField
              country={country}
              onSelectCountry={(c) => setCountry(c)}
              inputRef={phoneInputRef}
              value={formattedPhoneNumber}
              onChangeText={handlePhoneNumberChange}
              onSubmitEditing={() => sendVerificationCode()}
              placeholderTextColor={theme.colors.placeholder}
              textColor={theme.colors.textPrimary}
            />
            <TouchableOpacity style={GlobalStyles.button} onPress={() => sendVerificationCode()} disabled={isLoading}>
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
              style={[GlobalStyles.input, { textAlign: 'center', letterSpacing: 8, color: theme.colors.textPrimary, backgroundColor: theme.colors.inputBackground }]} 
              placeholder="000000" 
              placeholderTextColor={theme.colors.placeholder}
              keyboardType="number-pad" 
              value={code} 
              onChangeText={setCode} 
              maxLength={6} 
              onSubmitEditing={confirmCode} 
              blurOnSubmit={true} 
              accessibilityLabel="Kod weryfikacyjny"
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
              containerStyle={[passwordError ? styles.inputError : {}, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}
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
        {toast && (
            <Animated.View style={[styles.toastContainer, { opacity: fadeAnim, backgroundColor: getToastStyle(toast.type).backgroundColor }]}>
                <Feather name={getToastStyle(toast.type).iconName} size={24} color="white" style={styles.toastIcon} />
                <Text style={styles.toastText}>{toast.message}</Text>
            </Animated.View>
        )}
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={[styles.closeButtonText, { color: theme.colors.textSecondary }]}>Anuluj</Text>
          </TouchableOpacity>
          {renderStep()}
        </View>
        {/* Lokalny ToastOverlay – wyżej, ale w granicach ekranu */}
        <ToastOverlay topOffset={-Spacing.large} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.75)' },
  modalContent: { width: '90%', backgroundColor: '#111', borderRadius: 20, padding: Spacing.large, paddingTop: Spacing.xxLarge, elevation: 5, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  modalTitle: { ...Typography.h2, textAlign: 'center', marginBottom: Spacing.small, color: '#fff' },
  modalSubtitle: { ...Typography.body, color: '#bbb', textAlign: 'center', marginBottom: Spacing.large },
  // przeniesione do PhoneNumberField
  closeButton: { position: 'absolute', top: Spacing.small, right: Spacing.medium, padding: Spacing.small },
  closeButtonText: { color: '#bbb', fontSize: 16 },
  inputError: { borderColor: Colors.danger, },
  errorText: { color: Colors.danger, alignSelf: 'flex-start', width: '100%', marginLeft: Spacing.small, marginTop: Spacing.xSmall, marginBottom: Spacing.small, },
  buttonTextHidden: { opacity: 0, },
  activityIndicator: { position: 'absolute', },
  toastContainer: { position: 'absolute', top: 20, left: Spacing.medium, right: Spacing.medium, padding: Spacing.medium, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', elevation: 10, zIndex: 9999, },
  toastIcon: { marginRight: Spacing.medium, },
  toastText: { ...Typography.body, color: 'white', fontWeight: '600', flexShrink: 1, textAlign: 'left' },
});

export default PhonePasswordResetModal; 