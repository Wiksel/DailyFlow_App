import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Keyboard, AppState, AppStateStatus } from 'react-native';
import auth, { getAuth, EmailAuthProvider } from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import CountryPicker, { Country } from 'react-native-country-picker-modal';
import { createNewUserInFirestore, checkIfPhoneExists, debugPhoneNumbers, setSuggestedLoginIdentifier } from '../utils/authUtils';
import { useToast, ToastOverlay, ToastOverlaySuppressor } from '../contexts/ToastContext';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import PasswordInput from './PasswordInput';
import { Feather } from '@expo/vector-icons';

interface PhoneAuthModalProps {
  visible: boolean;
  onClose: () => void;
  onRegistered?: () => void;
}

type AuthStep = 'enter-phone' | 'enter-code' | 'enter-details';

const PhoneAuthModal = ({ visible, onClose, onRegistered }: PhoneAuthModalProps) => {
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
  const [isResending, setIsResending] = useState(false);
  const verificationIdRef = useRef<string | null>(null);
  const resendTokenRef = useRef<number | null>(null);
  
  // Używamy wyłącznie globalnego toastu z kontekstu

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

  // Licznik oparty na znaczniku czasu, działa także w tle
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
      showGlobalToast('Proszę podać poprawny 9-cyfrowy numer telefonu.', 'error');
      return;
    }
    
    if (isResend) { setIsResending(true); } else { setIsLoading(true); }
    const fullPhoneNumber = `+${country.callingCode[0]}${phoneNumber}`;
    
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
            const state = snapshot?.state || snapshot?.state;
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
      resendUntilRef.current = Date.now() + 30_000;
      setResendSeconds(30);
    } catch (error: any) {
      if (error?.code === 'auth/too-many-requests') {
        showGlobalToast('Zbyt wiele prób. \nSpróbuj ponownie później.', 'error');
      } else if (error?.code === 'auth/invalid-phone-number') {
        showGlobalToast('Nieprawidłowy format numeru telefonu.', 'error');
      } else if (error?.message === 'timeout') {
        showGlobalToast('Przekroczono czas wysyłki SMS. \nSpróbuj ponownie.', 'error');
      } else {
        showGlobalToast('Wystąpił nieoczekiwany błąd.', 'error');
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
      const token = resendTokenRef.current ?? undefined;
      const { verificationId, resendToken } = await new Promise<{ verificationId: string; resendToken?: number }>((resolve, reject) => {
        try {
          const listener: any = (auth() as any).verifyPhoneNumber(fullPhoneNumber, undefined, token as any);
          const unsubscribe = listener.on('state_changed', (snapshot: any) => {
            const state = snapshot?.state || snapshot?.state;
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
      resendUntilRef.current = Date.now() + 30_000;
      setResendSeconds(30);
    } catch (e: any) {
      if (e?.message === 'timeout') {
        showGlobalToast('Przekroczono czas wysyłki SMS. Spróbuj ponownie.', 'error');
      } else if (e?.code === 'auth/too-many-requests') {
        showGlobalToast('Zbyt wiele prób. \nOdczekaj chwilę i spróbuj ponownie.', 'error');
      } else {
        showGlobalToast('Nie udało się wysłać kodu. Spróbuj ponownie.', 'error');
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

    // Obsłuż obie ścieżki: przez confirmation albo przez verificationId
    if (!confirmation && !verificationIdRef.current) return;

    setIsLoading(true);
    try {
      if (confirmation) {
        await confirmation.confirm(code);
      } else if (verificationIdRef.current) {
        const credential = auth.PhoneAuthProvider.credential(verificationIdRef.current, code);
        await auth().signInWithCredential(credential);
      }
      showGlobalToast('Numer zweryfikowany pomyślnie!\nTeraz podaj nick i hasło.', 'success');
      setStep('enter-details');
    } catch (error: any) {
      showGlobalToast('Nieprawidłowy kod weryfikacyjny.', 'error');
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
      
      // Spróbuj połączyć credentials - może już istnieć
      try {
        await user.linkWithCredential(emailCredential);
      } catch (linkError: any) {
        // Jeśli użytkownik już ma połączony email credential, kontynuuj
        if (linkError.code !== 'auth/provider-already-linked' && linkError.code !== 'auth/email-already-in-use') {
          throw linkError;
        }
      }
      
      await createNewUserInFirestore(user, nickname);
      // Prefill login screen with phone number
      try { await setSuggestedLoginIdentifier(user.phoneNumber!); } catch {}
      // Wyloguj po zakończeniu rejestracji, aby wrócić do ekranu logowania
      await getAuth().signOut();
      
      // Zamknij modal od razu
      handleClose();
      
      // Pokaż globalny toast po zamknięciu modala
      setTimeout(() => {
        showGlobalToast('Witaj w DailyFlow!\nKonto utworzone pomyślnie!', 'success');
        onRegistered && onRegistered();
      }, 300);
    } catch (error: any) {
      showGlobalToast(`Błąd rejestracji. Spróbuj ponownie.`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const isDetailsFormValid = nickname.trim().length > 0 && /^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(password);
  
  const renderStep = () => {
    switch (step) {
      case 'enter-phone':
        return (
          <>
            <Text style={styles.modalTitle}>Zarejestruj się</Text>
            <Text style={styles.modalSubtitle}>Podaj swój numer, aby otrzymać kod weryfikacyjny SMS.</Text>
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
                onSubmitEditing={() => sendVerificationCode()} 
                blurOnSubmit={true}
              />
            </View>
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
            <TextInput style={[GlobalStyles.input, { textAlign: 'center', letterSpacing: 8, color: '#fff', backgroundColor: 'transparent', borderColor: '#333' }]} placeholder="000000" placeholderTextColor={Colors.placeholder} keyboardType="number-pad" value={code} onChangeText={setCode} maxLength={6} onSubmitEditing={() => confirmCode()} blurOnSubmit={true} />
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
            <TextInput style={[GlobalStyles.input, { marginBottom: Spacing.medium, color: '#fff', backgroundColor: 'transparent', borderColor: '#333' }]} placeholder="Twój Nick" placeholderTextColor={Colors.placeholder} value={nickname} onChangeText={setNickname} />
            <PasswordInput
                value={password}
                onChangeText={(val) => {
                    setPassword(val);
                    if(passwordError) validatePassword(val);
                }}
                onBlur={() => validatePassword(password)}
                containerStyle={[passwordError ? styles.inputError : {}, { backgroundColor: 'transparent', borderColor: '#333' }]}
                inputStyle={{ color: '#fff' }}
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
        <View style={[styles.modalContent, { backgroundColor: '#111', borderColor: '#222', borderWidth: 1 }] }>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={[styles.closeButtonText, { color: '#bbb' }]}>Anuluj</Text>
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
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.75)' },
    modalContent: { width: '90%', backgroundColor: '#111', borderRadius: 20, padding: Spacing.large, paddingTop: Spacing.xxLarge, elevation: 5, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
    modalTitle: { ...Typography.h2, textAlign: 'center', marginBottom: Spacing.small, color: '#fff' },
    modalSubtitle: { ...Typography.body, color: '#bbb', textAlign: 'center', marginBottom: Spacing.large },
    phoneInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: 8, marginBottom: Spacing.medium, width: '100%' },
    countryPickerButton: { paddingVertical: Spacing.small, paddingHorizontal: Spacing.small, marginRight: Spacing.xSmall, },
    phoneInput: { ...GlobalStyles.input, flex: 1, borderWidth: 0, backgroundColor: 'transparent', paddingLeft: Spacing.small, color: '#fff' },
    closeButton: { position: 'absolute', top: Spacing.small, right: Spacing.medium, padding: Spacing.small },
    closeButtonText: { color: '#bbb', fontSize: 16 },
    inputError: { borderColor: Colors.danger, },
    errorText: { color: Colors.danger, alignSelf: 'flex-start', width: '100%', marginLeft: Spacing.small, marginTop: Spacing.xSmall, marginBottom: Spacing.small, },
    buttonTextHidden: { opacity: 0, },
    activityIndicator: { position: 'absolute', },
    
});

export default PhoneAuthModal;
