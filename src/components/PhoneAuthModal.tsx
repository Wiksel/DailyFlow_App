import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Keyboard } from 'react-native';
import auth, { getAuth, EmailAuthProvider } from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { Country } from 'react-native-country-picker-modal';
import { createNewUserInFirestore, checkIfPhoneExists, setSuggestedLoginIdentifier, mapFirebaseAuthErrorToMessage } from '../utils/authUtils';
import { useToast, ToastOverlay, ToastOverlaySuppressor } from '../contexts/ToastContext';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import { useTheme } from '../contexts/ThemeContext';
import PasswordInput from './PasswordInput';
import PhoneNumberField from './PhoneNumberField';
import { formatPolishPhone, extractDigits, buildE164 } from '../utils/phone';
import { isStrongPassword } from '../utils/validation';
import { useResendTimer } from '../hooks/useResendTimer';

interface PhoneAuthModalProps {
  visible: boolean;
  onClose: () => void;
  onRegistrationSuccess?: () => void;
  onLoginSuccess?: () => void;
  mode?: 'register' | 'login'; // Tryb: rejestracja lub logowanie
}

type AuthStep = 'enter-phone' | 'enter-code' | 'enter-details';

const PhoneAuthModal = ({ visible, onClose, onRegistrationSuccess, onLoginSuccess, mode = 'register' }: PhoneAuthModalProps) => {
  const auth = getAuth();
  const [step, setStep] = useState<AuthStep>('enter-phone');
  const [isLoading, setIsLoading] = useState(false);
  const { showToast: showGlobalToast } = useToast();
  
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
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmation, setConfirmation] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [userExistsInDatabase, setUserExistsInDatabase] = useState<boolean>(false);
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
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
    setNickname('');
    setPassword('');
    setPasswordError('');
    setConfirmation(null);
    setUserExistsInDatabase(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handlePhoneNumberChange = (text: string) => {
      const cleaned = extractDigits(text);
      setPhoneNumber(cleaned);
      setFormattedPhoneNumber(formatPolishPhone(cleaned));
  };

  const validatePassword = (passwordToValidate: string) => {
    if (!passwordToValidate.trim() || !isStrongPassword(passwordToValidate)) {
        setPasswordError('Hasło jest za słabe.');
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
      showGlobalToast('Proszę podać poprawny 9-cyfrowy numer telefonu.', 'error');
      return;
    }
    
    if (isResend) { setIsResending(true); } else { setIsLoading(true); }
    const fullPhoneNumber = buildE164(country.callingCode[0], phoneNumber);
    
    console.log('📱 [SMS DEBUG] Rozpoczynam wysyłanie SMS:', {
      mode,
      phoneNumber: phoneNumber,
      fullPhoneNumber: fullPhoneNumber,
      country: country.callingCode[0]
    });
    
    try {
      // Sprawdź czy konto już istnieje tylko przy pierwszym wysłaniu
      if (!isResend) {
        const phoneExists = await checkIfPhoneExists(fullPhoneNumber);
        if (phoneExists) {
          showGlobalToast('Konto z tym numerem już istnieje.\nZaloguj się.', 'error');
          return;
        }
      }

      // Użyj verifyPhoneNumber, aby mieć możliwość wymuszenia resend przez token
      const { verificationId, resendToken } = await new Promise<{ verificationId: string; resendToken?: number }>((resolve, reject) => {
        try {
          const listener: any = (auth() as any).verifyPhoneNumber(fullPhoneNumber);
          const unsubscribe = listener.on('state_changed', (snapshot: any) => {
            const state = snapshot?.state;
            if (state === 'sent' || state === (auth as any).PhoneAuthState?.CODE_SENT) {
              const vid = snapshot?.verificationId;
              const token = snapshot?.resendToken ?? snapshot?.token;
              try { unsubscribe(); } catch {}
              resolve({ verificationId: vid, resendToken: token });
            } else if (state === 'error' || state === (auth as any).PhoneAuthState?.ERROR) {
              try { unsubscribe(); } catch {}
              reject(snapshot?.error || new Error('sms_error'));
            }
          });
          setTimeout(() => { try { unsubscribe(); } catch {}; reject(new Error('timeout')); }, 20000);
        } catch (e) { reject(e as any); }
      });
      setConfirmation(null);
      verificationIdRef.current = verificationId || null;
      resendTokenRef.current = (typeof resendToken === 'number' ? resendToken : null);
      setStep('enter-code');
      showGlobalToast('Kod weryfikacyjny został wysłany!', 'success');
      startResendTimer(30_000);
    } catch (error: any) {
      console.log('❌ [SMS DEBUG] Błąd wysyłania kodu SMS:', {
        code: error.code,
        message: error.message,
        fullError: error
      });
      
      if (error.code === 'auth/too-many-requests') {
        showToast('Zbyt wiele prób.\nDostęp został tymczasowo zablokowany.\n\nSpróbuj ponownie za kilka minut.', 'error');
      } else if (error.code === 'auth/invalid-phone-number') {
        showToast('Nieprawidłowy format numeru telefonu.\nSprawdź czy numer jest poprawny.', 'error');
      } else if (error.code === 'auth/quota-exceeded') {
        showToast('Przekroczono limit SMS. Spróbuj ponownie później.', 'error');
      } else if (error.code === 'auth/captcha-check-failed') {
        showToast('Weryfikacja reCAPTCHA nie powiodła się.\nSpróbuj ponownie.', 'error');
      } else if (error.code === 'auth/app-not-authorized') {
        showToast('Aplikacja nie jest autoryzowana do używania autentykacji SMS.\nSkontaktuj się z administratorem.', 'error');
      } else {
        showToast(`Wystąpił błąd: ${error.code}\nSprawdź numer telefonu i spróbuj ponownie.`, 'error');
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
      const token = resendTokenRef.current ?? undefined;
      const { verificationId, resendToken } = await new Promise<{ verificationId: string; resendToken?: number }>((resolve, reject) => {
        try {
          const listener: any = (auth() as any).verifyPhoneNumber(fullPhoneNumber, undefined, token as any);
          const unsubscribe = listener.on('state_changed', (snapshot: any) => {
            const state = snapshot?.state;
            if (state === 'sent' || state === (auth as any).PhoneAuthState?.CODE_SENT) {
              const vid = snapshot?.verificationId;
              const tk = snapshot?.resendToken ?? snapshot?.token;
              try { unsubscribe(); } catch {}
              resolve({ verificationId: vid, resendToken: tk });
            } else if (state === 'error' || state === (auth as any).PhoneAuthState?.ERROR) {
              try { unsubscribe(); } catch {}
              reject(snapshot?.error || new Error('sms_error'));
            }
          });
          setTimeout(() => { try { unsubscribe(); } catch {}; reject(new Error('timeout')); }, 20000);
        } catch (e) { reject(e as any); }
      });
      setConfirmation(null);
      verificationIdRef.current = verificationId || null;
      resendTokenRef.current = (typeof resendToken === 'number' ? resendToken : resendTokenRef.current);
      showGlobalToast('Kod weryfikacyjny został wysłany!', 'success');
      startResendTimer(30_000);
    } catch (e: any) {
      if (e?.message === 'timeout') {
        showGlobalToast('Przekroczono czas wysyłki SMS. Spróbuj ponownie.', 'error');
      } else {
        const { message, level } = mapFirebaseAuthErrorToMessage(String(e?.code || ''));
        showGlobalToast(message, level);
      }
    } finally {
      setIsResending(false);
    }
  };

  const confirmCode = async () => {
    if (isLoading) return;
    Keyboard.dismiss();
    
    if (code.length !== 6) {
        showGlobalToast('Kod musi mieć 6 cyfr.', 'error');
        return;
    }

    // Tryb testowy w development - pomiń weryfikację SMS
    if (__DEV__ && !confirmation) {
      console.log('🔧 [DEBUG] Tryb testowy - pomijam weryfikację SMS');
      if (mode === 'login') {
        showToast('DEBUG: Symulacja logowania pomyślnego!', 'success');
        handleClose();
        if (onLoginSuccess) {
          onLoginSuccess();
        }
        setTimeout(() => {
          showGlobalToast('DEBUG: Zalogowano (tryb testowy)!', 'success');
        }, 300);
      } else {
        showToast('DEBUG: Symulacja weryfikacji numeru!', 'success');
        setStep('enter-details');
      }
      return;
    }

    if (!confirmation) {
      showToast('Brak tokenu weryfikacji. Spróbuj wysłać kod ponownie.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      console.log('📱 [SMS DEBUG] Próba potwierdzenia kodu:', code);
      await confirmation.confirm(code);
      console.log('✅ [SMS DEBUG] Kod potwierdzony pomyślnie');
      
      if (mode === 'login') {
        if (userExistsInDatabase) {
          // Użytkownik istnieje - zaloguj go
          console.log('📱 [SMS DEBUG] Logowanie istniejącego użytkownika');
          showToast('Logowanie pomyślne!', 'success');
          
          // Zamknij modal od razu
          handleClose();
          
          // Wywołaj callback informujący o pomyślnym logowaniu
          if (onLoginSuccess) {
            onLoginSuccess();
          }
          
          // Pokaż globalny toast po zamknięciu modala
          setTimeout(() => {
            showGlobalToast('Zalogowano pomyślnie przez SMS!', 'success');
          }, 300);
        } else {
          // Użytkownik nie istnieje - przejdź do rejestracji
          console.log('📱 [SMS DEBUG] Tworzenie nowego konta dla użytkownika');
          showToast('Numer zweryfikowany!\nTeraz podaj nick i hasło aby utworzyć konto.', 'success');
          setStep('enter-details');
        }
      } else {
        // Tryb rejestracji - przejdź do wprowadzania danych
        showToast('Numer zweryfikowany pomyślnie!\nTeraz podaj nick i hasło.', 'success');
        setStep('enter-details');
      }
    } catch (error: any) {
      console.log('❌ [SMS DEBUG] Błąd potwierdzania kodu:', {
        code: error.code,
        message: error.message
      });
      showToast('Nieprawidłowy kod weryfikacyjny.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const finishRegistration = async () => {
    if (isLoading) return;
    if (!nickname.trim()) {
      showGlobalToast('Nick jest wymagany.', 'error');
      return;
    }
    if (!validatePassword(password)) return;

    const user = getAuth().currentUser;
    if (!user || !user.phoneNumber) {
      showGlobalToast('Błąd: Brak uwierzytelnionego użytkownika.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const dummyEmail = `${user.phoneNumber}@dailyflow.app`;
      const emailCredential = EmailAuthProvider.credential(dummyEmail, password);
      
      // Połącz konto telefoniczne z email+hasło
      const emailCredential = EmailAuthProvider.credential(phoneEmail, password);
      await linkWithCredential(user, emailCredential);
      
      // Utwórz użytkownika w Firestore z prawidłowym emailem
      await createNewUserInFirestore(user, nickname);
      // Prefill login screen with phone number
      try { await setSuggestedLoginIdentifier(user.phoneNumber!); } catch {}
      // Wyloguj po zakończeniu rejestracji, aby wrócić do ekranu logowania
      await getAuth().signOut();
      
      // Zamknij modal od razu - użytkownik pozostaje zalogowany
      handleClose();
      
      // Wywołaj callback informujący o pomyślnej rejestracji
      if (onRegistrationSuccess) {
        onRegistrationSuccess();
      }
      
      // Pokaż globalny toast po zamknięciu modala
      setTimeout(() => {
        showGlobalToast('Witaj w DailyFlow!\nKonto utworzone pomyślnie!', 'success');
        onRegistered && onRegistered();
      }, 300);
    } catch (error: any) {
      console.log('Błąd rejestracji:', error.code, error.message);
      if (error.code === 'auth/email-already-in-use') {
        showToast('Konto z tym numerem telefonu już istnieje.\nSpróbuj się zalogować.', 'error');
      } else {
        showToast(`Błąd rejestracji. Spróbuj ponownie.`, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isDetailsFormValid = nickname.trim().length > 0 && isStrongPassword(password);
  
  const renderStep = () => {
    switch (step) {
      case 'enter-phone':
        return (
          <>
            <Text style={styles.modalTitle}>{mode === 'login' ? 'Zaloguj się przez SMS' : 'Zarejestruj się'}</Text>
            <Text style={styles.modalSubtitle}>Podaj swój numer, aby otrzymać kod weryfikacyjny SMS.</Text>
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
            <TouchableOpacity style={GlobalStyles.button} onPress={async () => { try { const m = await import('expo-haptics'); await m.selectionAsync(); } catch {}; sendVerificationCode(); }} disabled={isLoading}>
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
            <TextInput style={[GlobalStyles.input, { textAlign: 'center', letterSpacing: 8, color: theme.colors.textPrimary, backgroundColor: theme.colors.inputBackground }]} placeholder="000000" placeholderTextColor={theme.colors.placeholder} keyboardType="number-pad" value={code} onChangeText={setCode} maxLength={6} onSubmitEditing={() => confirmCode()} blurOnSubmit={true} accessibilityLabel="Kod weryfikacyjny" />
            <TouchableOpacity style={[GlobalStyles.button, { marginTop: Spacing.small }]} onPress={async () => { try { const m = await import('expo-haptics'); await m.selectionAsync(); } catch {}; confirmCode(); }} disabled={isLoading}>
              <Text style={[GlobalStyles.buttonText, isLoading && styles.buttonTextHidden]}>Zatwierdź</Text>
              {isLoading && <ActivityIndicator color="white" style={styles.activityIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity style={[GlobalStyles.button, { marginTop: Spacing.xSmall, backgroundColor: Colors.secondary }]} onPress={async () => { try { const m = await import('expo-haptics'); await m.selectionAsync(); } catch {}; resendCode(); }} disabled={isResending || resendSeconds > 0}>
              {isResending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={GlobalStyles.buttonText}>{resendSeconds > 0 ? `Wyślij ponownie (${resendSeconds}s)` : 'Wyślij kod ponownie'}</Text>
              )}
            </TouchableOpacity>
          </>
        );
      case 'enter-details':
        return (
          <>
            <Text style={styles.modalTitle}>Dokończ rejestrację</Text>
            <Text style={styles.modalSubtitle}>Uzupełnij dane swojego konta.</Text>
            <TextInput style={[GlobalStyles.input, { marginBottom: Spacing.medium, color: theme.colors.textPrimary, backgroundColor: theme.colors.inputBackground }]} placeholder="Twój Nick" placeholderTextColor={theme.colors.placeholder} value={nickname} onChangeText={setNickname} accessibilityLabel="Nick" />
            <PasswordInput
                value={password}
                onChangeText={(val) => {
                    setPassword(val);
                    if(passwordError) validatePassword(val);
                }}
                onBlur={() => validatePassword(password)}
                 containerStyle={[passwordError ? styles.inputError : {}, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}
                 inputStyle={{ color: theme.colors.textPrimary }}
                placeholder="Hasło (min. 6, litera, cyfra)"
            />
            {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
            <TouchableOpacity 
                style={[GlobalStyles.button, { marginTop: Spacing.medium }, (isLoading || !isDetailsFormValid) && GlobalStyles.disabledButton]} 
                onPress={async () => { if (isLoading || !isDetailsFormValid) return; try { const m = await import('expo-haptics'); await m.impactAsync(m.ImpactFeedbackStyle.Medium); } catch {}; finishRegistration(); }} 
                disabled={isLoading || !isDetailsFormValid}>
              <Text style={[GlobalStyles.buttonText, isLoading && styles.buttonTextHidden]}>Zapisz i zakończ</Text>
              {isLoading && <ActivityIndicator color="white" style={styles.activityIndicator} />}
            </TouchableOpacity>
          </>
        );
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={handleClose}>
      <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.75)' }]}> 
        {/* Wyłącz globalny overlay na czas wyświetlania modala */}
        <ToastOverlaySuppressor />
        <View style={[styles.modalContent, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderWidth: 1 }] }>
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

export default PhoneAuthModal;
