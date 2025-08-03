import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert, Keyboard, Dimensions, ScrollView } from 'react-native';
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
import Animated, { useSharedValue, useAnimatedStyle, withSpring, interpolate, Extrapolate, interpolateColor } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

type LoginNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Komponent formularza logowania dla optymalizacji
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
        <TouchableOpacity style={[styles.googleButton, isLoading && styles.disabledGoogleButton]} onPress={onGoogleButtonPress} disabled={isLoading} >
            {isLoading ? <ActivityIndicator color={Colors.primary} /> : (
                <>
                    <Image source={require('../../assets/google-icon.png')} style={styles.googleIcon} />
                    <Text style={styles.googleButtonText}>Zaloguj się z Google</Text>
                </>
            )}
        </TouchableOpacity>
    </View>
));

// Komponent formularza rejestracji dla optymalizacji
const RegisterForm = React.memo(({ registerData, handleRegisterDataChange, emailError, passwordError, validateEmail, validatePassword, isLoading, isRegisterFormValid, handleRegister, onGoogleButtonPress, setPhoneModalVisible }: any) => (
    <View style={styles.formInnerContainer}>
        <TextInput style={[GlobalStyles.input, {marginBottom: Spacing.small}]} placeholder="Twój Nick" value={registerData.nickname} onChangeText={(val) => handleRegisterDataChange('nickname', val)} editable={!isLoading} placeholderTextColor={Colors.placeholder} />
        <TextInput 
            style={[GlobalStyles.input, {marginBottom: Spacing.small}, emailError ? styles.inputError : {}]} 
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

        <PasswordInput
            value={registerData.password}
            onChangeText={(val) => handleRegisterDataChange('password', val)}
            editable={!isLoading}
            containerStyle={[
                passwordError ? styles.inputError : {},
                !passwordError ? { marginBottom: Spacing.small } : {}
            ]}
            onBlur={() => validatePassword(registerData.password)}
            placeholder="Hasło (min. 6 znaków, litera i cyfra)"
        />
        {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
        
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
        <TouchableOpacity style={[styles.googleButton, isLoading && styles.disabledGoogleButton]} onPress={onGoogleButtonPress} disabled={isLoading} >
            {isLoading ? <ActivityIndicator color={Colors.primary} /> : (
                <>
                    <Image source={require('../../assets/google-icon.png')} style={styles.googleIcon} />
                    <Text style={styles.googleButtonText}>Zarejestruj z Google</Text>
                </>
            )}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.phoneButton, isLoading && styles.disabledGoogleButton]} onPress={() => setPhoneModalVisible(true)} disabled={isLoading}>
            <Feather name="phone" size={20} color={Colors.textPrimary} style={styles.googleIcon} />
            <Text style={styles.googleButtonText}>Użyj numeru telefonu</Text>
        </TouchableOpacity>
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
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [forgotPasswordModalVisible, setForgotPasswordModalVisible] = useState(false);
    
    const translateX = useSharedValue(0);
    const context = useSharedValue({ x: 0 });
    const FORM_CONTAINER_WIDTH = SCREEN_WIDTH - 2 * Spacing.xLarge;

    const gesture = Gesture.Pan()
        .onStart(() => {
            context.value = { x: translateX.value };
        })
        .onUpdate((event) => {
            const newTranslateX = context.value.x + event.translationX;
            translateX.value = Math.max(-FORM_CONTAINER_WIDTH, Math.min(0, newTranslateX));
        })
        .onEnd((event) => {
            if (event.translationX < -FORM_CONTAINER_WIDTH / 5 || event.velocityX < -500) {
                translateX.value = withSpring(-FORM_CONTAINER_WIDTH, { damping: 15 });
            } else if (event.translationX > FORM_CONTAINER_WIDTH / 5 || event.velocityX > 500) {
                translateX.value = withSpring(0, { damping: 15 });
            } else {
                translateX.value = withSpring(context.value.x, { damping: 15 });
            }
        });

    const animatedContainerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));
    
    const loginTextStyle = useAnimatedStyle(() => {
        const color = interpolateColor(
            translateX.value,
            [-FORM_CONTAINER_WIDTH, 0],
            [Colors.textSecondary, Colors.primary]
        );
        return { color };
    });

    const registerTextStyle = useAnimatedStyle(() => {
        const color = interpolateColor(
            translateX.value,
            [-FORM_CONTAINER_WIDTH, 0],
            [Colors.primary, Colors.textSecondary]
        );
        return { color };
    });
    
    const goToLogin = useCallback(() => {
        translateX.value = withSpring(0, { damping: 15 });
    }, []);

    const goToRegister = useCallback(() => {
        translateX.value = withSpring(-FORM_CONTAINER_WIDTH, { damping: 15 });
    }, []);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    const handleRegisterDataChange = (name: keyof typeof registerData, value: string) => {
        if (name === 'email') setEmailError('');
        if (name === 'password') setPasswordError('');
        setRegisterData(prevState => ({ ...prevState, [name]: value }));
    };
    
    const validateEmail = (email: string) => {
        const emailRegex = /\S+@\S+\.\S+/;
        if (!email.trim() || !emailRegex.test(email)) {
            setEmailError('Proszę podać poprawny adres e-mail.');
            return false;
        }
        setEmailError('');
        return true;
    };
    
    const validatePassword = (password: string) => {
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
        if (!password.trim() || !passwordRegex.test(password)) {
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
            Alert.alert("Zablokowano Dostęp", "Wykryliśmy nietypową aktywność. Dostęp został tymczasowo zablokowany. Spróbuj ponownie za kilka minut.");
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
            await user.sendEmailVerification();
            Alert.alert( "Link wysłany!", "Nowy link weryfikacyjny został wysłany na Twój adres e-mail.\n\nSprawdź swoją skrzynkę (również folder spam)." );
        } catch (error: any) {
            handleAuthError(error);
        }
    };

    const handleLogin = async () => {
        if (!identifier.trim() || !loginPassword.trim()) {
            showToast('Wszystkie pola są wymagane.', 'error');
            return;
        }
        setIsLoading(true);
        try {
            const userEmail = await findUserEmailByIdentifier(identifier);
            if (!userEmail) {
                showToast('Nie znaleziono użytkownika.', 'error');
                setIsLoading(false);
                return;
            }
            const userCredentials = await auth().signInWithEmailAndPassword(userEmail, loginPassword);
            await userCredentials.user.reload();
            const freshUser = auth().currentUser;
            if (freshUser && !freshUser.emailVerified) {
                Alert.alert(
                    "Konto niezweryfikowane", "Wygląda na to, że nie kliknąłeś jeszcze w link aktywacyjny.\n\nSprawdź swoją skrzynkę e-mail (również folder spam!).",
                    [ { text: "OK", onPress: () => auth().signOut() }, { text: "Wyślij link ponownie", onPress: () => handleResendVerification(freshUser) }]
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
            const userCredentials = await auth().createUserWithEmailAndPassword(email, password);
            await createNewUserInFirestore(userCredentials.user, nickname);
            await userCredentials.user.sendEmailVerification();
            await auth().signOut();
            Alert.alert(
                "Prawie gotowe!\nSprawdź swój e-mail",
                `Wysłaliśmy link weryfikacyjny na adres ${email}.\n\nKliknij go, aby dokończyć rejestrację, a następnie zaloguj się do aplikacji.`,
                [{ text: "Rozumiem", onPress: goToLogin }]
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
            await GoogleSignin.signIn();
            const { idToken } = await GoogleSignin.getTokens();
            if (!idToken) throw new Error("Brak tokena Google");
            const googleCredential = auth.GoogleAuthProvider.credential(idToken);
            const userCredential = await auth().signInWithCredential(googleCredential);
            const user = userCredential.user;

            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!userDoc.exists()) {
                navigation.navigate('Nickname', { user });
            }
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
  
    const isRegisterFormValid =
        registerData.nickname.trim().length > 0 &&
        /\S+@\S+\.\S+/.test(registerData.email) &&
        /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(registerData.password);

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.container}
        >
            <GestureDetector gesture={gesture}>
                <ScrollView 
                    contentContainerStyle={styles.scrollContentContainer} 
                    keyboardShouldPersistTaps="handled" 
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={isKeyboardVisible}
                >
                    <View style={styles.content}>
                        {!isKeyboardVisible && (
                            <View style={styles.headerContainer}>
                                <Image source={require('../../assets/icon.png')} style={styles.logo} />
                                <Text style={styles.header}>DailyFlow</Text>
                                <Text style={styles.subtitle}>Twoje centrum organizacji</Text>
                            </View>
                        )}
                        
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
                                <Animated.View style={[styles.animatedContainer, animatedContainerStyle]}>
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
                    </View>
                </ScrollView>
            </GestureDetector>
            <PhoneAuthModal visible={phoneModalVisible} onClose={() => setPhoneModalVisible(false)} />
            <ForgotPasswordModal visible={forgotPasswordModalVisible} onClose={() => setForgotPasswordModalVisible(false)} />
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: Colors.backgroundLight 
    },
    scrollContentContainer: { 
        flexGrow: 1, 
        justifyContent: 'center',
    },
    content: { 
        alignItems: 'center', 
        paddingHorizontal: Spacing.xLarge, 
        width: '100%',
    },
    headerContainer: {
        alignItems: 'center',
        paddingTop: Spacing.large,
    },
    formContainer: {
        width: '100%',
    },
    logo: { width: 100, height: 100, marginBottom: Spacing.medium },
    header: { fontSize: 40, fontWeight: '700', color: Colors.textPrimary },
    subtitle: { fontSize: 18, color: Colors.textSecondary, marginBottom: Spacing.xLarge },
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
    animatedContainer: {
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
    googleButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: Spacing.medium, width: '100%', justifyContent: 'center', },
    disabledGoogleButton: { opacity: 0.6, },
    googleIcon: { width: 24, height: 24, marginRight: Spacing.medium, },
    googleButtonText: { color: Colors.textPrimary, fontWeight: '600', fontSize: 16, },
    phoneButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: Spacing.medium, width: '100%', justifyContent: 'center', marginTop: Spacing.medium, },
    inputError: {
        borderColor: Colors.danger,
    },
    errorText: {
        color: Colors.danger,
        alignSelf: 'flex-start',
        marginLeft: Spacing.small,
        marginBottom: Spacing.small,
        marginTop: Spacing.xSmall,
    },
});

export default LoginScreen;