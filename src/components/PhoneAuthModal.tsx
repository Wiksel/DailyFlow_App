import React, { useState, useRef } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Keyboard, Animated } from 'react-native';
import { getAuth, FirebaseAuthTypes, EmailAuthProvider, signInWithPhoneNumber, linkWithCredential, sendEmailVerification, signOut, updatePassword } from '@react-native-firebase/auth';
import CountryPicker, { Country } from 'react-native-country-picker-modal';
import { createNewUserInFirestore, checkIfPhoneExists } from '../utils/authUtils';
import { useToast } from '../contexts/ToastContext';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import PasswordInput from './PasswordInput';
import { Feather } from '@expo/vector-icons';

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
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
    if (!passwordToValidate.trim() || !passwordRegex.test(passwordToValidate)) {
        setPasswordError('Hasło jest za słabe.');
        return false;
    }
    setPasswordError('');
    return true;
  };

  const sendVerificationCode = async () => {
    if (isLoading) return;
    Keyboard.dismiss();

    if (phoneNumber.length !== 9) {
      showToast('Proszę podać poprawny 9-cyfrowy numer telefonu.', 'error');
      return;
    }
    
    setIsLoading(true);
    const fullPhoneNumber = `+${country.callingCode[0]}${phoneNumber}`;
    
    console.log('📱 [SMS DEBUG] Rozpoczynam wysyłanie SMS:', {
      mode,
      phoneNumber: phoneNumber,
      fullPhoneNumber: fullPhoneNumber,
      country: country.callingCode[0]
    });
    
    try {
      // Sprawdź czy konto już istnieje
      const phoneExists = await checkIfPhoneExists(fullPhoneNumber);
      console.log('📱 [SMS DEBUG] Sprawdzenie istnienia telefonu:', { phoneExists, mode });
      
      if (mode === 'register' && phoneExists) {
        showToast('Konto z tym numerem już istnieje.\nUżyj opcji logowania przez SMS.', 'error');
        setIsLoading(false);
        return;
      }
      
      // W trybie logowania przez SMS - zawsze pozwalaj na wysłanie kodu
      // Zapisz informację o istnieniu użytkownika do wykorzystania po weryfikacji SMS
      setUserExistsInDatabase(phoneExists);

      console.log('📱 [SMS DEBUG] Wywołuję signInWithPhoneNumber dla:', fullPhoneNumber);
      const confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber);
      console.log('📱 [SMS DEBUG] Otrzymano confirmationResult:', !!confirmationResult);
      
      setConfirmation(confirmationResult);
      setStep('enter-code');
      showToast('Kod weryfikacyjny został wysłany!', 'success');
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
      setIsLoading(false);
    }
  };

  const confirmCode = async () => {
    if (isLoading) return;
    Keyboard.dismiss();
    
    if (code.length !== 6) {
        showToast('Kod musi mieć 6 cyfr.', 'error');
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
      showToast('Nick jest wymagany.', 'error');
      return;
    }
    if (!validatePassword(password)) return;

    const user = auth.currentUser;
    if (!user || !user.phoneNumber) {
      showToast('Błąd: Brak uwierzytelnionego użytkownika.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      // Utwórz sztuczny email dla użytkownika telefonicznego
      const phoneEmail = `${user.phoneNumber}@dailyflow.app`;
      
      // Połącz konto telefoniczne z email+hasło
      const emailCredential = EmailAuthProvider.credential(phoneEmail, password);
      await linkWithCredential(user, emailCredential);
      
      // Utwórz użytkownika w Firestore z prawidłowym emailem
      await createNewUserInFirestore(user, nickname);
      
      // Zamknij modal od razu - użytkownik pozostaje zalogowany
      handleClose();
      
      // Wywołaj callback informujący o pomyślnej rejestracji
      if (onRegistrationSuccess) {
        onRegistrationSuccess();
      }
      
      // Pokaż globalny toast po zamknięciu modala
      setTimeout(() => {
        showGlobalToast('Witaj w DailyFlow!\nKonto utworzone pomyślnie!', 'success');
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

  const isDetailsFormValid = nickname.trim().length > 0 && /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(password);
  
  const renderStep = () => {
    switch (step) {
      case 'enter-phone':
        return (
          <>
            <Text style={styles.modalTitle}>{mode === 'login' ? 'Zaloguj się przez SMS' : 'Zarejestruj się'}</Text>
            <Text style={styles.modalSubtitle}>Podaj swój numer, aby otrzymać kod weryfikacyjny SMS.</Text>
            <View style={styles.phoneInputContainer}>
                <CountryPicker
                    countryCode={country.cca2}
                    withFilter withFlag withCallingCode withCallingCodeButton withCountryNameButton={false}
                    onSelect={(selectedCountry: Country) => setCountry(selectedCountry)}
                    containerButtonStyle={styles.countryPickerButton}
                />
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
            <TextInput style={[GlobalStyles.input, { textAlign: 'center', letterSpacing: 8 }]} placeholder="000000" keyboardType="number-pad" value={code} onChangeText={setCode} maxLength={6} onSubmitEditing={confirmCode} blurOnSubmit={true} />
            <TouchableOpacity style={[GlobalStyles.button, { marginTop: Spacing.small }]} onPress={confirmCode} disabled={isLoading}>
              <Text style={[GlobalStyles.buttonText, isLoading && styles.buttonTextHidden]}>Zatwierdź</Text>
              {isLoading && <ActivityIndicator color="white" style={styles.activityIndicator} />}
            </TouchableOpacity>
          </>
        );
      case 'enter-details':
        return (
          <>
            <Text style={styles.modalTitle}>Dokończ rejestrację</Text>
            <Text style={styles.modalSubtitle}>Uzupełnij dane swojego konta.</Text>
            <TextInput style={[GlobalStyles.input, {marginBottom: Spacing.medium}]} placeholder="Twój Nick" value={nickname} onChangeText={setNickname} placeholderTextColor={Colors.placeholder} />
            <PasswordInput
                value={password}
                onChangeText={(val) => {
                    setPassword(val);
                    if(passwordError) validatePassword(val);
                }}
                onBlur={() => validatePassword(password)}
                containerStyle={passwordError ? styles.inputError : {}}
                placeholder="Hasło (min. 6, litera, cyfra)"
            />
            {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
            <TouchableOpacity 
                style={[GlobalStyles.button, { marginTop: Spacing.medium }, (isLoading || !isDetailsFormValid) && GlobalStyles.disabledButton]} 
                onPress={finishRegistration} 
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
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>Anuluj</Text>
          </TouchableOpacity>
          {renderStep()}
        </View>
      </View>
      {toast && (
          <Animated.View style={[styles.toastContainer, { opacity: fadeAnim, backgroundColor: getToastStyle(toast.type).backgroundColor }]}>
              <Feather name={getToastStyle(toast.type).iconName} size={24} color="white" style={styles.toastIcon} />
              <Text style={styles.toastText}>{toast.message}</Text>
          </Animated.View>
      )}
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
    toastContainer: { position: 'absolute', top: 20, left: Spacing.medium, right: Spacing.medium, padding: Spacing.medium, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', elevation: 10, zIndex: 9999, },
    toastIcon: { marginRight: Spacing.medium, },
    toastText: { ...Typography.body, color: 'white', fontWeight: '600', flexShrink: 1, textAlign: 'left' },
});

export default PhoneAuthModal;
