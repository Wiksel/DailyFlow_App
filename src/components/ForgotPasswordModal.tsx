import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import LabeledInput from './LabeledInput';
import { getAuth, sendPasswordResetEmail } from '@react-native-firebase/auth';
import { useToast, ToastOverlay, ToastOverlaySuppressor } from '../contexts/ToastContext';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import { findUserEmailByIdentifier, mapFirebaseAuthErrorToMessage } from '../utils/authUtils';
import PhonePasswordResetModal from './PhonePasswordResetModal';
// removed unused Feather import

interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

const ForgotPasswordModal = ({ visible, onClose }: ForgotPasswordModalProps) => {
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPhoneReset, setShowPhoneReset] = useState(false);
  const { showToast: showCustomToast } = useToast();

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
      const { message, level } = mapFirebaseAuthErrorToMessage(String(error?.code || ''));
      showCustomToast(message, level);
      try { console.error('Błąd resetowania hasła:', error); } catch {}
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIdentifier('');
    setShowPhoneReset(false);
    onClose();
  };

  // getToastStyle removed – global ToastOverlay styles handle visuals

  return (
    <>
      <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={handleClose}>
         <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.75)' }] }>
           {/* Wyłącz globalny overlay na czas wyświetlania modala */}
           <ToastOverlaySuppressor />
            <View style={[styles.modalContent, { backgroundColor: '#111', borderColor: '#222', borderWidth: 1 }] }>
             
              <Text style={[styles.modalTitle, { color: '#fff' }]}>Zresetuj hasło</Text>
               <Text style={[styles.modalSubtitle, { color: '#bbb' }]}>Podaj swój e‑mail lub telefon, a wyślemy link do ustawienia hasła.</Text>
              <LabeledInput
                label="Identyfikator"
                placeholder="E‑mail lub telefon (9 cyfr)"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                editable={!isLoading}
                onSubmitEditing={handlePasswordReset}
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
    // lokalne style toast niepotrzebne – korzystamy z ToastOverlay
});

export default ForgotPasswordModal;
