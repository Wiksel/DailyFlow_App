import React, { useState, useRef } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { getAuth, sendPasswordResetEmail } from '@react-native-firebase/auth';
import { useToast } from '../contexts/ToastContext';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import { findUserEmailByIdentifier } from '../utils/authUtils';
import { Feather } from '@expo/vector-icons';

interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onPhoneReset: () => void; // Nowy prop do obsługi resetowania przez telefon
}

const ForgotPasswordModal = ({ visible, onClose, onPhoneReset }: ForgotPasswordModalProps) => {
  const auth = getAuth();
  const [identifier, setIdentifier] = useState(''); // Zmiana z email na identifier
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const showCustomToast = (message: string, type: 'success' | 'error' | 'info') => {
    // Zatrzymaj poprzednią animację jeśli istnieje
    if (animationRef.current) {
      animationRef.current.stop();
    }
    
    // Jeśli toast jest już wyświetlany, zresetuj animację
    if (isToastVisible) {
      setToast({ message, type });
      // Resetuj animację do pełnej widoczności
      fadeAnim.setValue(1);
    } else {
      setIsToastVisible(true);
      setToast({ message, type });
      // Animacja fade in
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
    
    // Uruchom nową animację z pełnym czasem
    animationRef.current = Animated.sequence([
      Animated.delay(2500),
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]);
    
    animationRef.current.start(() => {
      setToast(null);
      setIsToastVisible(false);
      animationRef.current = null;
    });
  };

  const handlePasswordReset = async () => {
    if (!identifier.trim()) {
      showCustomToast('Proszę wprowadzić e-mail.', 'error');
      return;
    }
    
    setIsLoading(true);
    try {
      // Sprawdź, czy użytkownik istnieje i pobierz jego e-mail
      const email = await findUserEmailByIdentifier(identifier.trim());
      
      if (!email) {
        showCustomToast('Nie znaleziono konta z tym adresem e-mail.\n\nSprawdź czy adres jest poprawny\nlub zarejestruj się.', 'error');
        setIsLoading(false);
        return;
      }

      await sendPasswordResetEmail(auth, email);
      showCustomToast('Wysłaliśmy link do zresetowania hasła na adres powiązany z Twoim kontem.\n\nSprawdź również folder spam.', 'success');
      
      // Po pomyślnym wysłaniu linku, zamknij modal po krótkiej chwili
      setTimeout(() => {
        handleClose();
      }, 2000);
      
    } catch (error: any) {
      // Błędy z `findUserEmailByIdentifier` będą tu obsługiwane
      if (error.code === 'auth/user-not-found') {
        showCustomToast('Nie znaleziono konta z tym adresem e-mail.\n\nSprawdź czy adres jest poprawny\nlub zarejestruj się.', 'error');
      } else if (error.code === 'auth/too-many-requests') {
        showCustomToast('Zbyt wiele prób.\nDostęp został tymczasowo zablokowany.\n\nSpróbuj ponownie za kilka minut.', 'error');
      } else {
        showCustomToast('Wystąpił nieoczekiwany błąd. Spróbuj ponownie.', 'error');
        console.error("Błąd resetowania hasła:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIdentifier('');
    onClose();
  };

  const getToastStyle = (type: 'success' | 'error' | 'info') => {
    switch (type) {
        case 'success': return { backgroundColor: Colors.success, iconName: 'check-circle' as const };
        case 'error': return { backgroundColor: Colors.error, iconName: 'alert-triangle' as const };
        case 'info': return { backgroundColor: Colors.info, iconName: 'info' as const };
        default: return { backgroundColor: Colors.textSecondary, iconName: 'help-circle' as const };
    }
  };

  return (
    <>
             <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={handleClose}>
         <View style={styles.modalContainer}>
           <View style={styles.modalContent}>
             {toast && (
                 <Animated.View style={[styles.toastContainer, { opacity: fadeAnim, backgroundColor: getToastStyle(toast.type).backgroundColor }]}>
                     <Feather name={getToastStyle(toast.type).iconName} size={24} color="white" style={styles.toastIcon} />
                     <Text style={styles.toastText}>{toast.message}</Text>
                 </Animated.View>
             )}
             <Text style={styles.modalTitle}>Zresetuj hasło</Text>
             <Text style={styles.modalSubtitle}>Podaj swój e-mail, a wyślemy Ci link do ustawienia nowego hasła.</Text>
             <TextInput
               style={GlobalStyles.input}
               placeholder="Adres e-mail"
               value={identifier}
               onChangeText={setIdentifier}
               autoCapitalize="none"
               editable={!isLoading}
               placeholderTextColor={Colors.placeholder}
             />
             <TouchableOpacity
               style={[GlobalStyles.button, { marginTop: Spacing.medium, width: '100%' }]}
               onPress={handlePasswordReset}
               disabled={isLoading}
             >
               {isLoading ? <ActivityIndicator color="white" /> : <Text style={GlobalStyles.buttonText}>Wyślij link</Text>}
             </TouchableOpacity>
             
             <View style={styles.dividerContainer}>
               <View style={styles.dividerLine} />
               <Text style={styles.dividerText}>lub</Text>
               <View style={styles.dividerLine} />
             </View>
             
             <TouchableOpacity
               style={[GlobalStyles.button, { marginTop: Spacing.small, backgroundColor: Colors.secondary }]}
               onPress={onPhoneReset}
               disabled={isLoading}
             >
               <Text style={GlobalStyles.buttonText}>Resetuj przez telefon</Text>
             </TouchableOpacity>
             
             <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
               <Text style={styles.cancelButtonText}>Anuluj</Text>
             </TouchableOpacity>
           </View>
         </View>
       </Modal>
    </>
  );
};

const styles = StyleSheet.create({
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { width: '90%', backgroundColor: 'white', borderRadius: 20, padding: Spacing.large, elevation: 5, alignItems: 'center' },
    modalTitle: { ...Typography.h2, textAlign: 'center', marginBottom: Spacing.small },
    modalSubtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.large },
    cancelButton: { marginTop: Spacing.medium, padding: Spacing.small },
    cancelButtonText: { color: Colors.primary, fontSize: 16 },
    dividerContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 0, marginTop: Spacing.medium, marginBottom: Spacing.small },
    dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
    dividerText: { ...Typography.small, color: Colors.textSecondary, marginHorizontal: Spacing.medium },
    toastContainer: { position: 'absolute', top: -160, left: Spacing.medium, right: Spacing.medium, padding: Spacing.medium, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', elevation: 10, zIndex: 9999 },
    toastIcon: { marginRight: Spacing.medium },
    toastText: { ...Typography.body, color: 'white', fontWeight: '600', flexShrink: 1, textAlign: 'left', lineHeight: 20 },
});

export default ForgotPasswordModal;
