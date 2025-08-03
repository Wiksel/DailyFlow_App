import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { useToast } from '../contexts/ToastContext';
import { createNewUserInFirestore } from '../utils/authUtils';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';

interface NicknameScreenProps {
  user: FirebaseAuthTypes.User | null;
  onProfileCreated: () => void;
}

const NicknameScreen = ({ user, onProfileCreated }: NicknameScreenProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [nickname, setNickname] = useState(user?.displayName || '');
  const { showToast } = useToast();

  const handleFinish = async () => {
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
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContentContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
            <Image source={require('../../assets/icon.png')} style={styles.logo} />
            <Text style={styles.modalTitle}>Witaj w DailyFlow!</Text>
            <Text style={styles.modalSubtitle}>Wybierz swój nick, który będzie widoczny w aplikacji.</Text>
            <TextInput
                style={[GlobalStyles.input, {textAlign: 'center'}]}
                placeholder="Twój Nick"
                value={nickname}
                onChangeText={setNickname}
                editable={!isLoading}
            />
            <TouchableOpacity
                style={[GlobalStyles.button, { marginTop: Spacing.medium, width: '100%' }]}
                onPress={handleFinish}
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