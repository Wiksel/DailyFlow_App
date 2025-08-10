import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import auth, { getAuth, GoogleAuthProvider, EmailAuthProvider } from '@react-native-firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where, writeBatch, deleteField } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useToast } from '../contexts/ToastContext';
import ActionModal from '../components/ActionModal';
import { Colors, GlobalStyles, Spacing, Typography } from '../styles/AppStyles';
import PasswordInput from '../components/PasswordInput';

import { useRoute } from '@react-navigation/native';
import type { TaskStackParamList } from '../types/navigation';
import type { RouteProp } from '@react-navigation/native';

const AccountSettingsScreen = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<string[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState<null | 'password' | 'google.com' | 'phone'>(null);
  const user = getAuth().currentUser;
  const route = useRoute<RouteProp<TaskStackParamList, 'AccountSettings'>>();
  const [nickname, setNickname] = useState('');
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailChanging, setEmailChanging] = useState(false);
  const [passwordPromptVisible, setPasswordPromptVisible] = useState(false);
  const [passwordForReauth, setPasswordForReauth] = useState('');
  const [setPasswordEmail, setSetPasswordEmail] = useState('');
  const [setPasswordValue, setSetPasswordValue] = useState('');
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLinkingPassword, setIsLinkingPassword] = useState(false);
  const [preferences, setPreferences] = useState<{ theme?: 'system' | 'light' | 'dark'; language?: 'pl' | 'en' }>({});
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [isResendingPending, setIsResendingPending] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        await user.reload();
        const reloadUser = getAuth().currentUser!;
        const list = (reloadUser.providerData || []).map((p) => p.providerId);
        if (isMounted) setProviders(list);
      } catch (e) {
        // ignore
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    // Załaduj nick
    (async () => {
      try {
        if (!user) return;
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        const profileData = userDoc.data();
        if (isMounted) {
          setNickname(profileData?.nickname || '');
          setNewEmail(user?.email || '');
          setSetPasswordEmail(user?.email || '');
          setPreferences({
            theme: profileData?.preferences?.theme ?? 'system',
            language: profileData?.preferences?.language ?? 'pl',
          });
          const pending = profileData?.pendingEmail || null;
          setPendingEmail(pending);
          // Jeśli pendingEmail już stał się aktywnym e‑mailem – wyczyść go
          if (pending && user?.email && pending.toLowerCase() === user.email.toLowerCase()) {
            try { await updateDoc(userDocRef, { pendingEmail: deleteField() }); } catch {}
            setPendingEmail(null);
          }
        }
      } catch {}
    })();

    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (route?.params?.openDeleteConfirm) {
      setConfirmDeleteVisible(true);
    }
  }, [route?.params]);

  const hasGoogle = providers.includes(GoogleAuthProvider.PROVIDER_ID) || providers.includes('google.com');
  const hasPassword = providers.includes(EmailAuthProvider.PROVIDER_ID) || providers.includes('password');
  const hasPhone = !!user?.phoneNumber;
  const providerCount = (hasGoogle ? 1 : 0) + (hasPassword ? 1 : 0) + (hasPhone ? 1 : 0);

  const requireAtLeastOneProvider = () => providerCount <= 1;

  const reauthenticateWithPassword = async (password: string) => {
    if (!user || !user.email) throw new Error('Brak użytkownika lub e‑maila');
    const credential = EmailAuthProvider.credential(user.email, password);
    await user.reauthenticateWithCredential(credential);
  };

  const reauthenticateWithGoogle = async () => {
    if (!user) throw new Error('Brak użytkownika');
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // spróbuj bez dialogu najpierw
    let idToken: string | null = null;
    try { idToken = (await GoogleSignin.getTokens())?.idToken ?? null; } catch {}
    if (!idToken) {
      await GoogleSignin.signIn();
      idToken = (await GoogleSignin.getTokens())?.idToken ?? null;
    }
    if (!idToken) throw new Error('Brak tokena Google');
    const googleCred = GoogleAuthProvider.credential(idToken);
    await user.reauthenticateWithCredential(googleCred);
  };

  const linkGoogle = async () => {
    if (!user) return;
    setIsBusy(true);
    try {
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signIn();
      const idToken = (await GoogleSignin.getTokens())?.idToken;
      if (!idToken) throw new Error('Brak tokena Google');
      const googleCredential = GoogleAuthProvider.credential(idToken);
      await user.linkWithCredential(googleCredential);
      showToast('Konto Google zostało połączone.', 'success');
      await user.reload();
      setProviders((getAuth().currentUser?.providerData || []).map(p => p.providerId));
    } catch (e: any) {
      if (e?.code === 'auth/credential-already-in-use') {
        showToast('To konto Google jest już używane.', 'error');
      } else if (e?.code === '12501' || e?.message?.includes('Sign in action cancelled')) {
        showToast('Anulowano logowanie Google.', 'info');
      } else {
        showToast('Nie udało się połączyć konta Google.', 'error');
      }
    } finally {
      setIsBusy(false);
    }
  };

  const unlinkProvider = async (providerId: 'google.com' | 'password' | 'phone') => {
    if (!user) return;
    if (requireAtLeastOneProvider()) {
      showToast('Nie można odpiąć ostatniej metody logowania.', 'error');
      return;
    }
    setIsBusy(true);
    try {
      await user.unlink(providerId);
      showToast('Metoda logowania została odłączona.', 'success');
      await user.reload();
      setProviders((getAuth().currentUser?.providerData || []).map(p => p.providerId));
    } catch (e) {
      showToast('Nie udało się odłączyć metody logowania.', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const resendPendingEmail = async () => {
    if (!user || !pendingEmail) return;
    setIsResendingPending(true);
    try {
      const anyUser: any = user as any;
      if (typeof anyUser.verifyBeforeUpdateEmail === 'function') {
        await anyUser.verifyBeforeUpdateEmail(pendingEmail);
      } else {
        await user.updateEmail(pendingEmail);
        try { await user.sendEmailVerification(); } catch {}
      }
      showToast('Link weryfikacyjny został wysłany ponownie.', 'success');
    } catch (e: any) {
      if (e?.code === 'auth/requires-recent-login') {
        try {
          const hasGoogleProvider = (user.providerData || []).some(p => p.providerId === 'google.com');
          if (hasGoogleProvider) {
            await reauthenticateWithGoogle();
            const anyUser: any = user as any;
            if (typeof anyUser.verifyBeforeUpdateEmail === 'function') {
              await anyUser.verifyBeforeUpdateEmail(pendingEmail);
            } else {
              await user.updateEmail(pendingEmail);
              try { await user.sendEmailVerification(); } catch {}
            }
            showToast('Link weryfikacyjny został wysłany ponownie.', 'success');
          } else {
            showToast('Ta operacja wymaga ponownego zalogowania.', 'error');
          }
        } catch {
          showToast('Nie udało się ponownie uwierzytelnić.', 'error');
        }
      } else {
        showToast('Nie udało się wysłać linku weryfikacyjnego.', 'error');
      }
    } finally {
      setIsResendingPending(false);
    }
  };

  const checkPendingStatus = async () => {
    if (!user || !pendingEmail) return;
    try {
      await user.reload();
      const refreshed = getAuth().currentUser;
      const currentEmail = refreshed?.email || null;
      if (currentEmail && currentEmail.toLowerCase() === pendingEmail.toLowerCase()) {
        await updateDoc(doc(db, 'users', user.uid), { pendingEmail: deleteField() });
        setPendingEmail(null);
        setNewEmail(currentEmail);
        showToast('Nowy adres e‑mail został zweryfikowany i aktywny.', 'success');
      } else {
        showToast('Wciąż oczekuje na weryfikację.', 'info');
      }
    } catch {
      showToast('Nie udało się sprawdzić statusu.', 'error');
    }
  };

  const cancelPending = async () => {
    if (!user || !pendingEmail) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { pendingEmail: deleteField() });
      setPendingEmail(null);
      showToast('Anulowano oczekiwanie na weryfikację nowego e‑maila.', 'info');
    } catch {
      showToast('Nie udało się anulować.', 'error');
    }
  };

  const sendPasswordReset = async () => {
    if (!user?.email) {
      showToast('To konto nie ma e‑maila.', 'error');
      return;
    }
    setIsBusy(true);
    try {
      await auth().sendPasswordResetEmail(user.email);
      showToast('Wysłano wiadomość z linkiem do zmiany hasła.', 'success');
    } catch (e) {
      showToast('Nie udało się wysłać wiadomości resetującej.', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const deleteAccountData = async (uid: string) => {
    // Usuń dokument użytkownika oraz dane zależne: categories, tasks, pairs (zaproszenia/para)
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', uid);
    batch.delete(userRef);

    const categoriesSnap = await getDocs(query(collection(db, 'categories'), where('userId', '==', uid)));
    categoriesSnap.forEach((d) => batch.delete(doc(db, 'categories', d.id)));

    const tasksSnap = await getDocs(query(collection(db, 'tasks'), where('userId', '==', uid)));
    tasksSnap.forEach((d) => batch.delete(doc(db, 'tasks', d.id)));

    // pairs: usuń zaproszenia, a jeśli user był w parze aktywnej, to rozwiąż parę
    const pairsSnap = await getDocs(query(collection(db, 'pairs'), where('members', 'array-contains', uid)));
    pairsSnap.forEach((d) => batch.delete(doc(db, 'pairs', d.id)));

    await batch.commit();
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setConfirmDeleteVisible(false);
    setIsBusy(true);
    try {
      // Blokada: jeśli w parze – poproś o opuszczenie pary
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const pairId = userDoc.data()?.pairId;
      if (pairId) {
        showToast('Najpierw opuść parę w Profilu, a potem usuń konto.', 'error');
        return;
      }

      // Usuń dane w Firestore
      await deleteAccountData(user.uid);
      // Usuń konto w Auth
      await user.delete();
      showToast('Konto zostało usunięte.', 'success');
      try { await getAuth().signOut(); } catch {}
    } catch (e: any) {
      if (e?.code === 'auth/requires-recent-login') {
        showToast('Ta operacja wymaga ponownego logowania.', 'error');
      } else {
        showToast('Nie udało się usunąć konta.', 'error');
      }
    } finally {
      setIsBusy(false);
    }
  };

  if (loading) {
    return <View style={GlobalStyles.centered}><ActivityIndicator size="large" /></View>;
  }

  return (
    <ScrollView style={GlobalStyles.container}>
      {/* Modal: Zmień hasło */}
      <ActionModal
        visible={changePasswordVisible}
        title="Zmień hasło"
        actions={[
          { text: 'Anuluj', onPress: () => setChangePasswordVisible(false), variant: 'primary' },
          { text: 'Zapisz', onPress: async () => {
              if (!user) return;
              if (!/^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(newPassword)) { showToast('Hasło jest za słabe.', 'error'); return; }
              setIsBusy(true);
              try {
                if (!currentPassword || !user.email) { showToast('Podaj obecne hasło.', 'error'); setIsBusy(false); return; }
                await reauthenticateWithPassword(currentPassword);
                await user.updatePassword(newPassword);
                showToast('Hasło zostało zmienione.', 'success');
                setChangePasswordVisible(false);
                setCurrentPassword('');
                setNewPassword('');
              } catch (e: any) {
                if (e?.code === 'auth/wrong-password' || e?.code === 'auth/invalid-credential') showToast('Nieprawidłowe obecne hasło.', 'error');
                else if (e?.code === 'auth/requires-recent-login') showToast('Wymagane ponowne zalogowanie.', 'error');
                else showToast('Nie udało się zmienić hasła.', 'error');
              } finally {
                setIsBusy(false);
              }
            }
          }
        ]}
        onRequestClose={() => setChangePasswordVisible(false)}
      >
        <PasswordInput value={currentPassword} onChangeText={setCurrentPassword} placeholder="Obecne hasło" />
        <PasswordInput value={newPassword} onChangeText={setNewPassword} placeholder="Nowe hasło (min. 6, litera, cyfra)" />
      </ActionModal>
      <View style={GlobalStyles.section}>
        <Text style={styles.sectionTitle}>Zmień Nick</Text>
        <TextInput
          style={GlobalStyles.input}
          placeholder="Wpisz swój nick"
          value={nickname}
          onChangeText={setNickname}
          editable={!isSavingNickname}
        />
        <TouchableOpacity style={[GlobalStyles.button, { marginTop: Spacing.small }]} onPress={async () => {
          if (!user || !nickname.trim() || isSavingNickname) return;
          setIsSavingNickname(true);
          try {
            await updateDoc(doc(db, 'users', user.uid), { nickname: nickname.trim() });
            showToast('Twój nick został zaktualizowany.', 'success');
          } catch {
            showToast('Wystąpił błąd podczas zapisu nicku.', 'error');
          } finally {
            setIsSavingNickname(false);
          }
        }}>
          <Text style={GlobalStyles.buttonText}>{isSavingNickname ? 'Zapisywanie…' : 'Zapisz nick'}</Text>
        </TouchableOpacity>
      </View>

      <View style={GlobalStyles.section}>
        <Text style={styles.sectionTitle}>Logowanie i bezpieczeństwo</Text>
        <View style={styles.row}>
          <Text style={styles.label}>E‑mail i hasło</Text>
          {hasPassword ? (
            <>
              <TouchableOpacity style={[GlobalStyles.button, styles.secondary]} onPress={() => setChangePasswordVisible(true)} disabled={isBusy}>
                <Text style={GlobalStyles.buttonText}>Zmień hasło</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[GlobalStyles.button, styles.danger, { marginTop: Spacing.small }]} onPress={() => setConfirmUnlink('password')} disabled={isBusy || requireAtLeastOneProvider()}>
                <Text style={GlobalStyles.buttonText}>Odłącz</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View>
              <Text style={[styles.label, { marginTop: 0 }]}>Dodaj e‑mail i hasło</Text>
              <TextInput style={GlobalStyles.input} placeholder="Adres e‑mail" autoCapitalize="none" value={setPasswordEmail} onChangeText={setSetPasswordEmail} editable={!isLinkingPassword} />
              <PasswordInput value={setPasswordValue} onChangeText={setSetPasswordValue} placeholder="Hasło (min. 6, litera, cyfra)" />
              <TouchableOpacity style={[GlobalStyles.button, { marginTop: Spacing.small }]} disabled={isLinkingPassword} onPress={async () => {
                if (!user) return;
                if (!/\S+@\S+\.\S+/.test(setPasswordEmail)) { showToast('Podaj poprawny e‑mail.', 'error'); return; }
                if (!/^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(setPasswordValue)) { showToast('Hasło jest za słabe.', 'error'); return; }
                setIsLinkingPassword(true);
                try {
                  // Nie aktualizujemy e‑maila bezpośrednio tutaj; linkowanie poświadczeń ustawi e‑mail automatycznie
                  // Jeśli user ma już provider password to ustaw hasło, inaczej linkuj
                  const hasPasswordProvider = (user.providerData || []).some(p => p.providerId === 'password');
                  if (hasPasswordProvider) {
                    try {
                      await user.updatePassword(setPasswordValue);
                    } catch (e: any) {
                      if (e?.code === 'auth/requires-recent-login') {
                        const hasGoogle = (user.providerData || []).some(p => p.providerId === 'google.com');
                        if (hasGoogle) {
                          await reauthenticateWithGoogle();
                          await user.updatePassword(setPasswordValue);
                        } else {
                          throw e;
                        }
                      } else {
                        throw e;
                      }
                    }
                  } else {
                    const cred = EmailAuthProvider.credential(setPasswordEmail, setPasswordValue);
                    try {
                      await user.linkWithCredential(cred);
                    } catch (e: any) {
                      if (e?.code === 'auth/credential-already-in-use') {
                        showToast('Ten e‑mail jest już połączony z innym kontem.', 'error');
                        throw e;
                      }
                      if (e?.code === 'auth/requires-recent-login') {
                        const hasGoogle = (user.providerData || []).some(p => p.providerId === 'google.com');
                        if (hasGoogle) {
                          await reauthenticateWithGoogle();
                          await user.linkWithCredential(cred);
                        } else {
                          throw e;
                        }
                      } else {
                        throw e;
                      }
                    }
                  }
                  showToast('Dodano e‑mail i hasło do konta.', 'success');
                  await user.reload();
                  setProviders((getAuth().currentUser?.providerData || []).map(p => p.providerId));
                } catch (e: any) {
                  if (e?.code === 'auth/email-already-in-use') showToast('Ten e‑mail jest już używany.', 'error');
                  else if (e?.code === 'auth/invalid-credential') showToast('Nieprawidłowe dane logowania.', 'error');
                  else if (e?.code === 'auth/operation-not-allowed') showToast('Operacja niedozwolona dla tego konta.', 'error');
                  else if (e?.code === 'auth/provider-already-linked') showToast('Ta metoda jest już połączona.', 'info');
                  else if (e?.code === 'auth/requires-recent-login') showToast('Wymagane ponowne zalogowanie.', 'error');
                  else showToast('Nie udało się dodać e‑maila/hasła.', 'error');
                } finally {
                  setIsLinkingPassword(false);
                }
              }}>
                <Text style={GlobalStyles.buttonText}>{isLinkingPassword ? 'Zapisywanie…' : 'Dodaj'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Google</Text>
          {hasGoogle ? (
            <TouchableOpacity style={[GlobalStyles.button, styles.danger]} onPress={() => setConfirmUnlink('google.com')} disabled={isBusy || requireAtLeastOneProvider()}>
              <Text style={GlobalStyles.buttonText}>Odłącz Google</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={GlobalStyles.button} onPress={linkGoogle} disabled={isBusy}>
              <Text style={GlobalStyles.buttonText}>Połącz z Google</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Telefon</Text>
          {hasPhone ? (
            <TouchableOpacity style={[GlobalStyles.button, styles.danger]} onPress={() => unlinkProvider('phone')} disabled={isBusy || requireAtLeastOneProvider()}>
              <Text style={GlobalStyles.buttonText}>Odłącz telefon</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={GlobalStyles.button} onPress={() => showToast('Dodaj telefon przy logowaniu/rejestracji.', 'info')} disabled={isBusy}>
              <Text style={GlobalStyles.buttonText}>Brak – dodaj</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={GlobalStyles.section}>
        <Text style={styles.sectionTitle}>Zmień e‑mail</Text>
        <TextInput style={GlobalStyles.input} placeholder="Nowy adres e‑mail" autoCapitalize="none" value={newEmail} onChangeText={setNewEmail} editable={!emailChanging} />
          {pendingEmail && pendingEmail !== user?.email ? (
            <View style={{ marginTop: Spacing.small }}>
              <Text style={styles.label}>Oczekuje na weryfikację: {pendingEmail}</Text>
              <View style={styles.pendingActions}>
                <TouchableOpacity style={[GlobalStyles.button, styles.compactButton, styles.secondary]} onPress={resendPendingEmail} disabled={emailChanging || isResendingPending}>
                  <Text style={[GlobalStyles.buttonText, styles.compactButtonText]} numberOfLines={1} ellipsizeMode="tail">{isResendingPending ? 'Wysyłanie…' : 'Wyślij ponownie'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[GlobalStyles.button, styles.compactButton]} onPress={checkPendingStatus} disabled={emailChanging}>
                  <Text style={[GlobalStyles.buttonText, styles.compactButtonText]} numberOfLines={1} ellipsizeMode="tail">Sprawdź status</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[GlobalStyles.button, styles.compactButton, styles.danger]} onPress={cancelPending} disabled={emailChanging}>
                  <Text style={[GlobalStyles.buttonText, styles.compactButtonText]} numberOfLines={1} ellipsizeMode="tail">Anuluj</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
          <TouchableOpacity style={[GlobalStyles.button, { marginTop: Spacing.small }]} disabled={emailChanging} onPress={async () => {
          if (!user) return;
          if (!/\S+@\S+\.\S+/.test(newEmail)) { showToast('Podaj poprawny e‑mail.', 'error'); return; }
          setEmailChanging(true);
          try {
            // Jeśli user ma hasło -> wymagaj reautoryzacji hasłem lub przez Google
            const hasPasswordProvider = (user.providerData || []).some(p => p.providerId === 'password');
            if (hasPasswordProvider && !passwordPromptVisible) {
              setPasswordPromptVisible(true);
              setEmailChanging(false);
              return;
            }
              try {
                const anyUser: any = user as any;
                if (typeof anyUser.verifyBeforeUpdateEmail === 'function') {
                  await anyUser.verifyBeforeUpdateEmail(newEmail);
                } else {
                  await user.updateEmail(newEmail);
                  try { await user.sendEmailVerification(); } catch {}
                }
              } catch (err: any) {
                if (err?.code === 'auth/requires-recent-login') {
                  const hasGoogleProvider = (user.providerData || []).some(p => p.providerId === 'google.com');
                  if (hasGoogleProvider) {
                    await reauthenticateWithGoogle();
                    const anyUser2: any = user as any;
                    if (typeof anyUser2.verifyBeforeUpdateEmail === 'function') {
                      await anyUser2.verifyBeforeUpdateEmail(newEmail);
                    } else {
                      await user.updateEmail(newEmail);
                      try { await user.sendEmailVerification(); } catch {}
                    }
                  } else {
                    throw err;
                  }
                } else {
                  throw err;
                }
              }
              try { await updateDoc(doc(db, 'users', user.uid), { pendingEmail: newEmail }); setPendingEmail(newEmail); } catch {}
              showToast('Wysłaliśmy link weryfikacyjny. Zmiana e‑maila nastąpi po potwierdzeniu.', 'success');
          } catch (e: any) {
              if (e?.code === 'auth/requires-recent-login') {
                setPasswordPromptVisible(true);
              } else if (e?.code === 'auth/email-already-in-use') {
              showToast('Ten e‑mail jest już używany.', 'error');
            } else {
              showToast('Nie udało się zmienić e‑maila.', 'error');
            }
          } finally {
            setEmailChanging(false);
          }
        }}>
          <Text style={GlobalStyles.buttonText}>{emailChanging ? 'Zapisywanie…' : 'Zmień e‑mail'}</Text>
        </TouchableOpacity>
      </View>

      <ActionModal
        visible={passwordPromptVisible}
        title="Wymagana ponowna autoryzacja"
        actions={[
          { text: 'Anuluj', onPress: () => setPasswordPromptVisible(false), variant: 'primary' },
          { text: 'Potwierdź', onPress: async () => {
              if (!user || !user.email) return;
              try {
                await reauthenticateWithPassword(passwordForReauth);
                const anyUser3: any = user as any;
                if (typeof anyUser3.verifyBeforeUpdateEmail === 'function') {
                  await anyUser3.verifyBeforeUpdateEmail(newEmail);
                } else {
                  await user.updateEmail(newEmail);
                  try { await user.sendEmailVerification(); } catch {}
                }
                try { await updateDoc(doc(db, 'users', user.uid), { pendingEmail: newEmail }); setPendingEmail(newEmail); } catch {}
                showToast('Wysłaliśmy link weryfikacyjny. Zmiana e‑maila nastąpi po potwierdzeniu.', 'success');
                setPasswordPromptVisible(false);
                setPasswordForReauth('');
              } catch {
                showToast('Nie udało się ponownie uwierzytelnić.', 'error');
              }
            }
          }
        ]}
        onRequestClose={() => setPasswordPromptVisible(false)}
      >
        <PasswordInput value={passwordForReauth} onChangeText={setPasswordForReauth} placeholder="Hasło do konta" />
      </ActionModal>

      <View style={GlobalStyles.section}>
        <Text style={styles.sectionTitle}>Preferencje</Text>
        <Text style={styles.label}>Motyw</Text>
        <View style={styles.actionsRow}>
          {(['system','light','dark'] as const).map(mode => (
            <TouchableOpacity key={mode} style={[GlobalStyles.button, preferences.theme === mode && styles.secondary]} onPress={async () => {
              setPreferences(prev => ({ ...prev, theme: mode }));
              if (user) await updateDoc(doc(db, 'users', user.uid), { preferences: { ...(preferences||{}), theme: mode } });
            }}>
              <Text style={GlobalStyles.buttonText}>{mode === 'system' ? 'System' : mode === 'light' ? 'Jasny' : 'Ciemny'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.label, { marginTop: Spacing.medium }]}>Język</Text>
        <View style={styles.actionsRow}>
          {(['pl','en'] as const).map(lng => (
            <TouchableOpacity key={lng} style={[GlobalStyles.button, preferences.language === lng && styles.secondary]} onPress={async () => {
              setPreferences(prev => ({ ...prev, language: lng }));
              if (user) await updateDoc(doc(db, 'users', user.uid), { preferences: { ...(preferences||{}), language: lng } });
            }}>
              <Text style={GlobalStyles.buttonText}>{lng === 'pl' ? 'Polski' : 'English'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={GlobalStyles.section}>
        <Text style={styles.sectionTitle}>Zarządzanie kontem</Text>
        <TouchableOpacity style={[GlobalStyles.button, styles.danger]} onPress={() => setConfirmDeleteVisible(true)} disabled={isBusy}>
          <Text style={GlobalStyles.buttonText}>Usuń konto</Text>
        </TouchableOpacity>
      </View>

      <ActionModal
        visible={confirmDeleteVisible}
        title="Usunąć konto?"
        message={'Tej operacji nie można cofnąć. Zostaną usunięte wszystkie Twoje dane.'}
        actions={[
          { text: 'Anuluj', onPress: () => setConfirmDeleteVisible(false), variant: 'primary' },
          { text: 'Usuń', onPress: handleDeleteAccount, variant: 'danger' },
        ]}
        onRequestClose={() => setConfirmDeleteVisible(false)}
      />

      <ActionModal
        visible={!!confirmUnlink}
        title="Odłączyć metodę logowania?"
        message={'Po odłączeniu możesz utracić dostęp, jeśli nie masz innej metody logowania.'}
        actions={[
          { text: 'Anuluj', onPress: () => setConfirmUnlink(null), variant: 'primary' },
          { text: 'Odłącz', onPress: () => { if (confirmUnlink) unlinkProvider(confirmUnlink); setConfirmUnlink(null); }, variant: 'danger' },
        ]}
        onRequestClose={() => setConfirmUnlink(null)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  sectionTitle: { ...Typography.h3, marginBottom: Spacing.small },
  row: { marginTop: Spacing.medium },
  label: { ...Typography.body, marginBottom: Spacing.small },
  actionsRow: { flexDirection: 'row', gap: Spacing.small },
  pendingActions: {
    marginTop: Spacing.small,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.small,
  },
  compactButton: {
    paddingVertical: Spacing.small,
    paddingHorizontal: Spacing.medium,
    minHeight: 40,
    flexGrow: 1,
    minWidth: 0,
  },
  compactButtonText: {
    fontSize: Typography.small.fontSize,
  },
  secondary: { backgroundColor: Colors.secondary },
  danger: { backgroundColor: Colors.danger },
});

export default AccountSettingsScreen;


