import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import LabeledInput from '../components/LabeledInput';
import { getAuth } from '@react-native-firebase/auth';
import { useToast } from '../contexts/ToastContext';
import { createNewUserInFirestore } from '../utils/authUtils';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import { useTheme } from '../contexts/ThemeContext';

interface NicknameScreenProps { onProfileCreated: () => void; }

const NicknameScreen = ({ onProfileCreated }: NicknameScreenProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [nickname, setNickname] = useState('');
  const { showToast } = useToast();
  const theme = useTheme();

  const handleFinish = async () => {
    const user = getAuth().currentUser;
    if (!nickname.trim() || !user) {
      showToast('Nick nie może być pusty.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await createNewUserInFirestore(user, nickname);
      showToast('Konto pomyślnie utworzone!', 'success');
      onProfileCreated(); // Powiadom AppNavigator o zakończeniu
    } catch (error: any) {
      showToast(`Błąd finalizacji rejestracji: ${error.message}`, 'error');
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <ScrollView contentContainerStyle={styles.scrollContentContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
            <Image source={require('../../assets/icon.png')} style={styles.logo} />
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Witaj w DailyFlow!</Text>
            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>Wybierz swój nick, który będzie widoczny w aplikacji.</Text>
            <LabeledInput label="Nick" placeholder="Twój Nick" value={nickname} onChangeText={setNickname} editable={!isLoading} />
            <TouchableOpacity
                style={[GlobalStyles.button, { marginTop: Spacing.medium, width: '100%', backgroundColor: theme.colors.primary }]}
                onPress={async () => { try { const m = await import('expo-haptics'); await m.impactAsync(m.ImpactFeedbackStyle.Medium); } catch {}; handleFinish(); }}
                disabled={isLoading}
            >
                {isLoading ? <ActivityIndicator color="white" /> : <Text style={GlobalStyles.buttonText}>Zaczynajmy!</Text>}
            </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.backgroundLight },
    scrollContentContainer: { flexGrow: 1, justifyContent: 'center' },
    content: { alignItems: 'center', padding: Spacing.xLarge },
    logo: { width: 100, height: 100, marginBottom: Spacing.large },
    modalTitle: { ...Typography.h2, textAlign: 'center', marginBottom: Spacing.small },
    modalSubtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.large },
});

export default NicknameScreen;