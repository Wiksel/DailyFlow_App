import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Image, Alert, Dimensions, ScrollView, Platform, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useToast } from '../contexts/ToastContext';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import { Feather } from '@expo/vector-icons';
import PhoneAuthModal from '../components/PhoneAuthModal';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import { createNewUserInFirestore, findUserEmailByIdentifier } from '../utils/authUtils';
import { AuthStackParamList } from '../types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import PasswordInput from '../components/PasswordInput';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolateColor, interpolate } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

type LoginNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Komponent LoginForm pozostaje bez zmian
const LoginForm = React.memo(({ identifier, setIdentifier, loginPassword, setLoginPassword, isLoading, handleLogin, setForgotPasswordModalVisible, onGoogleButtonPress }: any) => (
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
        <TouchableOpacity style={[styles.socialButton, isLoading && styles.disabledGoogleButton]} onPress={onGoogleButtonPress} disabled={isLoading} >
            {isLoading ? <ActivityIndicator color={Colors.primary} /> : (
                <>
                    <Image source={require('../../assets/google-icon.png')} style={styles.socialIcon} />
                    <Text style={styles.socialButtonText}>Zaloguj się z Google</Text>
                </>
            )}
        </TouchableOpacity>
    </View>
));

// ZMIANA 4: Poprawki w strukturze i stylach formularza rejestracji
const RegisterForm = React.memo(({ registerData, handleRegisterDataChange, emailError, passwordError, validateEmail, validatePassword, isLoading, isRegisterFormValid, handleRegister, onGoogleButtonPress, setPhoneModalVisible }: any) => (
    <View style={styles.formInnerContainer}>
        <View style={styles.inputWrapper}>
            <TextInput style={[GlobalStyles.input]} placeholder="Twój Nick" value={registerData.nickname} onChangeText={(val) => handleRegisterDataChange('nickname', val)} editable={!isLoading} placeholderTextColor={Colors.placeholder} />
        </View>
        <View style={styles.inputWrapper}>
            <TextInput
                style={[GlobalStyles.input, emailError ? styles.inputError : {}]}
                placeholder="Adres e-mail"
                value={registerData.email}
                onChangeText={(val) => handleRegisterDataChange('email', val)}
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
                onChangeText={(val) => handleRegisterDataChange('password', val)}
                editable={!isLoading}
                containerStyle={passwordError ? styles.inputError : {}}
                onBlur={() => validatePassword(registerData.password)}
                placeholder="Hasło (min. 6 znaków, litera i cyfra)"
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
            <TouchableOpacity style={[styles.socialButton, styles.socialButtonHalf, isLoading && styles.disabledGoogleButton]} onPress={() => setPhoneModalVisible(true)} disabled={isLoading}>
                <Feather name="phone" size={18} color={Colors.textPrimary} style={styles.socialIcon} />
                <Text style={styles.socialButtonText}>Telefon</Text>
            </TouchableOpacity>
        </View>
    </View>
));


const LoginScreen = () => {
    const navigation = useNavigation<LoginNavigationProp>();
    
    const [identifier, setIdentifier] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [registerData, setRegisterData] = useState({ nickname: '', email: '', password: '' });
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { showToast } = useToast();
    const [phoneModalVisible, setPhoneModalVisible] = useState(false);
    const [forgotPasswordModalVisible, setForgotPasswordModalVisible] = useState(false);
    const translateX = useSharedValue(0);
    const context = useSharedValue({ x: 0 });
    const keyboardProgress = useSharedValue(0);
    const FORM_CONTAINER_WIDTH = SCREEN_WIDTH - 2 * Spacing.xLarge;
    
    const KEYBOARD_UP_TRANSLATE_Y = -190;
    const HEADER_HEIGHT_ESTIMATE = 130;
    const HEADER_MARGIN_BOTTOM = Spacing.xLarge;

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener( 'keyboardDidShow', () => { keyboardProgress.value = withTiming(1, { duration: 250 }); });
        const keyboardDidHideListener = Keyboard.addListener( 'keyboardDidHide', () => { keyboardProgress.value = withTiming(0, { duration: 250 }); });
        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, [keyboardProgress]);


    const animatedContainerStyle = useAnimatedStyle(() => {
        const translateY = interpolate( keyboardProgress.value, [0, 1], [0, KEYBOARD_UP_TRANSLATE_Y] );
        return {
            transform: [{ translateY }],
        };
    });

    const animatedHeaderStyle = useAnimatedStyle(() => {
        const opacity = interpolate(keyboardProgress.value, [0, 0.5], [1, 0]);
        const height = interpolate(keyboardProgress.value, [0, 1], [HEADER_HEIGHT_ESTIMATE, 0]);
        return {
            opacity,
            height,
            marginBottom: HEADER_MARGIN_BOTTOM,
        };
    });

    // ZMIANA 1: Przywrócenie logiki "toggle" dla gestu przewijania
    const gesture = Gesture.Pan()
        .onStart(() => { context.value = { x: translateX.value }; })
        .onUpdate((event) => { const newTranslateX = context.value.x + event.translationX; translateX.value = Math.max(-FORM_CONTAINER_WIDTH, Math.min(0, newTranslateX)); })
        .onEnd((event) => {
            const springConfig = { damping: 20, stiffness: 150, mass: 1 };
            // Sprawdzamy, czy gest był wystarczająco wyraźny, aby zainicjować przełączenie
            if (Math.abs(event.translationX) > 50 || Math.abs(event.velocityX) > 400) {
                // Jeśli jesteśmy na ekranie logowania (pozycja 0), przełącz na rejestrację
                if (translateX.value === 0) {
                    translateX.value = withSpring(-FORM_CONTAINER_WIDTH, springConfig);
                } else {
                // Jeśli jesteśmy na ekranie rejestracji, przełącz na logowanie
                    translateX.value = withSpring(0, springConfig);
                }
            } else {
                // Jeśli gest był za słaby, wróć na miejsce
                translateX.value = withSpring(context.value.x, springConfig);
            }
        });

    const animatedFormSliderStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
    const loginTextStyle = useAnimatedStyle(() => ({ color: interpolateColor(translateX.value, [-FORM_CONTAINER_WIDTH, 0], [Colors.textSecondary, Colors.primary]) }));
    const registerTextStyle = useAnimatedStyle(() => ({ color: interpolateColor(translateX.value, [-FORM_CONTAINER_WIDTH, 0], [Colors.primary, Colors.textSecondary]) }));
    const goToLogin = useCallback(() => { translateX.value = withSpring(0, { damping: 20, stiffness: 150, mass: 1 }); }, [translateX]);
    const goToRegister = useCallback(() => { translateX.value = withSpring(-FORM_CONTAINER_WIDTH, { damping: 20, stiffness: 150, mass: 1 }); }, [translateX, FORM_CONTAINER_WIDTH]);
    
    const handleRegisterDataChange = (name: keyof typeof registerData, value: string) => { if (name === 'email') setEmailError(''); if (name === 'password') setPasswordError(''); setRegisterData(prevState => ({ ...prevState, [name]: value })); };
    const validateEmail = (email: string) => { const emailRegex = /\S+@\S+\.\S+/; if (!email.trim() || !emailRegex.test(email)) { setEmailError('Proszę podać poprawny adres e-mail.'); return false; } setEmailError(''); return true; };
    const validatePassword = (password: string) => { const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/; if (!password.trim() || !passwordRegex.test(password)) { setPasswordError('Hasło jest za słabe.'); return false; } setPasswordError(''); return true; };
    const handleAuthError = (error: any) => { console.log("Błąd autoryzacji przechwycony:", error.message); const code = error.code || ''; if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') { showToast('Nieprawidłowe dane logowania.\nSprawdź identyfikator i hasło.', 'error'); } else if (code === 'auth/too-many-requests') { Alert.alert("Zablokowano Dostęp", "Wykryliśmy nietypową aktywność. Dostęp został tymczasowo zablokowany. Spróbuj ponownie za kilka minut."); } else if (code === 'auth/email-already-in-use') { showToast('Ten adres e-mail jest już używany.', 'error'); } else if (code === 'auth/weak-password') { showToast('Hasło jest zbyt słabe. Użyj min. 6 znaków, w tym cyfry i litery.', 'error'); } else if (code === 'auth/invalid-email') { showToast('Podany adres e-mail jest nieprawidłowy.', 'error'); } else { showToast('Wystąpił nieoczekiwany błąd. Spróbuj ponownie.', 'error'); } };
    const handleResendVerification = async (user: FirebaseAuthTypes.User) => { try { await user.sendEmailVerification(); Alert.alert( "Link wysłany!", "Nowy link weryfikacyjny został wysłany na Twój adres e-mail.\n\nSprawdź swoją skrzynkę (również folder spam)." ); } catch (error: any) { handleAuthError(error); } };
    const handleLogin = async () => { if (!identifier.trim() || !loginPassword.trim()) { showToast('Wszystkie pola są wymagane.', 'error'); return; } setIsLoading(true); try { const userEmail = await findUserEmailByIdentifier(identifier); if (!userEmail) { showToast('Nie znaleziono użytkownika.', 'error'); setIsLoading(false); return; } const userCredentials = await auth().signInWithEmailAndPassword(userEmail, loginPassword); await userCredentials.user.reload(); const freshUser = auth().currentUser; if (freshUser && !freshUser.emailVerified) { Alert.alert( "Konto niezweryfikowane", "Wygląda na to, że nie kliknąłeś jeszcze w link aktywacyjny.\n\nSprawdź swoją skrzynkę e-mail (również folder spam!).", [ { text: "OK", onPress: () => auth().signOut() }, { text: "Wyślij link ponownie", onPress: () => handleResendVerification(freshUser) }] ); } } catch (error: any) { handleAuthError(error); } finally { setIsLoading(false); } };
    const handleRegister = async () => { const { nickname, email, password } = registerData; if (!nickname.trim()) { showToast('Nick jest wymagany.', 'error'); return; } const isEmailValid = validateEmail(email); const isPasswordValid = validatePassword(password); if (!isEmailValid || !isPasswordValid) return; setIsLoading(true); try { const userCredentials = await auth().createUserWithEmailAndPassword(email, password); await createNewUserInFirestore(userCredentials.user, nickname); await userCredentials.user.sendEmailVerification(); await auth().signOut(); Alert.alert( "Prawie gotowe!\nSprawdź swój e-mail", `Wysłaliśmy link weryfikacyjny na adres ${email}.\n\nKliknij go, aby dokończyć rejestrację, a następnie zaloguj się do aplikacji.`, [{ text: "Rozumiem", onPress: goToLogin }] ); } catch (error: any) { handleAuthError(error); } finally { setIsLoading(false); } };
    const onGoogleButtonPress = async () => { setIsLoading(true); try { await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true }); await GoogleSignin.signIn(); const { idToken } = await GoogleSignin.getTokens(); if (!idToken) throw new Error("Brak tokena Google"); const googleCredential = auth.GoogleAuthProvider.credential(idToken); const userCredential = await auth().signInWithCredential(googleCredential); const user = userCredential.user; const userDoc = await getDoc(doc(db, 'users', user.uid)); if (!userDoc.exists()) { navigation.navigate('Nickname', { user }); } } catch (error: any) { if (error.code === '12501' || error.code === 'SIGN_IN_CANCELLED') { showToast('Logowanie anulowane.', 'info'); } else { console.log("Błąd logowania Google:", error); showToast('Wystąpił błąd podczas logowania przez Google.', 'error'); } } finally { setIsLoading(false); } };
    const isRegisterFormValid = registerData.nickname.trim().length > 0 && /\S+@\S+\.\S+/.test(registerData.email) && /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(registerData.password);

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
                            <Text style={styles.header}>DailyFlow</Text>
                            <Text style={styles.subtitle}>Twoje centrum organizacji</Text>
                        </View>
                    </Animated.View>

                    <GestureDetector gesture={gesture}>
                        <View style={styles.formContainer}>
                            <View style={styles.modeSwitcher}>
                                <TouchableOpacity style={styles.modeButton} onPress={goToLogin}>
                                    <Animated.Text style={[styles.modeButtonText, loginTextStyle]}>Zaloguj się</Animated.Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modeButton} onPress={goToRegister}>
                                    <Animated.Text style={[styles.modeButtonText, registerTextStyle]}>Zarejestruj się</Animated.Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formSliderContainer}>
                                <Animated.View style={[styles.animatedFormSlider, animatedFormSliderStyle]}>
                                    <LoginForm
                                        identifier={identifier}
                                        setIdentifier={setIdentifier}
                                        loginPassword={loginPassword}
                                        setLoginPassword={setLoginPassword}
                                        isLoading={isLoading}
                                        handleLogin={handleLogin}
                                        setForgotPasswordModalVisible={setForgotPasswordModalVisible}
                                        onGoogleButtonPress={onGoogleButtonPress}
                                    />
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
                                        setPhoneModalVisible={setPhoneModalVisible}
                                    />
                                </Animated.View>
                            </View>
                        </View>
                    </GestureDetector>
                </Animated.View>
            </ScrollView>
            <PhoneAuthModal visible={phoneModalVisible} onClose={() => setPhoneModalVisible(false)} />
            <ForgotPasswordModal visible={forgotPasswordModalVisible} onClose={() => setForgotPasswordModalVisible(false)} />
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
        justifyContent: 'center',
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
        marginTop: 70,
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
        overflow: 'hidden',
    },
    animatedFormSlider: {
        flexDirection: 'row',
        width: (SCREEN_WIDTH - 2 * Spacing.xLarge) * 2,
    },
    formInnerContainer: {
        width: SCREEN_WIDTH - 2 * Spacing.xLarge,
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
    // ZMIANA 4: Nowe style dla lepszego pozycjonowania błędów
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
