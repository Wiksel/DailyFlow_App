import { useState, useCallback } from 'react';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendEmailVerification } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Alert } from 'react-native';
import { useErrorHandler } from './useErrorHandler';
import { useToast } from '../contexts/ToastContext';
import { createNewUserInFirestore, findUserEmailByIdentifier } from '../utils/authUtils';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { AuthStackParamList } from '../types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

interface UseAuthOptions {
  navigation?: AuthNavigationProp;
  onRefreshAuthState?: () => void;
}

export const useAuth = (options: UseAuthOptions = {}) => {
  const { navigation, onRefreshAuthState } = options;
  const auth = getAuth();
  const { handleAuthError } = useErrorHandler();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = useCallback(
    async (identifier: string, password: string) => {
      if (isLoading) return;
      
      if (!identifier.trim() || !password.trim()) {
        showToast('Wszystkie pola są wymagane.', 'error');
        return;
      }

      setIsLoading(true);
      try {
        const isEmail = /\S+@\S+\.\S+/.test(identifier.trim());
        let loginEmail = '';

        if (isEmail) {
          loginEmail = identifier.trim();
        } else {
          const foundEmail = await findUserEmailByIdentifier(identifier);
          if (!foundEmail) {
            showToast('Nie znaleziono użytkownika z tym numerem telefonu.', 'error');
            return;
          }
          loginEmail = foundEmail;
        }

        await signInWithEmailAndPassword(auth, loginEmail, password);
        const freshUser = auth.currentUser;

        if (freshUser && isEmail && !freshUser.emailVerified) {
          Alert.alert(
            'Konto niezweryfikowane',
            'Wygląda na to, że nie kliknąłeś jeszcze w link aktywacyjny.\n\nSprawdź swoją skrzynkę e-mail (również folder spam!).',
            [
              { text: 'OK', onPress: () => signOut(auth) },
              { text: 'Wyślij link ponownie', onPress: () => handleResendVerification(freshUser) },
            ],
          );
        }
      } catch (error: any) {
        handleAuthError(error);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, auth, handleAuthError, showToast],
  );

  const handleRegister = useCallback(
    async (nickname: string, email: string, password: string) => {
      if (!nickname.trim()) {
        showToast('Nick jest wymagany.', 'error');
        return;
      }

      setIsLoading(true);
      try {
        const userCredentials = await createUserWithEmailAndPassword(auth, email, password);
        await createNewUserInFirestore(userCredentials.user, nickname);
        await sendEmailVerification(userCredentials.user);
        await signOut(auth);

        Alert.alert(
          'Prawie gotowe!\nSprawdź swój e-mail',
          `Wysłaliśmy link weryfikacyjny na adres ${email}.\n\nKliknij go, aby dokończyć rejestrację, a następnie zaloguj się do aplikacji.`,
          [{ text: 'Rozumiem' }],
        );
      } catch (error: any) {
        handleAuthError(error);
      } finally {
        setIsLoading(false);
      }
    },
    [auth, handleAuthError, showToast],
  );

  const handleGoogleLogin = useCallback(async () => {
    setIsLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      const { idToken } = await GoogleSignin.getTokens();

      if (!idToken) {
        throw new Error('Brak tokena Google');
      }

      // Sprawdź czy użytkownik ma już profil w bazie
      const userDoc = await getDoc(doc(db, 'users', userInfo.user.id));
      if (!userDoc.exists() && navigation) {
        navigation.navigate('Nickname', { user: userInfo.user });
      }
    } catch (error: any) {
      if (error.code === '12501' || error.code === 'SIGN_IN_CANCELLED') {
        showToast('Logowanie anulowane.', 'info');
      } else {
        handleAuthError(error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigation, handleAuthError, showToast]);

  const handleResendVerification = useCallback(
    async (user: any) => {
      try {
        await sendEmailVerification(user);
        Alert.alert(
          'Link wysłany!',
          'Nowy link weryfikacyjny został wysłany na Twój adres e-mail.\n\nSprawdź swoją skrzynkę (również folder spam).',
        );
      } catch (error: any) {
        handleAuthError(error);
      }
    },
    [handleAuthError],
  );

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      onRefreshAuthState?.();
    } catch (error: any) {
      handleAuthError(error);
    }
  }, [auth, onRefreshAuthState, handleAuthError]);

  return {
    isLoading,
    handleLogin,
    handleRegister,
    handleGoogleLogin,
    handleResendVerification,
    handleLogout,
  };
};