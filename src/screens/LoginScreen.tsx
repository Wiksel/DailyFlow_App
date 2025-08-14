import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Image, Dimensions, ScrollView, Platform, Keyboard } from 'react-native';
import LabeledInput from '../components/LabeledInput';
import { useNavigation } from '@react-navigation/native';
import auth, { FirebaseAuthTypes, getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useToast } from '../contexts/ToastContext';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import { isStrongPassword } from '../utils/validation';
import { useTheme } from '../contexts/ThemeContext';
import { Feather } from '@expo/vector-icons';
import ActionModal from '../components/ActionModal';
import LinkAccountsModal from '../components/LinkAccountsModal';
import PhoneAuthModal from '../components/PhoneAuthModal';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import { createNewUserInFirestore, findUserEmailByIdentifier, popSuggestedLoginIdentifier, setSuggestedLoginIdentifier, upsertAuthProvidersForUser, mapFirebaseAuthErrorToMessage } from '../utils/authUtils';
import { AuthStackParamList } from '../types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { doc, getDoc, collection, query, where, getDocs, limit } from '../utils/firestoreCompat';
import { db } from '../../firebaseConfig';
import PasswordInput from '../components/PasswordInput';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolateColor, interpolate, useAnimatedReaction } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

type LoginNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FORM_CONTAINER_WIDTH = SCREEN_WIDTH - 2 * Spacing.xLarge;
const SPRING_CONFIG = { damping: 20, stiffness: 150, mass: 1 };

// Komponenty formularzy (bez zmian)
const LoginForm = React.memo(({ identifier, setIdentifier, loginPassword, setLoginPassword, isLoading, handleLogin, setForgotPasswordModalVisible, onGoogleButtonPress, theme }: any) => (
    <View style={styles.formInnerContainer}>
        <LabeledInput label="Identyfikator" placeholder="E-mail lub telefon (9 cyfr)" value={identifier} onChangeText={setIdentifier} autoCapitalize="none" editable={!isLoading} />
        <PasswordInput
            placeholder="Hasło"
            value={loginPassword}
            onChangeText={setLoginPassword}
            editable={!isLoading}
            containerStyle={{marginTop: Spacing.small}}
        />
        <TouchableOpacity style={styles.forgotPasswordButton} onPress={() => setForgotPasswordModalVisible(true)}>
            <Text style={[styles.forgotPasswordText, { color: theme.colors.primary }]}>Zapomniałem hasła</Text>
        </TouchableOpacity>
            <TouchableOpacity style={[GlobalStyles.button, styles.buttonMarginTop]} onPress={async () => { try { const m = await import('expo-haptics'); await m.impactAsync(m.ImpactFeedbackStyle.Medium); } catch {}; handleLogin(); }} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="white" /> : <Text style={GlobalStyles.buttonText}>Zaloguj się</Text>}
        </TouchableOpacity>
        <View style={styles.dividerContainer}>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} /><Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>lub</Text><View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
        </View>
        <TouchableOpacity style={[styles.socialButton, isLoading && styles.disabledGoogleButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]} onPress={onGoogleButtonPress} disabled={isLoading} >
            {isLoading ? <ActivityIndicator color={theme.colors.primary} /> : (
                <>
                    <Image source={require('../../assets/google-icon.png')} style={styles.socialIcon} />
                    <Text style={[styles.socialButtonText, { color: theme.colors.textPrimary }]}>Zaloguj się z Google</Text>
                </>
            )}
        </TouchableOpacity>
    </View>
));

const RegisterForm = React.memo(({ registerData, handleRegisterDataChange, emailError, passwordError, validateEmail, validatePassword, isLoading, isRegisterFormValid, handleRegister, onGoogleButtonPress, setPhoneModalVisible, theme }: any) => (
    <View style={styles.formInnerContainer}>
        <View style={styles.inputWrapper}>
            <LabeledInput label="Nick" placeholder="Twój Nick" value={registerData.nickname} onChangeText={(val: string) => handleRegisterDataChange('nickname', val)} editable={!isLoading} />
        </View>
        <View style={styles.inputWrapper}>
            <LabeledInput
                label="Adres e-mail"
                value={registerData.email}
                onChangeText={(val: string) => handleRegisterDataChange('email', val)}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
                onBlur={() => validateEmail(registerData.email)}
                containerStyle={emailError ? styles.inputError : undefined}
            />
            {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}
        </View>
        <View style={styles.inputWrapper}>
            <PasswordInput
                value={registerData.password}
                onChangeText={(val: string) => handleRegisterDataChange('password', val)}
                editable={!isLoading}
                containerStyle={passwordError ? styles.inputError : {}}
                onBlur={() => validatePassword(registerData.password)}
                placeholder="Hasło (min. 6, litera, cyfra)"
            />
            {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
        </View>
            <TouchableOpacity
            style={[GlobalStyles.button, styles.buttonMarginTop, (isLoading || !isRegisterFormValid) && GlobalStyles.disabledButton]}
              onPress={async () => { if (isLoading || !isRegisterFormValid) return; try { const m = await import('expo-haptics'); await m.selectionAsync(); } catch {}; handleRegister(); }}
            disabled={isLoading || !isRegisterFormValid}
        >
            {isLoading ? <ActivityIndicator color="white" /> : <Text style={GlobalStyles.buttonText}>Stwórz konto</Text>}
        </TouchableOpacity>
        <View style={styles.dividerContainer}>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} /><Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>lub</Text><View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
        </View>
        <View style={styles.socialButtonsContainer}>
            <TouchableOpacity style={[styles.socialButton, styles.socialButtonHalf, isLoading && styles.disabledGoogleButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]} onPress={onGoogleButtonPress} disabled={isLoading} >
                {isLoading ? <ActivityIndicator color={theme.colors.primary} /> : (
                    <>
                        <Image source={require('../../assets/google-icon.png')} style={styles.socialIcon} />
                        <Text style={[styles.socialButtonText, { color: theme.colors.textPrimary }]}>Google</Text>
                    </>
                )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialButton, styles.socialButtonHalf, isLoading && styles.disabledGoogleButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]} onPress={() => setPhoneModalVisible(true)} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color={theme.colors.primary} /> : (
                    <>
                        <Feather name="phone" size={18} color={theme.colors.textPrimary} style={styles.socialIcon} />
                        <Text style={[styles.socialButtonText, { color: theme.colors.textPrimary }]}>Telefon</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    </View>
));


const LoginScreen = () => {
    const navigation = useNavigation<LoginNavigationProp>();
    const theme = useTheme();
    
    const [identifier, setIdentifier] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [registerData, setRegisterData] = useState({ nickname: '', email: '', password: '' });
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { showToast } = useToast();
    
    const [unverifiedDialogVisible, setUnverifiedDialogVisible] = useState(false);
    const [pendingVerificationUserEmail, setPendingVerificationUserEmail] = useState<string | null>(null);
    const [emailVerificationDialogVisible, setEmailVerificationDialogVisible] = useState(false);
    const [emailVerificationUser, setEmailVerificationUser] = useState<FirebaseAuthTypes.User | null>(null);
    const [linkModalVisible, setLinkModalVisible] = useState(false);
    const [linkEmail, setLinkEmail] = useState('');
    const [pendingGoogleCredential, setPendingGoogleCredential] = useState<any>(null);
    const [phoneModalVisible, setPhoneModalVisible] = useState(false);
    const [loginSuggestionVisible, setLoginSuggestionVisible] = useState(false);
    const [loginSuggestionEmail, setLoginSuggestionEmail] = useState<string>('');
    const [loginSuggestionHasPassword, setLoginSuggestionHasPassword] = useState(false);
    const [loginSuggestionHasGoogle, setLoginSuggestionHasGoogle] = useState(false);
    const [loginSuggestionHasPhone, setLoginSuggestionHasPhone] = useState(false);
    const [forgotPasswordModalVisible, setForgotPasswordModalVisible] = useState(false);
    
    const progress = useSharedValue(0);
    const swipeDirection = useSharedValue(1);
    const targetProgress = useSharedValue(0);
    const isTransitioning = useSharedValue(false);
    const keyboardProgress = useSharedValue(0);
    
    const KEYBOARD_UP_TRANSLATE_Y = -100; // Przywrócenie poprawnej wartości
    const HEADER_HEIGHT_ESTIMATE = 130;
    const HEADER_MARGIN_BOTTOM = Spacing.xLarge;

    const isEmailValidCheck = (email: string) => /\S+@\S+\.\S+/.test(email);
    const isPasswordValidCheck = (password: string) => isStrongPassword(password);

    const handleRegisterDataChange = (name: keyof typeof registerData, value: string) => {
        setRegisterData((prevState) => ({ ...prevState, [name]: value }));
        if (name === 'email') {
            if (isEmailValidCheck(value)) {
                setEmailError('');
            }
        }
        if (name === 'password') {
            if (isPasswordValidCheck(value)) {
                setPasswordError('');
            }
        }
    };
    const validateEmail = (email: string) => {
        if (!email.trim() || !isEmailValidCheck(email)) {
            setEmailError('Proszę podać poprawny adres e-mail.');
            return false;
        }
        setEmailError('');
        return true;
    };
    const validatePassword = (password: string) => {
        if (!password.trim() || !isPasswordValidCheck(password)) {
            setPasswordError('Hasło jest za słabe.');
            return false;
        }
        setPasswordError('');
        return true;
    };
    const openLoginSuggestion = async (email: string, methods: string[] | null) => {
        const normalizedEmail = (email || '').trim().toLowerCase();
        setLoginSuggestionEmail(normalizedEmail);
        let resolvedMethods: string[] = Array.isArray(methods) ? methods : [];
        if (!methods) {
            try { resolvedMethods = await auth().fetchSignInMethodsForEmail(normalizedEmail); } catch { resolvedMethods = []; }
            // Dodatkowy fallback: jeśli aktualny użytkownik Google w urządzeniu ma ten sam e‑mail, zaznacz Google
            try {
                const current = await GoogleSignin.getCurrentUser();
                if (current?.user?.email?.toLowerCase() === normalizedEmail && !resolvedMethods.includes('google.com')) {
                    resolvedMethods.push('google.com');
                }
            } catch {}
        }
        let hasPassword = !!resolvedMethods?.includes('password');
        let hasGoogle = !!resolvedMethods?.includes('google.com');
        let hasPhone = false;
        try {
            let snap = await getDocs(query(collection(db, 'users'), where('emailLower', '==', normalizedEmail), limit(1)) as any);
            if (!snap || snap.docs.length === 0) {
                snap = await getDocs(query(collection(db, 'users'), where('email', '==', normalizedEmail), limit(1)) as any);
            }
            const data = snap.docs[0]?.data() as any;
            hasPhone = !!data?.phoneNumber;
            if (data?.authProviders) {
                hasGoogle = hasGoogle || !!data.authProviders.google;
                hasPassword = hasPassword || !!data.authProviders.password;
            }
        } catch {}
        setLoginSuggestionHasPassword(hasPassword);
        setLoginSuggestionHasGoogle(hasGoogle);
        setLoginSuggestionHasPhone(hasPhone);
        setLoginSuggestionVisible(true);
    };

    const handleAuthError = (error: any) => {
        const code = String(error?.code || '');
        if (code === 'auth/email-already-in-use') {
            const email = registerData.email || identifier;
            openLoginSuggestion(email, null).catch(() => {});
            return;
        }
        const { message, level } = mapFirebaseAuthErrorToMessage(code);
        showToast(message, level);
    };
    const handleResendVerification = async (user: FirebaseAuthTypes.User) => { try { await user.sendEmailVerification(); showToast('Nowy link weryfikacyjny został wysłany. Sprawdź skrzynkę (także spam).', 'success'); } catch (error: any) { handleAuthError(error); } };
    const handleLogin = async () => { 
        if (isLoading) return; // Zapobiegaj wielokrotnemu wywoływaniu
        if (!identifier.trim() || !loginPassword.trim()) { 
            showToast('Wszystkie pola są wymagane.', 'error'); 
            return; 
        } 
        setIsLoading(true); 
        try { 
            const resolvedIdentifier = await findUserEmailByIdentifier(identifier); 
            const userCredentials = await signInWithEmailAndPassword(getAuth(), resolvedIdentifier || identifier, loginPassword); 
            await userCredentials.user.reload(); 
            const freshUser = getAuth().currentUser; 
            const hasGoogleProvider = !!freshUser?.providerData?.some(p => p.providerId === 'google.com');
            if (freshUser && !freshUser.emailVerified && !freshUser.phoneNumber && !(freshUser.email || '').endsWith('@dailyflow.app') && !hasGoogleProvider) {
                setUnverifiedDialogVisible(true);
                setPendingVerificationUserEmail(freshUser.email || null);
            }
        } catch (error: any) { 
            handleAuthError(error); 
        } finally { 
            setIsLoading(false); 
        } 
    };
    const handleRegister = async () => {
        const { nickname, email, password } = registerData;
        if (!nickname.trim()) { showToast('Nick jest wymagany.', 'error'); return; }
        const isEmailValid = validateEmail(email);
        const isPasswordValid = validatePassword(password);
        if (!isEmailValid || !isPasswordValid) return;
        setIsLoading(true);
        try {
            // Jeśli email ma już metody logowania — nie twórz konta, pokieruj użytkownika
            try {
                const methods = await auth().fetchSignInMethodsForEmail(email);
                if (methods && methods.length > 0) {
                    await openLoginSuggestion(email, methods);
                    setIsLoading(false);
                    return;
                }
            } catch {}
            const userCredentials = await createUserWithEmailAndPassword(getAuth(), email, password);
            await createNewUserInFirestore(userCredentials.user, nickname);
            await userCredentials.user.sendEmailVerification();
            setEmailVerificationUser(userCredentials.user);
            setEmailVerificationDialogVisible(true);
            try { await setSuggestedLoginIdentifier(email); } catch {}
        } catch (error: any) {
            const code = String(error?.code || '');
            if (code === 'auth/email-already-in-use') {
                try {
                    const email = registerData.email;
                    const methods = email ? await auth().fetchSignInMethodsForEmail(email) : [];
                    await openLoginSuggestion(email, methods);
                    return;
                } catch {}
            }
            handleAuthError(error);
        } finally {
            setIsLoading(false);
        }
    };
    const onGoogleButtonPress = async () => {
        setIsLoading(true);
        try {
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            // spróbuj użyć istniejącego tokenu zanim pokażesz dialog
            let idToken = (await GoogleSignin.getTokens())?.idToken;
            if (!idToken) {
                const signInResp: any = await GoogleSignin.signIn();
                idToken = signInResp?.data?.idToken || (await GoogleSignin.getTokens())?.idToken;
            }
            if (!idToken) throw new Error('Brak tokena Google');
            const googleCredential = GoogleAuthProvider.credential(idToken);

            const currentUserInfo = await GoogleSignin.getCurrentUser();
            const email = currentUserInfo?.user?.email;
            if (email) {
                try {
                    const methods = await auth().fetchSignInMethodsForEmail(email);
                    const hasPassword = methods.includes('password');
                    if (hasPassword) {
                        // Zapytaj o połączenie kont
                        setPendingGoogleCredential(googleCredential);
                        setLinkEmail(email);
                        setLinkModalVisible(true);
                        return;
                    }
                } catch {}
            }

            const userCredential = await signInWithCredential(getAuth(), googleCredential);
            const user = userCredential.user;
            try { await upsertAuthProvidersForUser(user); } catch {}
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!userDoc.exists()) {
                navigation.navigate('Nickname');
            }
        } catch (error: any) {
            const code = String(error?.code || '')
            if (code === '12501' || code === 'SIGN_IN_CANCELLED') {
                showToast('Logowanie anulowane.', 'info');
            } else if (code === 'auth/account-exists-with-different-credential') {
                setLinkEmail(error?.email || linkEmail);
                setPendingGoogleCredential(error?.credential || pendingGoogleCredential);
                setLinkModalVisible(true);
            } else if (code === '12500' || code === 'sign_in_failed' || code === 'DEVELOPER_ERROR') {
                showToast('Logowanie Google nie powiodło się. Spróbuj ponownie.', 'error');
            } else if (code === '10') {
                showToast('Błąd konfiguracji Google (SHA/klient). Zaktualizuj google-services.json i przebuduj.', 'error');
            } else if (code === 'NETWORK_ERROR') {
                showToast('Brak połączenia z siecią. Spróbuj ponownie.', 'error');
            } else {
                showToast('Wystąpił błąd podczas logowania przez Google.', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };
    const isRegisterFormValid = registerData.nickname.trim().length > 0 && isEmailValidCheck(registerData.email) && isPasswordValidCheck(registerData.password);

    useEffect(() => {
        (async () => {
            const suggested = await popSuggestedLoginIdentifier();
            if (suggested) setIdentifier(suggested);
        })();
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => { keyboardProgress.value = withTiming(1, { duration: 250 }); });
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => { keyboardProgress.value = withTiming(0, { duration: 250 }); });
        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, [keyboardProgress]);


    const animatedContainerStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: interpolate(keyboardProgress.value, [0, 1], [0, KEYBOARD_UP_TRANSLATE_Y]) }],
    }));

    const animatedHeaderStyle = useAnimatedStyle(() => ({
        opacity: interpolate(keyboardProgress.value, [0, 0.5], [1, 0]),
        height: interpolate(keyboardProgress.value, [0, 1], [HEADER_HEIGHT_ESTIMATE, 0]),
        marginBottom: HEADER_MARGIN_BOTTOM,
    }));

    useAnimatedReaction(
        () => targetProgress.value,
        (target) => {
            progress.value = withSpring(target, SPRING_CONFIG);
        }
    );

    // Odblokuj gesty po zakończeniu animacji (gdy progress ~ target)
    useAnimatedReaction(
        () => ({ p: progress.value, t: targetProgress.value }),
        ({ p, t }) => {
            if (Math.abs(p - t) < 0.01) {
                isTransitioning.value = false;
            }
        }
    );

    const gesture = Gesture.Pan()
        .activeOffsetX([-20, 20])
        .failOffsetY([-10, 10])
        .onEnd((event) => {
            'worklet';
            if (isTransitioning.value) {
                return;
            }
            if ((Math.abs(event.translationX) > 80 && Math.abs(event.translationX) > Math.abs(event.translationY)) || Math.abs(event.velocityX) > 700) {
                const isSwipingRight = event.translationX > 0;
                // POPRAWKA 1: Logika kierunku jest teraz w pełni kontekstowa
                if (progress.value === 0) { // Na ekranie logowania
                    swipeDirection.value = isSwipingRight ? -1 : 1;
                } else { // Na ekranie rejestracji
                    swipeDirection.value = isSwipingRight ? 1 : -1;
                }
                isTransitioning.value = true;
                targetProgress.value = targetProgress.value === 0 ? 1 : 0;
            }
        });
        
    const loginTextStyle = useAnimatedStyle(() => ({
        color: interpolateColor(progress.value, [0, 1], [Colors.primary, Colors.textSecondary])
    }));
    const registerTextStyle = useAnimatedStyle(() => ({
        color: interpolateColor(progress.value, [0, 1], [Colors.textSecondary, Colors.primary])
    }));

    const loginFormAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{
            translateX: interpolate(progress.value, [0, 1], [0, -FORM_CONTAINER_WIDTH * swipeDirection.value])
        }]
    }));

    const registerFormAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{
            translateX: interpolate(progress.value, [0, 1], [FORM_CONTAINER_WIDTH * swipeDirection.value, 0])
        }]
    }));

    const loginSuggestionDetails = [
        loginSuggestionHasPassword ? '• Logowanie hasłem' : null,
        loginSuggestionHasGoogle ? '• Logowanie Google' : null,
        loginSuggestionHasPhone ? '• Logowanie telefonem' : null,
    ].filter(Boolean).join('\n');

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContentContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                <Animated.View style={[styles.contentContainer, animatedContainerStyle]}>
                    <Animated.View style={animatedHeaderStyle}>
                        <View style={styles.headerContainer}>
                            <Image source={require('../../assets/icon.png')} style={styles.logo} />
                            <Text style={[styles.header, { color: theme.colors.textPrimary }]}>Daily Flow</Text>
                            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Twoje centrum organizacji</Text>
                        </View>
                    </Animated.View>

                    <GestureDetector gesture={gesture}>
                        <View style={styles.formContainer}>
                            <View style={[styles.modeSwitcher, { backgroundColor: theme.colors.inputBackground, borderWidth: 1, borderColor: theme.colors.border }]}> 
                                <TouchableOpacity style={styles.modeButton} onPress={() => { swipeDirection.value = -1; targetProgress.value = 0; }}>
                                    <Animated.Text style={[styles.modeButtonText, loginTextStyle]}>Zaloguj się</Animated.Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modeButton} onPress={() => { swipeDirection.value = 1; targetProgress.value = 1; }}>
                                    <Animated.Text style={[styles.modeButtonText, registerTextStyle]}>Zarejestruj się</Animated.Text>
                                </TouchableOpacity>
                            </View>

                            <View style={[styles.formSliderContainer, { backgroundColor: 'transparent' }]}>
                                <Animated.View style={[styles.formWrapper, loginFormAnimatedStyle]}>
                                    <LoginForm identifier={identifier} setIdentifier={setIdentifier} loginPassword={loginPassword} setLoginPassword={setLoginPassword} isLoading={isLoading} handleLogin={handleLogin} setForgotPasswordModalVisible={setForgotPasswordModalVisible} onGoogleButtonPress={onGoogleButtonPress} theme={theme} />
                                </Animated.View>
                                <Animated.View style={[styles.formWrapper, registerFormAnimatedStyle]}>
                                    <RegisterForm registerData={registerData} handleRegisterDataChange={handleRegisterDataChange} emailError={emailError} passwordError={passwordError} validateEmail={validateEmail} validatePassword={validatePassword} isLoading={isLoading} isRegisterFormValid={isRegisterFormValid} handleRegister={handleRegister} onGoogleButtonPress={onGoogleButtonPress} setPhoneModalVisible={setPhoneModalVisible} theme={theme} />
                                </Animated.View>
                            </View>
                        </View>
                    </GestureDetector>
                </Animated.View>
            </ScrollView>
            <PhoneAuthModal visible={phoneModalVisible} onClose={() => setPhoneModalVisible(false)} onRegistered={() => { swipeDirection.value = -1; targetProgress.value = 0; }} />
            <ForgotPasswordModal visible={forgotPasswordModalVisible} onClose={() => setForgotPasswordModalVisible(false)} />
            {/* Dialog: konto niezweryfikowane */}
            <ActionModal
                visible={unverifiedDialogVisible}
                title={pendingVerificationUserEmail ? 'Zweryfikuj konto' : 'Konto niezweryfikowane'}
                message={pendingVerificationUserEmail ? `Wygląda na to, że nie kliknąłeś jeszcze w link aktywacyjny wysłany na ${pendingVerificationUserEmail}.` : 'Wygląda na to, że nie kliknąłeś jeszcze w link aktywacyjny.'}
                actions={[
                    { text: 'Wyślij link ponownie', onPress: () => { const u = getAuth().currentUser; if (u) handleResendVerification(u); setUnverifiedDialogVisible(false); } },
                    { text: 'OK', onPress: () => { getAuth().signOut(); setUnverifiedDialogVisible(false); } , variant: 'secondary' },
                ]}
                onRequestClose={() => setUnverifiedDialogVisible(false)}
            />
            {/* Dialog: po rejestracji e-mail */}
            <ActionModal
                visible={emailVerificationDialogVisible}
                title={'Prawie gotowe! Sprawdź e‑mail'}
                message={registerData.email ? `Wysłaliśmy link weryfikacyjny na adres ${registerData.email}. Kliknij go, aby dokończyć rejestrację.` : 'Wysłaliśmy link weryfikacyjny na Twój adres e‑mail.'}
                actions={[
                    { text: 'Wyślij ponownie', onPress: async () => { if (emailVerificationUser) { try { await emailVerificationUser.sendEmailVerification(); showToast('Link wysłany ponownie.', 'success'); } catch (e:any) { handleAuthError(e); } } } },
                    { text: 'Rozumiem', onPress: async () => { setEmailVerificationDialogVisible(false); await getAuth().signOut(); targetProgress.value = 0; }, variant: 'secondary' },
                ]}
                onRequestClose={() => setEmailVerificationDialogVisible(false)}
            />
            {/* Dialog: łączenie kont */}
            <LinkAccountsModal
                visible={linkModalVisible}
                email={linkEmail}
                onCancel={() => { setLinkModalVisible(false); setPendingGoogleCredential(null); showToast('Nie połączono kont.', 'info'); }}
                onConfirm={async (password) => {
                    try {
                        const userCred = await signInWithEmailAndPassword(getAuth(), linkEmail, password);
                        if (pendingGoogleCredential) {
                            await userCred.user.linkWithCredential(pendingGoogleCredential);
                        }
                        const user = getAuth().currentUser;
                        if (user) {
                            const userDoc = await getDoc(doc(db, 'users', user.uid));
                            if (!userDoc.exists()) {
                                await createNewUserInFirestore(user, user.displayName || user.email || '');
                            }
                        }
                        setLinkModalVisible(false);
                        showToast('Konta połączone. Zalogowano.', 'success');
                    } catch (e:any) {
                        handleAuthError(e);
                    }
                }}
            />
            <ActionModal
                visible={loginSuggestionVisible}
                title={'Konto już istnieje'}
                message={`Dla adresu ${loginSuggestionEmail} znaleziono:\n${loginSuggestionDetails || '— brak dopasowanych metod'}`}
                actions={[
                    ...(loginSuggestionHasPassword ? [{ text: 'Zaloguj hasłem', onPress: () => { setIdentifier(loginSuggestionEmail); swipeDirection.value = -1; targetProgress.value = 0; setLoginSuggestionVisible(false); } }] as any : []),
                    ...(loginSuggestionHasGoogle ? [{ text: 'Zaloguj Google', onPress: async () => { setLoginSuggestionVisible(false); try { await onGoogleButtonPress(); } catch {} } }] as any : []),
                    ...(loginSuggestionHasPhone ? [{ text: 'Zaloguj telefonem', onPress: () => { setLoginSuggestionVisible(false); setPhoneModalVisible(true); } }] as any : []),
                    { text: 'Anuluj', onPress: () => setLoginSuggestionVisible(false), variant: 'secondary' },
                ]}
                onRequestClose={() => setLoginSuggestionVisible(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundLight,
    },
    scrollContentContainer: {
        flexGrow: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: '25%',
    },
    contentContainer: {
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: Spacing.xLarge,
    },
    headerContainer: {
        alignItems: 'center',
        overflow: 'hidden',
    },
    logo: { width: 100, height: 100, marginBottom: Spacing.medium },
    header: { fontSize: 40, fontWeight: '700', color: Colors.textPrimary },
    subtitle: { fontSize: 18, color: Colors.textSecondary },
    formContainer: {
        width: '100%',
        marginTop: Spacing.xLarge,
    },
    modeSwitcher: {
        flexDirection: 'row',
        backgroundColor: Colors.inputBackground,
        borderRadius: 10,
        marginBottom: Spacing.large,
        position: 'relative',
    },
    modeButton: {
        flex: 1,
        paddingVertical: Spacing.medium,
        borderRadius: 8,
        alignItems: 'center',
    },
    modeButtonText: {
        fontSize: Typography.body.fontSize,
        fontWeight: '600',
    },
    formSliderContainer: {
        minHeight: 450, // Zastępujemy stałą wysokość minimalną wysokością
        overflow: 'hidden',
    },
    formWrapper: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
    },
    formInnerContainer: {
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: Spacing.small,
    },
    buttonMarginTop: { marginTop: Spacing.medium, width: '100%' },
    forgotPasswordButton: {
        alignSelf: 'flex-end',
        paddingVertical: Spacing.small,
    },
    forgotPasswordText: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    dividerContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: Spacing.large },
    dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
    dividerText: { marginHorizontal: Spacing.small, color: Colors.textSecondary, fontWeight: '500' },
    disabledGoogleButton: { opacity: 0.6, },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
        paddingVertical: Spacing.medium,
        width: '100%',
    },
    socialButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    socialButtonHalf: {
        width: '48%',
        paddingVertical: Spacing.small,
    },
    socialIcon: {
        width: 20,
        height: 20,
        marginRight: Spacing.small,
    },
    socialButtonText: {
        color: Colors.textPrimary,
        fontWeight: '600',
        fontSize: 15,
    },
    inputError: {
        borderColor: Colors.danger,
    },
    inputWrapper: {
        width: '100%',
        marginBottom: Spacing.small,
    },
    errorText: {
        color: Colors.danger,
        alignSelf: 'flex-start',
        marginLeft: Spacing.small,
        marginTop: Spacing.xSmall,
    },
});

export default LoginScreen;
