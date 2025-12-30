import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Image, Alert, Dimensions, ScrollView, Platform, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth, FirebaseAuthTypes, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, signOut, signInWithCredential, linkWithCredential, EmailAuthProvider } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useToast } from '../contexts/ToastContext';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import { Feather } from '@expo/vector-icons';
import PhoneAuthModal from '../components/PhoneAuthModal';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import PhonePasswordResetModal from '../components/PhonePasswordResetModal';
import { createNewUserInFirestore, findUserEmailByIdentifier } from '../utils/authUtils';
import { AuthStackParamList } from '../types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import PasswordInput from '../components/PasswordInput';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolateColor, interpolate, useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

type LoginNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FORM_CONTAINER_WIDTH = SCREEN_WIDTH - 2 * Spacing.xLarge;
const SPRING_CONFIG = { damping: 20, stiffness: 150, mass: 1 };

// Komponenty formularzy (bez zmian)
const LoginForm = React.memo(({ identifier, setIdentifier, loginPassword, setLoginPassword, isLoading, handleLogin, setForgotPasswordModalVisible, onGoogleButtonPress, onSmsLogin }: any) => (
    <View style={styles.formInnerContainer}>
        <TextInput style={GlobalStyles.input} placeholder="E-mail lub telefon (9 cyfr)" value={identifier} onChangeText={setIdentifier} autoCapitalize="none" editable={!isLoading} placeholderTextColor={Colors.placeholder} />
        <PasswordInput
            placeholder="Hasło"
            value={loginPassword}
            onChangeText={setLoginPassword}
            editable={!isLoading}
            containerStyle={{marginTop: Spacing.small}}
        />
        <TouchableOpacity style={styles.forgotPasswordButton} onPress={() => setForgotPasswordModalVisible(true)}>
            <Text style={styles.forgotPasswordText}>Zapomniałem hasła</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[GlobalStyles.button, styles.buttonMarginTop]} onPress={handleLogin} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="white" /> : <Text style={GlobalStyles.buttonText}>Zaloguj się</Text>}
        </TouchableOpacity>
        <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} /><Text style={styles.dividerText}>lub</Text><View style={styles.dividerLine} />
        </View>
        <View style={styles.socialButtonsContainer}>
            <TouchableOpacity style={[styles.socialButton, styles.socialButtonHalf, isLoading && styles.disabledGoogleButton]} onPress={onGoogleButtonPress} disabled={isLoading} >
                {isLoading ? <ActivityIndicator color={Colors.primary} /> : (
                    <>
                        <Image source={require('../../assets/google-icon.png')} style={styles.socialIcon} />
                        <Text style={styles.socialButtonText}>Google</Text>
                    </>
                )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialButton, styles.socialButtonHalf, isLoading && styles.disabledGoogleButton]} onPress={onSmsLogin} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color={Colors.primary} /> : (
                    <>
                        <Feather name="phone" size={18} color={Colors.textPrimary} style={styles.socialIcon} />
                        <Text style={styles.socialButtonText}>SMS</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    </View>
));

const RegisterForm = React.memo(({ registerData, handleRegisterDataChange, emailError, passwordError, validateEmail, validatePassword, isLoading, isRegisterFormValid, handleRegister, onGoogleButtonPress, onPhoneRegister }: any) => (
    <View style={styles.formInnerContainer}>
        <View style={styles.inputWrapper}>
            <TextInput style={[GlobalStyles.input]} placeholder="Twój Nick" value={registerData.nickname} onChangeText={(val: string) => handleRegisterDataChange('nickname', val)} editable={!isLoading} placeholderTextColor={Colors.placeholder} />
        </View>
        <View style={styles.inputWrapper}>
            <TextInput
                style={[GlobalStyles.input, emailError ? styles.inputError : {}]}
                placeholder="Adres e-mail"
                value={registerData.email}
                onChangeText={(val: string) => handleRegisterDataChange('email', val)}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
                placeholderTextColor={Colors.placeholder}
                onBlur={() => validateEmail(registerData.email)}
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
            onPress={handleRegister}
            disabled={isLoading || !isRegisterFormValid}
        >
            {isLoading ? <ActivityIndicator color="white" /> : <Text style={GlobalStyles.buttonText}>Stwórz konto</Text>}
        </TouchableOpacity>
        <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} /><Text style={styles.dividerText}>lub</Text><View style={styles.dividerLine} />
        </View>
        <View style={styles.socialButtonsContainer}>
            <TouchableOpacity style={[styles.socialButton, styles.socialButtonHalf, isLoading && styles.disabledGoogleButton]} onPress={onGoogleButtonPress} disabled={isLoading} >
                {isLoading ? <ActivityIndicator color={Colors.primary} /> : (
                    <>
                        <Image source={require('../../assets/google-icon.png')} style={styles.socialIcon} />
                        <Text style={styles.socialButtonText}>Google</Text>
                    </>
                )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialButton, styles.socialButtonHalf, isLoading && styles.disabledGoogleButton]} onPress={onPhoneRegister} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color={Colors.primary} /> : (
                    <>
                        <Feather name="phone" size={18} color={Colors.textPrimary} style={styles.socialIcon} />
                        <Text style={styles.socialButtonText}>Telefon</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    </View>
));


interface LoginScreenProps {
  onRefreshAuthState?: () => void;
}

const LoginScreen = ({ onRefreshAuthState }: LoginScreenProps = {}) => {
    const auth = getAuth();
    const navigation = useNavigation<LoginNavigationProp>();
    
    const [identifier, setIdentifier] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [registerData, setRegisterData] = useState({ nickname: '', email: '', password: '' });
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const { showToast } = useToast();
    const [phoneModalVisible, setPhoneModalVisible] = useState(false);
    const [phoneModalMode, setPhoneModalMode] = useState<'register' | 'login'>('register');
    const [forgotPasswordModalVisible, setForgotPasswordModalVisible] = useState(false);
    const [phonePasswordResetModalVisible, setPhonePasswordResetModalVisible] = useState(false);
    
    const progress = useSharedValue(0);
    const swipeDirection = useSharedValue(1);
    const targetProgress = useSharedValue(0);
    const keyboardProgress = useSharedValue(0);
    
    const KEYBOARD_UP_TRANSLATE_Y = -100; // Przywrócenie poprawnej wartości
    const HEADER_HEIGHT_ESTIMATE = 130;
    const HEADER_MARGIN_BOTTOM = Spacing.xLarge;

    const isEmailValidCheck = (email: string) => /\S+@\S+\.\S+/.test(email);
    const isPasswordValidCheck = (password: string) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(password);

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
    const handleAuthError = (error: any) => { 
        console.log("Błąd autoryzacji przechwycony:", error.message); 
        const code = error.code || ''; 
        if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') { 
            showToast('Nieprawidłowe dane logowania.\nSprawdź identyfikator i hasło.', 'error'); 
        } else if (code === 'auth/too-many-requests') { 
            Alert.alert(
                "Zablokowano Dostęp", 
                "Wykryliśmy nietypową aktywność.\n\nDostęp został tymczasowo zablokowany.\n\nSpróbuj ponownie za kilka minut."
            ); 
        } else if (code === 'auth/email-already-in-use') { 
            showToast('Ten adres e-mail jest już używany.', 'error'); 
        } else if (code === 'auth/weak-password') { 
            showToast('Hasło jest zbyt słabe. Użyj min. 6 znaków, w tym cyfry i litery.', 'error'); 
        } else if (code === 'auth/invalid-email') { 
            showToast('Podany adres e-mail jest nieprawidłowy.', 'error'); 
        } else { 
            showToast('Wystąpił nieoczekiwany błąd. Spróbuj ponownie.', 'error'); 
        } 
    };
    const handleResendVerification = async (user: FirebaseAuthTypes.User) => { 
        try { 
            await sendEmailVerification(user); 
            Alert.alert( 
                "Link wysłany!", 
                "Nowy link weryfikacyjny został wysłany\nna Twój adres e-mail.\n\nSprawdź swoją skrzynkę\n(również folder spam)." 
            ); 
        } catch (error: any) { 
            handleAuthError(error); 
        } 
    };
    const handleLogin = async () => { 
        if (isLoading) return; // Zapobiegaj wielokrotnemu wywoływaniu
        if (!identifier.trim() || !loginPassword.trim()) { 
            showToast('Wszystkie pola są wymagane.', 'error'); 
            return; 
        } 
        setIsLoading(true); 
        try { 
            // Sprawdź czy to email czy telefon
            const isEmail = /\S+@\S+\.\S+/.test(identifier.trim());
            let loginEmail: string = '';
            if (isEmail) {
                // Jeśli to email, użyj bezpośrednio
                loginEmail = identifier.trim();
            } else {
                // Jeśli to telefon, szukaj użytkownika po phoneNumber w Firestore
                const usersRef = collection(db, 'users');
                const cleanIdentifier = identifier.trim();
                const numericOnly = cleanIdentifier.replace(/\D/g, '');
                let possibleFormats = [cleanIdentifier];
                if (cleanIdentifier.startsWith('+')) {
                    const withoutPrefix = cleanIdentifier.substring(1);
                    possibleFormats.push(withoutPrefix);
                    if (cleanIdentifier.startsWith('+48') && numericOnly.length === 11) {
                        const polishNumber = numericOnly.substring(2);
                        possibleFormats.push(`+48${polishNumber}`);
                    }
                } else {
                    possibleFormats.push(`+${numericOnly}`);
                    if (numericOnly.length === 9) {
                        possibleFormats.push(`+48${numericOnly}`);
                    }
                }
                const uniqueFormats = [...new Set(possibleFormats)];
                let foundUser = null;
                for (const format of uniqueFormats) {
                    const phoneQuery = query(usersRef, where('phoneNumber', '==', format), limit(1));
                    const phoneSnapshot = await getDocs(phoneQuery);
                    if (!phoneSnapshot.empty) {
                        foundUser = phoneSnapshot.docs[0].data();
                        break;
                    }
                }
                if (!foundUser) {
                    showToast('Nie znaleziono użytkownika z tym numerem telefonu.', 'error');
                    setIsLoading(false);
                    return;
                }
                if (foundUser.email) {
                    loginEmail = foundUser.email;
                } else if (foundUser.phoneNumber) {
                    loginEmail = `${foundUser.phoneNumber}@dailyflow.app`;
                } else {
                    showToast('Nie znaleziono adresu e-mail powiązanego z tym numerem.', 'error');
                    setIsLoading(false);
                    return;
                }
            }
            // Logowanie przez email+hasło (działa także dla kont zarejestrowanych przez telefon)
            await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
            const freshUser = auth.currentUser; 
            if (freshUser && isEmail && !freshUser.emailVerified) { 
                Alert.alert( 
                    "Konto niezweryfikowane", 
                    "Wygląda na to, że nie kliknąłeś jeszcze\nw link aktywacyjny.\n\nSprawdź swoją skrzynkę e-mail\n(również folder spam!).", 
                    [ 
                        { text: "OK", onPress: () => signOut(auth) }, 
                        { text: "Wyślij link ponownie", onPress: () => handleResendVerification(freshUser) } 
                    ] 
                ); 
            } 
        } catch (error: any) { 
            handleAuthError(error); 
        } finally { 
            setIsLoading(false); 
        } 
    };
    const handleRegister = async () => { 
        const { nickname, email, password } = registerData; 
        if (!nickname.trim()) { 
            showToast('Nick jest wymagany.', 'error'); 
            return; 
        } 
        const isEmailValid = validateEmail(email); 
        const isPasswordValid = validatePassword(password); 
        if (!isEmailValid || !isPasswordValid) return; 
        setIsLoading(true); 
        try { 
            const userCredentials = await createUserWithEmailAndPassword(auth, email, password); 
            await createNewUserInFirestore(userCredentials.user, nickname); 
            await sendEmailVerification(userCredentials.user); 
            await signOut(auth); 
            Alert.alert( 
                "Prawie gotowe!\nSprawdź swój e-mail", 
                `Wysłaliśmy link weryfikacyjny\nna adres ${email}.\n\nKliknij go, aby dokończyć rejestrację,\na następnie zaloguj się do aplikacji.`, 
                [{ text: "Rozumiem", onPress: () => { targetProgress.value = 0; } }] 
            ); 
        } catch (error: any) { 
            handleAuthError(error); 
        } finally { 
            setIsLoading(false); 
        } 
    };
        const onGoogleButtonPress = async () => { 
        setIsLoading(true); 
        try { 
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true }); 
            const userInfo = await GoogleSignin.signIn(); 
            const { idToken } = await GoogleSignin.getTokens(); 
            if (!idToken) throw new Error("Brak tokena Google"); 
            
            // Zaloguj się przez Google
            const googleCredential = GoogleAuthProvider.credential(idToken); 
            const userCredential = await signInWithCredential(auth, googleCredential); 
            const user = userCredential.user; 
            
            // Sprawdź czy istnieje konto z tym samym adresem email ale innym UID
            if (user.email) {
                try {
                    console.log("🔍 Sprawdzam metody logowania dla:", user.email);
                    
                    // Sprawdź czy istnieje konto w Firestore z tym samym email
                    const usersRef = collection(db, 'users');
                    const emailQuery = query(usersRef, where('email', '==', user.email), limit(1));
                    const emailSnapshot = await getDocs(emailQuery);
                    console.log("📋 Znalezione konta w Firestore:", emailSnapshot.size);
                    
                    if (!emailSnapshot.empty) {
                        const existingUserDoc = emailSnapshot.docs[0];
                        const existingUserId = existingUserDoc.id;
                        console.log("📄 ID istniejącego konta w Firestore:", existingUserId);
                        console.log("📄 ID aktualnego użytkownika:", user.uid);
                        
                        // Jeśli znaleziono konto z tym samym email ale innym UID
                        if (existingUserId !== user.uid) {
                            console.log("⚠️ Znaleziono konto z tym samym email ale innym UID");
                            
                            // Sprawdź czy istnieje konto Firebase Auth z tym samym email
                            const existingUser = await auth.fetchSignInMethodsForEmail(user.email);
                            console.log("📋 Znalezione metody logowania w Firebase Auth:", existingUser);
                            
                            if (existingUser.length > 0 && !existingUser.includes('google.com')) {
                                console.log("⚠️ Znaleziono konto z tym samym email ale nie przez Google");
                                // Istnieje konto z tym samym email ale nie przez Google
                                Alert.alert(
                                    "Konto już istnieje",
                                    `Znaleziono konto z adresem ${user.email}.\n\nCzy chcesz połączyć to konto z kontem Google?`,
                                    [
                                        { text: "Anuluj", style: "cancel", onPress: () => signOut(auth) },
                                        { text: "Połącz", onPress: () => handleLinkAccounts(user, user.email!) }
                                    ]
                                );
                                return;
                            } else {
                                console.log("ℹ️ Brak metod logowania w Firebase Auth - pokazuję okno potwierdzenia");
                                // Pokaż okno potwierdzenia nawet jeśli nie ma metod logowania w Firebase Auth
                                Alert.alert(
                                    "Konto już istnieje",
                                    `Znaleziono konto z adresem ${user.email}.\n\nCzy chcesz połączyć to konto z kontem Google?`,
                                    [
                                        { text: "Anuluj", style: "cancel", onPress: () => signOut(auth) },
                                        { text: "Połącz", onPress: () => handleLinkAccounts(user, user.email!) }
                                    ]
                                );
                                return;
                            }
                        } else {
                            console.log("✅ To samo konto - brak konfliktu");
                        }
                    } else {
                        console.log("✅ Brak konta w Firestore z tym email");
                    }
                } catch (error) {
                    console.log("❌ Błąd sprawdzania metod logowania:", error);
                }
            }
            

            

            
 
            
            // Sprawdź czy użytkownik ma już profil w bazie
            const userDoc = await getDoc(doc(db, 'users', user.uid)); 
            if (!userDoc.exists()) { 
                navigation.navigate('Nickname', { user }); 
            }
            // Jeśli użytkownik już ma profil, po prostu kontynuuj logowanie 
        } catch (error: any) { 
            if (error.code === '12501' || error.code === 'SIGN_IN_CANCELLED') { 
                showToast('Logowanie anulowane.', 'info'); 
            } else { 
                console.log("Błąd logowania Google:", error); 
                showToast('Wystąpił błąd podczas logowania przez Google.', 'error'); 
            } 
        } finally { 
            setIsLoading(false); 
        } 
    };

    const handleLinkAccounts = async (googleUser: FirebaseAuthTypes.User, existingEmail: string) => {
        console.log("🔗 Rozpoczynam łączenie kont dla:", existingEmail);
        Alert.prompt(
            "Potwierdź hasło",
            `Wprowadź hasło do konta ${existingEmail} aby potwierdzić, że to Twoje konto:`,
                            [
                    { text: "Anuluj", style: "cancel", onPress: () => {
                        console.log("❌ Anulowano łączenie kont");
                        signOut(auth);
                    }},
                    { 
                        text: "Potwierdź", 
                        onPress: async (password?: string) => {
                            if (!password) {
                                showToast('Hasło jest wymagane.', 'error');
                                return;
                            }
                            
                            try {
                                console.log("🔐 Próbuję połączyć konta...");
                                // Spróbuj się zalogować na istniejące konto
                                const emailCredential = EmailAuthProvider.credential(existingEmail, password);
                                await linkWithCredential(googleUser, emailCredential);
                                console.log("✅ Konta połączone pomyślnie!");
                                showToast('Konta zostały połączone pomyślnie!', 'success');
                            } catch (error: any) {
                                console.log("❌ Błąd łączenia kont:", error.code, error.message);
                                if (error.code === 'auth/wrong-password') {
                                    showToast('Nieprawidłowe hasło.', 'error');
                                } else if (error.code === 'auth/credential-already-in-use') {
                                    showToast('To konto jest już połączone z innym kontem Google.', 'error');
                                    signOut(auth);
                                } else {
                                    showToast('Błąd łączenia kont. Spróbuj ponownie.', 'error');
                                    signOut(auth);
                                }
                            }
                        }
                    }
                ],
            "secure-text"
        );
    };
    const isRegisterFormValid = registerData.nickname.trim().length > 0 && isEmailValidCheck(registerData.email) && isPasswordValidCheck(registerData.password);

    useEffect(() => {
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
            if (target !== progress.value) {
                runOnJS(setIsAnimating)(true);
                progress.value = withSpring(target, SPRING_CONFIG, (finished) => {
                    if (finished) {
                        runOnJS(setIsAnimating)(false);
                    }
                });
            }
        }
    );

    const gesture = Gesture.Pan()
        .enabled(!isAnimating && !isLoading)
        .onEnd((event) => {
            'worklet';
            if (Math.abs(event.translationX) > 50 || Math.abs(event.velocityX) > 400) {
                const isSwipingRight = event.translationX > 0;
                // POPRAWKA 1: Logika kierunku jest teraz w pełni kontekstowa
                if (progress.value === 0) { // Na ekranie logowania
                    swipeDirection.value = isSwipingRight ? -1 : 1;
                } else { // Na ekranie rejestracji
                    swipeDirection.value = isSwipingRight ? 1 : -1;
                }
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

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContentContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Animated.View style={[styles.contentContainer, animatedContainerStyle]}>
                    <Animated.View style={animatedHeaderStyle}>
                        <View style={styles.headerContainer}>
                            <Image source={require('../../assets/icon.png')} style={styles.logo} />
                            <Text style={styles.header}>Daily Flow</Text>
                            <Text style={styles.subtitle}>Twoje centrum organizacji</Text>
                        </View>
                    </Animated.View>

                    <GestureDetector gesture={gesture}>
                        <View style={styles.formContainer}>
                            <View style={styles.modeSwitcher}>
                                <TouchableOpacity 
                                    style={styles.modeButton} 
                                    onPress={() => { 
                                        if (!isAnimating && !isLoading) {
                                            swipeDirection.value = -1; 
                                            targetProgress.value = 0; 
                                        }
                                    }}
                                    disabled={isAnimating || isLoading}
                                >
                                    <Animated.Text style={[styles.modeButtonText, loginTextStyle]}>Zaloguj się</Animated.Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.modeButton} 
                                    onPress={() => { 
                                        if (!isAnimating && !isLoading) {
                                            swipeDirection.value = 1; 
                                            targetProgress.value = 1; 
                                        }
                                    }}
                                    disabled={isAnimating || isLoading}
                                >
                                    <Animated.Text style={[styles.modeButtonText, registerTextStyle]}>Zarejestruj się</Animated.Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formSliderContainer}>
                                <Animated.View style={[styles.formWrapper, loginFormAnimatedStyle]}>
                                    <LoginForm 
                                        identifier={identifier} 
                                        setIdentifier={setIdentifier} 
                                        loginPassword={loginPassword} 
                                        setLoginPassword={setLoginPassword} 
                                        isLoading={isLoading} 
                                        handleLogin={handleLogin} 
                                        setForgotPasswordModalVisible={setForgotPasswordModalVisible} 
                                        onGoogleButtonPress={onGoogleButtonPress}
                                        onSmsLogin={() => {
                                            setPhoneModalMode('login');
                                            setPhoneModalVisible(true);
                                        }}
                                    />
                                </Animated.View>
                                <Animated.View style={[styles.formWrapper, registerFormAnimatedStyle]}>
                                    <RegisterForm 
                                        registerData={registerData} 
                                        handleRegisterDataChange={handleRegisterDataChange} 
                                        emailError={emailError} 
                                        passwordError={passwordError} 
                                        validateEmail={validateEmail} 
                                        validatePassword={validatePassword} 
                                        isLoading={isLoading} 
                                        isRegisterFormValid={isRegisterFormValid} 
                                        handleRegister={handleRegister} 
                                        onGoogleButtonPress={onGoogleButtonPress} 
                                        onPhoneRegister={() => {
                                            setPhoneModalMode('register');
                                            setPhoneModalVisible(true);
                                        }}
                                    />
                                </Animated.View>
                            </View>
                        </View>
                    </GestureDetector>
                </Animated.View>
            </ScrollView>
            <PhoneAuthModal 
                visible={phoneModalVisible} 
                onClose={() => setPhoneModalVisible(false)}
                onRegistrationSuccess={onRefreshAuthState}
                onLoginSuccess={onRefreshAuthState}
                mode={phoneModalMode}
            />
            <ForgotPasswordModal 
                visible={forgotPasswordModalVisible} 
                onClose={() => setForgotPasswordModalVisible(false)} 
                onPhoneReset={() => {
                    setForgotPasswordModalVisible(false);
                    setPhonePasswordResetModalVisible(true);
                }} 
            />
            <PhonePasswordResetModal visible={phonePasswordResetModalVisible} onClose={() => setPhonePasswordResetModalVisible(false)} />
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
