import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import auth, { getAuth, sendPasswordResetEmail } from '@react-native-firebase/auth';
import { useToast, ToastOverlay, ToastOverlaySuppressor } from '../contexts/ToastContext';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import { findUserEmailByIdentifier } from '../utils/authUtils';
import PhonePasswordResetModal from './PhonePasswordResetModal';
import { Feather } from '@expo/vector-icons';

interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

const ForgotPasswordModal = ({ visible, onClose }: ForgotPasswordModalProps) => {
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPhoneReset, setShowPhoneReset] = useState(false);
  const { showToast } = useToast();
  
  const showCustomToast = useToast().showToast;

  const handlePasswordReset = async () => {
    if (!identifier.trim()) {
      showCustomToast('Proszę wprowadzić e‑mail lub telefon.', 'error');
      return;
    }
    
    setIsLoading(true);
    try {
      // Sprawdź, czy użytkownik istnieje i pobierz jego e-mail
      const email = await findUserEmailByIdentifier(identifier.trim());
      
      if (!email) {
        showCustomToast('Nie znaleziono użytkownika.', 'error');
        setIsLoading(false);
        return;
      }

      await sendPasswordResetEmail(getAuth(), email);
      showCustomToast('Wysłaliśmy link do zresetowania hasła na adres powiązany z Twoim kontem. Sprawdź również folder spam.', 'success');
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error: any) {
      // Błędy z `findUserEmailByIdentifier` będą tu obsługiwane
      if (error.code === 'auth/user-not-found') {
        showCustomToast('Nie znaleziono użytkownika.', 'error');
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
    setShowPhoneReset(false);
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
      <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={handleClose}>
         <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.75)' }] }>
           {/* Wyłącz globalny overlay na czas wyświetlania modala */}
           <ToastOverlaySuppressor />
            <View style={[styles.modalContent, { backgroundColor: '#111', borderColor: '#222', borderWidth: 1 }] }>
             
              <Text style={[styles.modalTitle, { color: '#fff' }]}>Zresetuj hasło</Text>
               <Text style={[styles.modalSubtitle, { color: '#bbb' }]}>Podaj swój e‑mail lub telefon, a wyślemy link do ustawienia hasła.</Text>
              <TextInput
               style={[GlobalStyles.input, { color: '#fff', backgroundColor: 'transparent', borderColor: '#333' }]}
                placeholder="E‑mail lub telefon (9 cyfr)"
               value={identifier}
               onChangeText={setIdentifier}
               autoCapitalize="none"
               editable={!isLoading}
               placeholderTextColor={Colors.placeholder}
             />
              <TouchableOpacity
               style={[GlobalStyles.button, { marginTop: Spacing.medium, width: '100%' }]}
               onPress={async () => { try { const m = await import('expo-haptics'); await m.impactAsync(m.ImpactFeedbackStyle.Medium); } catch {}; handlePasswordReset(); }}
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
               onPress={async () => { try { const m = await import('expo-haptics'); await m.selectionAsync(); } catch {}; setShowPhoneReset(true); }}
               disabled={isLoading}
              >
               <Text style={GlobalStyles.buttonText}>Resetuj przez telefon</Text>
             </TouchableOpacity>
             
              <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
               <Text style={[styles.cancelButtonText, { color: '#bbb' }]}>Anuluj</Text>
             </TouchableOpacity>
           </View>
           {/* Lokalny ToastOverlay – wyżej, ale w granicach ekranu */}
           <ToastOverlay topOffset={-Spacing.large} />
         </View>
       </Modal>
      
      <PhonePasswordResetModal 
        visible={showPhoneReset} 
        onClose={() => setShowPhoneReset(false)} 
        onSuccess={() => { 
          // Zamknij również nadrzędne okno "Zresetuj hasło" po pomyślnej zmianie hasła przez telefon
          setShowPhoneReset(false);
          onClose();
        }}
      />
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
    toastContainer: { position: 'absolute', top: -155, left: Spacing.medium, right: Spacing.medium, padding: Spacing.medium, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', elevation: 10, zIndex: 9999 },
    toastIcon: { marginRight: Spacing.medium },
    toastText: { ...Typography.body, color: 'white', fontWeight: '600', flexShrink: 1 },
});

export default ForgotPasswordModal;
