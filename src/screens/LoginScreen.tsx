import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Image, Dimensions, ScrollView, Platform, Keyboard, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LabeledInput from '../components/LabeledInput';
import PasswordInput from '../components/PasswordInput';
import { useNavigation } from '@react-navigation/native';
import auth, { FirebaseAuthTypes, getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from '../utils/authCompat';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useToast } from '../contexts/ToastContext';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import { useTheme, lightColors, darkColors } from '../contexts/ThemeContext';
import { getAccentColors, getSpherePalette, hexToRgb } from '../utils/themeUtils';
import { Feather } from '@expo/vector-icons';
import ActionModal from '../components/ActionModal';
import LinkAccountsModal from '../components/LinkAccountsModal';
import LinkAvailableModal from '../components/LinkAvailableModal';

import NicknameConflictModal from '../components/NicknameConflictModal';
import ForgotPasswordModal from '../components/ForgotPasswordModal';

import { createNewUserInFirestore, findUserEmailByIdentifier, popSuggestedLoginIdentifier, setSuggestedLoginIdentifier, mapFirebaseAuthErrorToMessage, upsertAuthProvidersForUser } from '../utils/authUtils';
import { AuthStackParamList } from '../types/navigation';
import Logger from '../utils/logger';
import { isStrongPassword, getPasswordValidationError, validateEmail as validateEmailUtil } from '../utils/validation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { doc, getDoc, collection, query, where, getDocs, limit } from '../utils/firestoreCompat';
import { db } from '../utils/firestoreCompat';

import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolateColor, interpolate, useAnimatedReaction, runOnJS, useDerivedValue, useAnimatedProps, withRepeat, withSequence, Easing, withDelay, cancelAnimation, useFrameCallback } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

type LoginNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT_FIXED } = Dimensions.get('window'); // Capture constant height
const FORM_CONTAINER_WIDTH = SCREEN_WIDTH - 2 * Spacing.xLarge;

const LOGO_WIDTH = SCREEN_WIDTH * 0.85; // Wider area
const LOGO_HEIGHT = 310; // Fixed height
const R_X = LOGO_WIDTH / 2;
const R_Y = LOGO_HEIGHT / 2;

const SPHERE_WOBBLE_X = 55;
const SPHERE_WOBBLE_Y = 25;

const SPRING_CONFIG = { damping: 20, stiffness: 150, mass: 1 };
let cachedSphereConfigs: any[] | null = null;
let cachedTopPadding = 0;

// Palettes and Accents are now handled dynamically via themeUtils


const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedText = Animated.createAnimatedComponent(Text);

// Individual Animated Sphere - Fully localized physics for maximum variety
const Sphere = React.memo(({ config, themeAnim, globalClock, index, lightPalette, darkPalette }: { config: any, themeAnim: Animated.SharedValue<number>, globalClock: Animated.SharedValue<number>, index: number, lightPalette: string[], darkPalette: string[] }) => {

    // Optimization: Split style into Position (runs every frame) and Color (runs rarely)
    const animatedPos = useAnimatedStyle(() => {
        const t = globalClock.value;
        const { speed, phaseX, phaseY } = config;

        const primaryTermX = (index % 2 === 0) ? Math.sin(t * speed + phaseX) : Math.cos(t * speed + phaseX);
        const primaryTermY = (index % 3 === 0) ? Math.cos(t * speed + phaseY) : Math.sin(t * speed + phaseY);

        const chaosTermX = Math.sin(t * 0.5 * speed + index);
        const chaosTermY = Math.cos(t * 0.3 * speed + index * 2);

        const tx = primaryTermX * SPHERE_WOBBLE_X + chaosTermX * 10;
        const ty = primaryTermY * SPHERE_WOBBLE_Y + chaosTermY * 10;

        return {
            transform: [{ translateX: tx }, { translateY: ty }]
        };
    });

    const animatedColor = useAnimatedStyle(() => {
        const backgroundColor = interpolateColor(
            themeAnim.value,
            [0, 1],
            [
                lightPalette[config.colorIndex % lightPalette.length],
                darkPalette[config.colorIndex % darkPalette.length]
            ]
        );
        return { backgroundColor };
    });

    return (
        <AnimatedView style={[styles.sphere, {
            top: config.top,
            left: config.left,
            width: config.size,
            height: config.size,
            borderRadius: config.size / 2
        }, animatedPos, animatedColor]}>
            <LinearGradient
                pointerEvents="none"
                // Static gradient overlay
                colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)']}
                start={{ x: 0.2, y: 0.2 }}
                end={{ x: 0.8, y: 0.8 }}
                style={[StyleSheet.absoluteFillObject as any, { borderRadius: config.size / 2 }]}
            />
        </AnimatedView>
    );
});

// Komponenty formularzy (zaktualizowane o animacje)
const LoginForm = React.memo(({ identifier, setIdentifier, loginPassword, setLoginPassword, isLoading, handleLogin, setForgotPasswordModalVisible, onGoogleButtonPress, theme, focusedOffset, themeAnim, accentColors }: any) => {
    const passwordInputRef = React.useRef<TextInput>(null);

    // Derived styles for form elements
    const forgotPassStyle = useAnimatedStyle(() => ({
        color: interpolateColor(themeAnim.value, [0, 1], [accentColors.light, accentColors.dark])
    }));

    const buttonBgStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(themeAnim.value, [0, 1], [accentColors.light, accentColors.dark])
    }));

    const googleBtnStyle = useAnimatedStyle(() => ({
        borderColor: interpolateColor(themeAnim.value, [0, 1], [lightColors.border, darkColors.border]),
        backgroundColor: interpolateColor(themeAnim.value, [0, 1], [lightColors.card, darkColors.card])
    }));

    const googleTextStyle = useAnimatedStyle(() => ({
        color: interpolateColor(themeAnim.value, [0, 1], [accentColors.light, accentColors.dark])
    }));

    const dividerStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(themeAnim.value, [0, 1], [lightColors.border, darkColors.border])
    }));

    const dividerTextStyle = useAnimatedStyle(() => ({
        color: interpolateColor(themeAnim.value, [0, 1], [lightColors.textSecondary, darkColors.textSecondary])
    }));

    return (
        <View style={styles.formInnerContainer}>
            <View style={styles.inputWrapper}>
                <LabeledInput
                    testID="login-identifier-input"
                    placeholder="Adres e-mail"
                    value={identifier}
                    onChangeText={setIdentifier}
                    autoCapitalize="none"
                    editable={!isLoading}
                    onFocus={() => { focusedOffset.value = -165; }}
                    themeAnim={themeAnim}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                    blurOnSubmit={false}
                />
            </View>
            <View style={styles.inputWrapper}>
                <PasswordInput
                    ref={passwordInputRef}
                    testID="login-password-input"
                    placeholder="Hasło"
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    editable={!isLoading}
                    onFocus={() => { focusedOffset.value = -165; }}
                    themeAnim={themeAnim}
                    returnKeyType="go"
                    onSubmitEditing={() => handleLogin()}
                />
            </View>
            <TouchableOpacity
                testID="forgot-password-button"
                style={styles.forgotPasswordButton}
                onPress={() => setForgotPasswordModalVisible(true)}
            >
                <AnimatedText style={[styles.forgotPasswordText, forgotPassStyle]}>Zapomniałem hasła</AnimatedText>
            </TouchableOpacity>
            <AnimatedTouchableOpacity
                testID="login-button"
                style={[GlobalStyles.button, styles.buttonMarginTop, buttonBgStyle]}
                onPress={async () => { handleLogin(); }}
                disabled={isLoading}
            >
                {isLoading ? <ActivityIndicator color="white" /> : <Text style={[GlobalStyles.buttonText, { color: 'white' }]}>Zaloguj się</Text>}
            </AnimatedTouchableOpacity>
            <View style={styles.dividerContainer}>
                <AnimatedView style={[styles.dividerLine, dividerStyle]} /><AnimatedText style={[styles.dividerText, dividerTextStyle]}>lub</AnimatedText><AnimatedView style={[styles.dividerLine, dividerStyle]} />
            </View>
            <AnimatedTouchableOpacity
                testID="google-login-button"
                style={[styles.socialButton, isLoading && styles.disabledGoogleButton, googleBtnStyle]}
                onPress={onGoogleButtonPress}
                disabled={isLoading}
            >
                {isLoading ? <ActivityIndicator color={Colors.primary} /> : (
                    <>
                        <Image source={require('../../assets/google-icon.png')} style={styles.socialIcon} />
                        <AnimatedText style={[styles.socialButtonText, googleTextStyle]}>Zaloguj się z Google</AnimatedText>
                    </>
                )}
            </AnimatedTouchableOpacity>
        </View>
    )
});


const RegisterForm = React.memo(({ registerData, handleRegisterDataChange, emailError, passwordError, validateEmail, validatePassword, isLoading, isRegisterFormValid, handleRegister, onGoogleButtonPress, theme, focusedOffset, themeAnim, registerButtonAnimatedStyle, registerButtonTextStyle, accentColors }: any) => {
    const emailInputRef = React.useRef<TextInput>(null);
    const passwordInputRef = React.useRef<TextInput>(null);

    const googleBtnStyle = useAnimatedStyle(() => ({
        borderColor: interpolateColor(themeAnim.value, [0, 1], [lightColors.border, darkColors.border]),
        backgroundColor: interpolateColor(themeAnim.value, [0, 1], [lightColors.card, darkColors.card])
    }));

    const googleTextStyle = useAnimatedStyle(() => ({
        color: interpolateColor(themeAnim.value, [0, 1], [accentColors.light, accentColors.dark])
    }));

    const dividerStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(themeAnim.value, [0, 1], [lightColors.border, darkColors.border])
    }));

    const dividerTextStyle = useAnimatedStyle(() => ({
        color: interpolateColor(themeAnim.value, [0, 1], [lightColors.textSecondary, darkColors.textSecondary])
    }));

    return (
        <View style={styles.formInnerContainer}>
            <View style={styles.inputWrapper}>
                <LabeledInput
                    testID="register-nickname-input"
                    placeholder="Nick"
                    value={registerData.nickname}
                    onChangeText={(val: string) => handleRegisterDataChange('nickname', val)}
                    editable={!isLoading}
                    onFocus={() => { focusedOffset.value = -165; }}
                    themeAnim={themeAnim}
                    returnKeyType="next"
                    onSubmitEditing={() => emailInputRef.current?.focus()}
                    blurOnSubmit={false}
                />
            </View>
            <View style={styles.inputWrapper}>
                <LabeledInput
                    ref={emailInputRef}
                    testID="register-email-input"
                    value={registerData.email}
                    onChangeText={(val: string) => handleRegisterDataChange('email', val)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isLoading}
                    onBlur={() => validateEmail(registerData.email)}
                    inputStyle={emailError ? styles.inputError : undefined}
                    placeholder="Adres e-mail"
                    onFocus={() => { focusedOffset.value = -165; }}
                    themeAnim={themeAnim}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                    blurOnSubmit={false}
                />
                {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}
            </View>
            <View style={styles.inputWrapper}>
                <PasswordInput
                    ref={passwordInputRef}
                    testID="register-password-input"
                    value={registerData.password}
                    onChangeText={(val: string) => handleRegisterDataChange('password', val)}
                    editable={!isLoading}
                    placeholder="Hasło"
                    onBlur={() => validatePassword(registerData.password)}
                    containerStyle={passwordError ? (styles.inputError as any) : undefined}
                    onFocus={() => { focusedOffset.value = -165; }}
                    themeAnim={themeAnim}
                    returnKeyType="go"
                    onSubmitEditing={() => { if (!isLoading && isRegisterFormValid) handleRegister(); }}
                />
                {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
            </View>
            <AnimatedTouchableOpacity
                testID="register-button"
                style={[
                    GlobalStyles.button,
                    styles.buttonMarginTop,
                    registerButtonAnimatedStyle
                ]}
                onPress={async () => { if (isLoading || !isRegisterFormValid) return; handleRegister(); }}
                disabled={isLoading || !isRegisterFormValid}
            >
                {isLoading ? <ActivityIndicator color="white" /> : <AnimatedText style={[GlobalStyles.buttonText, registerButtonTextStyle]}>Stwórz konto</AnimatedText>}
            </AnimatedTouchableOpacity>
            <View style={styles.dividerContainer}>
                <AnimatedView style={[styles.dividerLine, dividerStyle]} /><AnimatedText style={[styles.dividerText, dividerTextStyle]}>lub</AnimatedText><AnimatedView style={[styles.dividerLine, dividerStyle]} />
            </View>
            <View style={styles.socialButtonsContainer}>
                <AnimatedTouchableOpacity
                    testID="google-register-button"
                    style={[styles.socialButton, isLoading && styles.disabledGoogleButton, googleBtnStyle]}
                    onPress={() => onGoogleButtonPress(registerData.nickname)}
                    disabled={isLoading}
                >
                    {isLoading ? <ActivityIndicator color={Colors.primary} /> : (
                        <>
                            <Image source={require('../../assets/google-icon.png')} style={styles.socialIcon} />
                            <AnimatedText style={[styles.socialButtonText, googleTextStyle]}>Zarejestruj się przez Google</AnimatedText>
                        </>
                    )}
                </AnimatedTouchableOpacity>
            </View>
        </View >
    )
});





const LoginScreen = () => {
    const navigation = useNavigation<LoginNavigationProp>();
    const theme = useTheme();
    const accentColors = useMemo(() => getAccentColors(theme.accent), [theme.accent]);
    const lightAccentRgb = useMemo(() => hexToRgb(accentColors.light), [accentColors]);
    const darkAccentRgb = useMemo(() => hexToRgb(accentColors.dark), [accentColors]);
    const sphereLightPalette = useMemo(() => getSpherePalette(theme.accent, 'light'), [theme.accent]);
    const sphereDarkPalette = useMemo(() => getSpherePalette(theme.accent, 'dark'), [theme.accent]);

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
    const [loginSuggestionVisible, setLoginSuggestionVisible] = useState(false);
    const [loginSuggestionEmail, setLoginSuggestionEmail] = useState<string>('');
    const [loginSuggestionHasPassword, setLoginSuggestionHasPassword] = useState(false);
    const [loginSuggestionHasGoogle, setLoginSuggestionHasGoogle] = useState(false);
    const [forgotPasswordModalVisible, setForgotPasswordModalVisible] = useState(false);

    // Reverse Linking State
    const [linkAvailableModalVisible, setLinkAvailableModalVisible] = useState(false);
    const [nicknameConflictModalVisible, setNicknameConflictModalVisible] = useState(false);

    const [pendingReverseLinkData, setPendingReverseLinkData] = useState<{ email: string; password: string; nickname: string } | null>(null);
    const [googleAccountNickname, setGoogleAccountNickname] = useState('');
    const [pendingGoogleCredentialForLink, setPendingGoogleCredentialForLink] = useState<any>(null);

    const progress = useSharedValue(0);
    const swipeDirection = useSharedValue(1);
    const targetProgress = useSharedValue(0);
    const isTransitioning = useSharedValue(false);
    const keyboardProgress = useSharedValue(0);
    const focusedOffset = useSharedValue(-165); // Dynamic offset for keyboard push (-10, -40, -165) - Increased to account for edge-to-edge nav bar
    // Removed currentTab state to improve performance (using shared values instead)
    const [dynamicTopPadding, setDynamicTopPadding] = useState(cachedTopPadding);
    const [topLocked, setTopLocked] = useState(!!cachedTopPadding);
    const [logoWidth, setLogoWidth] = useState(LOGO_WIDTH);
    const [logoHeight, setLogoHeight] = useState(LOGO_HEIGHT);

    // Single shared clock for ALL particles - drastic performance improvement
    const globalClock = useSharedValue(0);

    const [isPaused, setIsPaused] = useState(true);

    // Optimizaton: Driver moved to UI thread via useFrameCallback
    // This removes JS thread bottleneck and prevents lags
    useFrameCallback((frameInfo) => {
        if (!isPaused && frameInfo.timeSincePreviousFrame) {
            const safeDelta = Math.min(frameInfo.timeSincePreviousFrame, 100);
            globalClock.value += (safeDelta / 1000) * 0.05;
        }
    });

    // Cleaned up old manual RAF refs/effects

    const togglePause = () => {
        if (isPaused) {
            setIsPaused(false);
            // Effect will re-trigger and start animation
        } else {
            setIsPaused(true);
            // frameCallback activity is handled by useEffect
        }
    };

    // Theme Transition Logic - Optimized for Memoization stability
    const [displayMode, setDisplayMode] = useState(theme.colorScheme); // Local state for immediate icon switch
    const themeAnim = useSharedValue(theme.colorScheme === 'dark' ? 1 : 0);

    // Sync local state if theme changes externally (e.g. system)
    useEffect(() => {
        if (theme.colorScheme !== displayMode) {
            setDisplayMode(theme.colorScheme);
        }
    }, [theme.colorScheme]);

    useEffect(() => {
        themeAnim.value = withTiming(theme.colorScheme === 'dark' ? 1 : 0, { duration: 300 });
    }, [theme.colorScheme]);

    const animatedMainBg = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(themeAnim.value, [0, 1], [lightColors.background, darkColors.background])
    }));

    const animatedIconStyle = useAnimatedStyle(() => ({
        color: interpolateColor(themeAnim.value, [0, 1], [lightColors.textPrimary, darkColors.textPrimary])
    }));


    const headerLightStyle = useAnimatedStyle(() => ({
        opacity: interpolate(themeAnim.value, [0, 1], [1, 0])
    }));

    const headerDarkStyle = useAnimatedStyle(() => ({
        opacity: interpolate(themeAnim.value, [0, 1], [0, 1])
    }));

    const animatedHeaderSubtitle = useAnimatedStyle(() => ({
        color: interpolateColor(themeAnim.value, [0, 1], ['#555', darkColors.textSecondary])
    }));

    const animatedSwitcherStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(themeAnim.value, [0, 1], ['rgba(0,0,0,0.05)', 'rgba(255,255,255,0.1)'])
    }));

    // Moved outside to prevent re-creation on render
    const AnimatedFeather = Animated.createAnimatedComponent(Feather);


    const KEYBOARD_UP_TRANSLATE_Y = -120;
    const HEADER_HEIGHT_ESTIMATE = 130;
    const HEADER_MARGIN_BOTTOM = Spacing.xLarge;

    // Konfiguracje kulek – niejednorodna gęstość i dopuszczenie częściowych nakładan
    const sphereConfigs = useMemo(() => {
        const targetCount = 64; // Restored to original count
        // Ellipse dimensions
        const rX = logoWidth / 2;
        const rY = logoHeight / 2;

        // START CACHING LOGIC
        if (cachedSphereConfigs) return cachedSphereConfigs;

        type Sphere = { top: number; left: number; size: number; colorIndex: number; cx: number; cy: number; phaseX: number; phaseY: number; speed: number; radius: number };
        const items: Sphere[] = [];
        const maxAttempts = 15000;
        let attempts = 0;
        const baseMinGap = 1.0;

        // Define hotspots based on Ellipse
        const hotspot1 = { x: rX + 0.35 * rX, y: rY - 0.15 * rY };
        const hotspot2 = { x: rX - 0.30 * rX, y: rY + 0.20 * rY };

        const boundaryPaddingX = SPHERE_WOBBLE_X + 2;
        const boundaryPaddingY = SPHERE_WOBBLE_Y + 2;
        const verticalReduction = 10;

        while (items.length < targetCount && attempts < maxAttempts) {
            attempts++;
            const size = 9 + Math.random() * 18;
            const mix = Math.random();
            let cx: number, cy: number;

            // Generate within an ellipse
            // Formula: x = rx * cos(t), y = ry * sin(t)
            // Area distribution: r = sqrt(random)

            const safeRx = rX - size / 2 - boundaryPaddingX;
            const safeRy = rY - size / 2 - boundaryPaddingY;

            if (mix < 0.35) {
                // Uniform Ellipse
                const theta = Math.random() * Math.PI * 2;
                const rr = Math.sqrt(Math.random()); // 0-1
                cx = rX + (rr * safeRx) * Math.cos(theta);
                cy = rY + (rr * safeRy) * Math.sin(theta);
            } else if (mix < 0.65) {
                // hotspot 1
                const theta = Math.random() * Math.PI * 2;
                const rr = Math.sqrt(Math.random()) * 0.55;
                cx = hotspot1.x + (rr * safeRx) * Math.cos(theta);
                cy = hotspot1.y + (rr * safeRy) * Math.sin(theta);
            } else {
                // hotspot 2
                const theta = Math.random() * Math.PI * 2;
                const rr = Math.sqrt(Math.random()) * 0.50;
                cx = hotspot2.x + (rr * safeRx) * Math.cos(theta);
                cy = hotspot2.y + (rr * safeRy) * Math.sin(theta);
            }

            // Safety check against Elliptical boundaries
            // (x-h)^2/rx^2 + (y-k)^2/ry^2 <= 1
            const dx = cx - rX;
            const dy = cy - rY;

            const normalizedDist = (dx * dx) / (safeRx * safeRx) + (dy * dy) / (safeRy * safeRy);
            if (normalizedDist > 1.0) continue;

            // Vertical Restriction
            if (cy < verticalReduction || cy > (2 * rY - verticalReduction)) continue;

            let ok = true;
            for (let i = 0; i < items.length; i++) {
                const other = items[i];
                const optDx = other.cx - cx;
                const optDy = other.cy - cy;
                const dist = Math.hypot(optDx, optDy);
                const desiredGap = baseMinGap + (Math.random() < 0.15 ? -2 : 0);
                const minDist = (other.size + size) / 2 + desiredGap;
                if (dist < minDist) { ok = false; break; }
            }
            if (!ok && Math.random() < 0.35) {
                ok = true;
            }
            if (!ok) continue;

            const colorIndex = Math.floor(Math.random() * 5);
            const phaseX = Math.random() * 2 * Math.PI;
            const phaseY = Math.random() * 2 * Math.PI;
            const speed = 0.5 + Math.random() * 1.5;
            const radius = 5 + Math.random() * 6;

            items.push({
                cx,
                cy,
                left: cx - size / 2,
                top: cy - size / 2,
                size,
                colorIndex,
                phaseX,
                phaseY,
                speed,
                radius
            });
        }
        cachedSphereConfigs = items.map(({ cx, cy, ...rest }) => rest);
        return cachedSphereConfigs;
    }, []);

    const isEmailValidCheck = (email: string) => /\S+@\S+\.\S+/.test(email);
    const isPasswordValidCheck = (password: string) => getPasswordValidationError(password) === null;

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
        const error = getPasswordValidationError(password);
        if (error) {
            setPasswordError(error);
            return false;
        }
        setPasswordError('');
        return true;
    };
    const openLoginSuggestion = async (email: string, methods: string[] | null, registerData: any = null) => {
        const normalizedEmail = (email || '').trim().toLowerCase();
        setLoginSuggestionEmail(normalizedEmail);
        let resolvedMethods: string[] = Array.isArray(methods) ? methods : [];
        if (!methods) {
            try { resolvedMethods = await auth().fetchSignInMethodsForEmail(normalizedEmail); } catch { resolvedMethods = []; }
            // Dodatkowy fallback: sprawdź bieżące sesje Google
            try {
                const current = await GoogleSignin.getCurrentUser();
                if (current?.user?.email?.toLowerCase() === normalizedEmail && !resolvedMethods.includes('google.com')) {
                    resolvedMethods.push('google.com');
                }
            } catch { }
        }
        let hasPassword = !!resolvedMethods?.includes('password');
        let hasGoogle = !!resolvedMethods?.includes('google.com');

        // Fallback: Check publicUsers
        try {
            let snap = await getDocs(query(collection(db, 'publicUsers'), where('emailLower', '==', normalizedEmail), limit(1)) as any);
            const data = snap.docs[0]?.data() as any;
            if (data) {
                if (data.hasGoogle) hasGoogle = true;
                if (data.hasPassword) hasPassword = true;
            }
        } catch { }

        // Last Resort Fallback: If it's a Gmail address, assume Google might be an option
        if (!hasGoogle && normalizedEmail.endsWith('@gmail.com')) {
            hasGoogle = true;
        }


        // Should we pre-set the linking data?
        if (hasGoogle && registerData) {
            setPendingReverseLinkData({
                email: registerData.email,
                password: registerData.password,
                nickname: registerData.nickname
            });
        }

        setLoginSuggestionHasPassword(hasPassword);
        setLoginSuggestionHasGoogle(hasGoogle);
        setLoginSuggestionVisible(true);
    };

    const handleAuthError = (error: any) => {
        const code = String(error?.code || '');
        if (code === 'auth/email-already-in-use') {
            const email = registerData.email || identifier;
            openLoginSuggestion(email, null, registerData.email ? registerData : null).catch(() => { });
            return;
        }
        const { message, level } = mapFirebaseAuthErrorToMessage(code);
        // Split long messages for better readability in Toast
        const formattedMessage = (code === 'auth/invalid-credential' || message.includes('Nieprawidłowe dane'))
            ? 'Nieprawidłowe dane logowania.\nSprawdź identyfikator i hasło.'
            : message;
        showToast(formattedMessage, level);
    };
    const handleResendVerification = async (user: FirebaseAuthTypes.User) => { try { await user.sendEmailVerification(); showToast('Nowy link weryfikacyjny został wysłany.\nSprawdź skrzynkę (także spam).', 'success'); } catch (error: any) { handleAuthError(error); } };
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
            } catch { }
            const userCredentials = await createUserWithEmailAndPassword(getAuth(), email, password);
            await createNewUserInFirestore(userCredentials.user, nickname);
            await userCredentials.user.sendEmailVerification();
            setEmailVerificationUser(userCredentials.user);
            setEmailVerificationDialogVisible(true);
            try { await setSuggestedLoginIdentifier(email); } catch { }
        } catch (error: any) {
            const code = String(error?.code || '');
            if (code === 'auth/email-already-in-use') {
                // Check if it's a Google account to offer caching (Reverse Linking)
                try {
                    const methods = await auth().fetchSignInMethodsForEmail(registerData.email);
                    if (methods && (methods.includes('google.com') || methods.includes('google'))) {
                        setPendingReverseLinkData({
                            email: registerData.email,
                            password: registerData.password,
                            nickname: registerData.nickname
                        });
                        setLinkAvailableModalVisible(true);
                        return;
                    }
                    // NEW: If explicit Google linking didn't catch it, but account exists, double check if we can link
                } catch (e) {
                    Logger.warn('Failed to fetch methods for existing email', e);
                }

                // Fallback to old suggestion logic if not Google or if check failed
                try {
                    const email = registerData.email;
                    const methods = email ? await auth().fetchSignInMethodsForEmail(email) : [];
                    await openLoginSuggestion(email, methods, registerData);
                    return;
                } catch { }
            }
            handleAuthError(error);
        } finally {
            setIsLoading(false);
        }
    };
    const onGoogleButtonPress = async (arg?: string | any) => {
        const suggestedNickname = (typeof arg === 'string') ? arg : undefined;
        // DEBUG: Uncomment to verify what nickname is being passed
        // if (suggestedNickname) showToast(`Rejestracja z nickiem: ${suggestedNickname}`, 'info'); 
        setIsLoading(true);
        try {
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            await GoogleSignin.signOut().catch(() => { });
            const signInResp: any = await GoogleSignin.signIn();
            let idToken = signInResp?.idToken || signInResp?.data?.idToken;
            if (!idToken) {
                try { const tokens = await GoogleSignin.getTokens(); idToken = tokens?.idToken || null; } catch { }
            }
            if (!idToken) {
                try { const silent: any = await GoogleSignin.signInSilently(); idToken = silent?.idToken || silent?.data?.idToken || null; } catch { }
            }
            if (!idToken) { showToast('Logowanie anulowane.', 'info'); return; }
            if (!idToken) {
                idToken = (await GoogleSignin.getTokens())?.idToken;
            }
            if (!idToken) {
                const silent: any = await GoogleSignin.signInSilently().catch(() => null);
                idToken = silent?.idToken || null;
            }
            if (!idToken) throw new Error('Brak tokena Google');
            const googleCredential = GoogleAuthProvider.credential(idToken);

            const currentUserInfo = await GoogleSignin.getCurrentUser();
            const email = signInResp?.user?.email || currentUserInfo?.user?.email;
            if (email) {
                try {
                    const methods = await auth().fetchSignInMethodsForEmail(email);
                    let hasPassword = methods.includes('password');
                    let hasGoogle = methods.includes('google.com');
                    // Dodatkowy fallback: sprawdź publiczny profil
                    try {
                        const snap = await getDocs(query(collection(db, 'publicUsers'), where('emailLower', '==', email.toLowerCase()), limit(1)) as any);
                        const data = snap.docs[0]?.data() as any;
                        if (data?.hasPassword) hasPassword = true;
                        if (data?.hasGoogle) hasGoogle = true;
                    } catch {
                        // Brak uprawnień lub offline – pomiń fallback, bazuj na methods
                    }
                    if (hasPassword && !hasGoogle) {
                        // Konto już istnieje z hasłem – zapytaj o połączenie
                        setPendingGoogleCredential(googleCredential);
                        setLinkEmail(email);
                        setLinkModalVisible(true);
                        return;
                    }
                } catch { }
            }

            const userCredential = await signInWithCredential(getAuth(), googleCredential);
            const user = userCredential.user;
            // Removed upsertAuthProvidersForUser here to prevent premature userDoc creation.
            // It will be handled in NicknameScreen (for new users) or below (for existing users via merge).
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!userDoc.exists()) {
                // If we have a nickname from the register form, use it immediately
                if (suggestedNickname && suggestedNickname.trim().length > 0) {
                    await createNewUserInFirestore(user, suggestedNickname);
                    await upsertAuthProvidersForUser(user);
                    // No navigation needed, user is created
                } else {
                    navigation.navigate('Nickname');
                }
            } else {
                // User exists - update providers now that we know it's safe
                try { await upsertAuthProvidersForUser(user); } catch { }
                // Użytkownik istnieje, ale jeśli brak nickname – również poproś o uzupełnienie
                try {
                    const data = userDoc.data() as any;
                    // Fix: Check for empty nickname explicitly and ensure we don't skip if it's just a default "New User" from some other flow (though unlikely here)
                    if (!data?.nickname || String(data.nickname).trim().length === 0) {
                        navigation.navigate('Nickname');
                    } else if (suggestedNickname && suggestedNickname.trim().length > 0 && suggestedNickname !== data.nickname) {
                        // FORCE UPDATE: If user is on Register tab and provided a nick, usage of Google Button implies intent to use this nick.
                        // Even if account exists (e.g. from previous tests or unlinked state), we update it to match user expectation.
                        await createNewUserInFirestore(user, suggestedNickname);
                        await upsertAuthProvidersForUser(user);
                    }
                } catch { }
            }
        } catch (error: any) {
            const code = String(error?.code || '')
            if (code === '12501' || code === 'SIGN_IN_CANCELLED') {
                showToast('Logowanie anulowane.', 'info');
            } else if (code === 'auth/account-exists-with-different-credential') {
                setLinkEmail(error?.email || linkEmail);
                setPendingGoogleCredential(error?.credential || pendingGoogleCredential);
                setLinkModalVisible(true);
            } else if (code === '12500' || code === 'sign_in_failed' || code === 'DEVELOPER_ERROR' || code === '10') {
                showToast('Problem z konfiguracją Google.\nSprawdź webClientId i klucze SHA.', 'error');
            } else if (code === 'NETWORK_ERROR') {
                showToast('Brak połączenia z siecią. Spróbuj ponownie.', 'error');
            } else {
                // Tłumaczymy techniczne błędy na czytelny komunikat (bez surowych treści)
                if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
                    showToast('Logowanie anulowane.', 'info');
                } else if (code.includes('auth/')) {
                    const { message } = mapFirebaseAuthErrorToMessage(code);
                    showToast(message, 'error');
                } else {
                    Logger.warn('[GoogleLogin]', error); // Log internal for debug
                    showToast('Nie udało się zalogować przez Google. Spróbuj ponownie lub użyj e-maila.', 'error');
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleReverseLinkGoogleLogin = async () => {
        setLinkAvailableModalVisible(false);
        setIsLoading(true);
        try {
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            await GoogleSignin.signOut().catch(() => { });
            const signInResp: any = await GoogleSignin.signIn();
            let idToken = signInResp?.idToken || signInResp?.data?.idToken;
            if (!idToken) {
                const tokens = await GoogleSignin.getTokens().catch(() => null);
                idToken = tokens?.idToken;
            }
            if (!idToken) throw new Error('Brak tokena Google');

            const googleCredential = GoogleAuthProvider.credential(idToken);

            // 1. Log in immediately to establish permissions
            const userCred = await signInWithCredential(getAuth(), googleCredential);
            const user = userCred.user;

            // 2. Fetch authoritative nickname from Firestore
            let currentNickname = '';
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data() as any;
                    currentNickname = data.nickname || '';
                }
            } catch (e) {
                Logger.warn('Nickname lookup failed', e);
            }

            // Fallback to Google name if DB nickname not found (and currently empty)
            if (!currentNickname && user.displayName) {
                currentNickname = user.displayName;
            }

            // 3. IMPORTANT: Sign OUT temporarily to prevent AppNavigator from switching to Main App
            // This allows the LoginScreen (and Modal) to stay mounted while user decides.
            await getAuth().signOut();

            // 4. Check for conflict with pending registration data
            if (pendingReverseLinkData) {
                const oldNick = currentNickname || 'Twoje konto';

                // Show modal if nicknames differ
                if (oldNick !== pendingReverseLinkData.nickname) {
                    setGoogleAccountNickname(oldNick);
                    setPendingGoogleCredentialForLink(googleCredential); // Store credential to re-login later
                    setNicknameConflictModalVisible(true);
                    setIsLoading(false);
                    return;
                }
            }

            // No conflict, finalize (re-login and update)
            await finalizeReverseLink(pendingReverseLinkData?.nickname || currentNickname || '', googleCredential);

        } catch (error: any) {
            handleAuthError(error);
            setIsLoading(false);
        }
    };

    const finalizeReverseLink = async (finalNickname: string, credential?: any) => {
        try {
            if (!pendingReverseLinkData) return;
            setIsLoading(true);

            let user = getAuth().currentUser;

            // If signed out (due to modal flow), sign in again
            if (!user) {
                if (!credential) throw new Error('Cannot finalize link without credential');
                const userCred = await signInWithCredential(getAuth(), credential);
                user = userCred.user;
            }

            if (!user) throw new Error('Authentication failed');

            // 2. Add Password Credential
            await user.updatePassword(pendingReverseLinkData.password);

            // 3. Update Firestore (merges authProviders automatically in createNewUserInFirestore)
            // Ensure we use the chosen nickname
            await createNewUserInFirestore(user, finalNickname);
            await upsertAuthProvidersForUser(user);

            showToast('Konto połączone pomyślnie. Dodano hasło.', 'success');
            setPendingReverseLinkData(null);
            setNicknameConflictModalVisible(false);
            setPendingGoogleCredentialForLink(null);
            // User is now signed in and updated
        } catch (error: any) {
            handleAuthError(error);
        } finally {
            setIsLoading(false);
        }
    };

    const isRegisterFormValid = registerData.nickname.trim().length > 0 && isEmailValidCheck(registerData.email) && isPasswordValidCheck(registerData.password);

    // Hoisted Animation Logic for Register Button
    const isRegisterValidAnim = useDerivedValue(() => {
        return withTiming(isLoading || !isRegisterFormValid ? 0 : 1, { duration: 200 });
    }, [isLoading, isRegisterFormValid]);

    const registerButtonAnimatedStyle = useAnimatedStyle(() => {
        const r = interpolate(themeAnim.value, [0, 1], [lightAccentRgb.r, darkAccentRgb.r], 'clamp');
        const g = interpolate(themeAnim.value, [0, 1], [lightAccentRgb.g, darkAccentRgb.g], 'clamp');
        const b = interpolate(themeAnim.value, [0, 1], [lightAccentRgb.b, darkAccentRgb.b], 'clamp');

        const lightInactiveAlpha = 0.5;
        const darkInactiveAlpha = 0.3;
        const activeAlpha = 1.0;

        const currentInactiveAlpha = interpolate(themeAnim.value, [0, 1], [lightInactiveAlpha, darkInactiveAlpha], 'clamp');
        const alpha = interpolate(isRegisterValidAnim.value, [0, 1], [currentInactiveAlpha, activeAlpha], 'clamp');

        return {
            backgroundColor: `rgba(${r},${g},${b},${alpha})`,
        };
    }, [themeAnim, isRegisterValidAnim, lightAccentRgb, darkAccentRgb]);

    const registerButtonTextStyle = useAnimatedStyle(() => {
        const lightTextAlpha = 1.0;
        const darkTextInactiveAlpha = 0.5;
        const darkTextActiveAlpha = 1.0;

        const darkCurrentAlpha = interpolate(isRegisterValidAnim.value, [0, 1], [darkTextInactiveAlpha, darkTextActiveAlpha], 'clamp');
        const alpha = interpolate(themeAnim.value, [0, 1], [lightTextAlpha, darkCurrentAlpha], 'clamp');

        return {
            color: `rgba(255,255,255,${alpha})`
        };
    });

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


    const animatedContainerStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: interpolate(keyboardProgress.value, [0, 1], [Spacing.large, focusedOffset.value]) }],
        };
    });

    const animatedHeaderStyle = useAnimatedStyle(() => ({
        opacity: interpolate(keyboardProgress.value, [0, 0.5], [1, 0]),
        height: interpolate(keyboardProgress.value, [0, 1], [HEADER_HEIGHT_ESTIMATE, 0]),
        marginBottom: HEADER_MARGIN_BOTTOM,
        transform: [{ translateY: -20 }], // Shift up visually without affecting form layout
    }));

    const animatedThemeSwitcherStyle = useAnimatedStyle(() => ({
        opacity: interpolate(keyboardProgress.value, [0, 0.2], [1, 0]),
        transform: [{ scale: interpolate(keyboardProgress.value, [0, 0.2], [1, 0.8]) }],
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
            if ((Math.abs(event.translationX) > 40 && Math.abs(event.translationX) > Math.abs(event.translationY)) || Math.abs(event.velocityX) > 400) {
                const isSwipingRight = event.translationX > 0;
                // POPRAWKA 1: Logika kierunku jest teraz w pełni kontekstowa
                if (progress.value === 0) { // Na ekranie logowania
                    swipeDirection.value = isSwipingRight ? -1 : 1;
                } else { // Na ekranie rejestracji
                    swipeDirection.value = isSwipingRight ? 1 : -1;
                }
                isTransitioning.value = true;
                const newTargetProgress = targetProgress.value === 0 ? 1 : 0;
                targetProgress.value = newTargetProgress;
                // Update tab state for swipe gestures
                if (newTargetProgress === 0) {
                    // runOnJS(setCurrentTab)(0); // Removed for performance
                } else {
                    // runOnJS(setCurrentTab)(1); // Removed for performance
                }
            }
        });



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
    ].filter(Boolean).join('\n');

    // Animated styles for tabs
    // Animated styles for tabs
    // Animated styles for tabs
    // Stable colors for Reanimated to avoid flickering
    // Animated styles for tabs
    // Combine Theme Animation (themeAnim) + Swipe Animation (progress)
    const loginTabStyle = useAnimatedStyle(() => {
        const activeColor = interpolateColor(themeAnim.value, [0, 1], [accentColors.light, accentColors.dark]);
        return {
            backgroundColor: interpolateColor(progress.value, [0, 1], [activeColor, 'transparent']),
        };
    }, [themeAnim, progress, accentColors]);

    const registerTabStyle = useAnimatedStyle(() => {
        const activeColor = interpolateColor(themeAnim.value, [0, 1], [accentColors.light, accentColors.dark]);
        return {
            backgroundColor: interpolateColor(progress.value, [0, 1], ['transparent', activeColor]),
        };
    }, [themeAnim, progress, accentColors]);

    const loginTextStyle = useAnimatedStyle(() => {
        const secondary = interpolateColor(themeAnim.value, [0, 1], [lightColors.textSecondary, darkColors.textSecondary]);
        return {
            color: interpolateColor(progress.value, [0, 1], ['white', secondary]),
        };
    });

    const registerTextStyle = useAnimatedStyle(() => {
        const secondary = interpolateColor(themeAnim.value, [0, 1], [lightColors.textSecondary, darkColors.textSecondary]);
        return {
            color: interpolateColor(progress.value, [0, 1], [secondary, 'white']),
        };
    });

    return (
        <AnimatedView style={[styles.container, animatedMainBg]}>
            <View
                style={[
                    styles.scrollContentContainer,
                    { paddingTop: Spacing.xxLarge, paddingBottom: Platform.OS === 'ios' ? Spacing.xxLarge + Spacing.small : Spacing.xxLarge }
                ]}
            >
                {/* Theme Switcher Button */}
                {/* Pause/Play Animation Button - Placed Left */}
                <AnimatedTouchableOpacity
                    style={[
                        styles.themeSwitcher, // Reuse style for consistent look
                        {
                            top: Platform.OS === 'ios' ? 65 : 45,
                            left: 20, // Left side
                            right: undefined, // Override right
                        },
                        animatedThemeSwitcherStyle, // Added to hide on keyboard
                        animatedSwitcherStyle
                    ]}
                    onPress={togglePause}
                    accessibilityRole="button"
                    accessibilityLabel={isPaused ? "Wznów animację tła" : "Zatrzymaj animację tła"}
                    accessibilityHint="Włącza lub wyłącza animowane kulki w tle"
                >
                    {/* Use explicit color interpolation via style to fix flicker */}
                    <AnimatedFeather
                        name={isPaused ? 'play' : 'pause'}
                        size={22}
                        style={animatedIconStyle}
                    />
                </AnimatedTouchableOpacity>

                {/* Theme Switcher Button */}
                <AnimatedTouchableOpacity
                    style={[
                        styles.themeSwitcher,
                        {
                            top: Platform.OS === 'ios' ? 65 : 45 // Moved down slightly
                        },
                        animatedThemeSwitcherStyle,
                        animatedSwitcherStyle
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={displayMode === 'dark' ? "Przełącz na jasny motyw" : "Przełącz na ciemny motyw"}
                    accessibilityHint="Zmienia kolorystykę aplikacji pomiędzy trybem jasnym i ciemnym"
                    onPress={() => {
                        const now = Date.now();
                        if (now - (theme as any).lastSwitchTime > 500 || !(theme as any).lastSwitchTime) {
                            (theme as any).lastSwitchTime = now;
                            const nextScheme = displayMode === 'dark' ? 'light' : 'dark';

                            // 1. Immediate local updates
                            setDisplayMode(nextScheme);
                            themeAnim.value = withTiming(nextScheme === 'dark' ? 1 : 0, { duration: 300 });

                            // 2. Defer heavy React Context update
                            requestAnimationFrame(() => {
                                theme.setMode(nextScheme);
                            });
                        }
                    }}
                // disabled prop removed to prevent blocking
                >
                    <AnimatedFeather
                        name={displayMode === 'dark' ? 'sun' : 'moon'}
                        size={22}
                        style={animatedIconStyle}
                    />
                </AnimatedTouchableOpacity>



                <Animated.View
                    style={[styles.contentContainer, animatedContainerStyle]}
                    onLayout={() => { }} // Disabled dynamic calculation to fix jumping switcher
                >
                    <Animated.View style={[animatedHeaderStyle, { marginTop: 0 }]}>
                        <View style={styles.headerContainer}>
                            <View style={[styles.logoBackground, { width: logoWidth, height: logoHeight, marginBottom: Spacing.large }]}>
                                {/* Spheres Container - Memoized to prevent re-layout */}
                                <View style={[
                                    styles.logoContainer,
                                    {
                                        width: logoWidth,
                                        height: logoHeight,
                                        borderRadius: logoHeight / 2, // Pill shape or oval
                                        overflow: 'visible',
                                        backgroundColor: 'transparent',
                                    }
                                ]}>
                                    {/* Layer Approach: Direct mapping for individual variety */}
                                    {sphereConfigs.map((s, idx) => (
                                        <Sphere
                                            key={idx}
                                            config={s}
                                            themeAnim={themeAnim}
                                            globalClock={globalClock}
                                            index={idx}
                                            lightPalette={sphereLightPalette}
                                            darkPalette={sphereDarkPalette}
                                        />
                                    ))}
                                </View>
                                <View style={[styles.textOverlay, { transform: [{ translateY: Spacing.small }], backgroundColor: 'transparent' }]}>
                                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                                        {/* Light Mode Title (Base backing) */}
                                        <AnimatedText style={[styles.header, {
                                            fontFamily: 'DancingScript_700Bold' as any,
                                            fontSize: 72, // Larger
                                            color: lightColors.textPrimary,
                                            textShadowColor: 'rgba(255, 255, 255, 0.6)',
                                            textShadowOffset: { width: 0, height: 2 },
                                            textShadowRadius: 6,
                                        }, headerLightStyle]}>Daily Flow</AnimatedText>

                                        {/* Dark Mode Title (Overlay) */}
                                        <AnimatedText style={[styles.header, {
                                            fontFamily: 'DancingScript_700Bold' as any,
                                            fontSize: 72,
                                            position: 'absolute',
                                            top: 0,
                                            color: darkColors.textPrimary,
                                            textShadowColor: 'rgba(0, 0, 0, 0.9)',
                                            textShadowOffset: { width: 0, height: 2 },
                                            textShadowRadius: 6,
                                        }, headerDarkStyle]}>Daily Flow</AnimatedText>

                                        <AnimatedText style={[styles.subtitle, {
                                            fontFamily: 'Outfit_500Medium' as any,
                                            fontSize: 14,
                                            letterSpacing: 4,
                                            marginTop: 0,
                                            textTransform: 'uppercase',
                                        }, animatedHeaderSubtitle]}>
                                            Twoje centrum organizacji
                                        </AnimatedText>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </Animated.View>

                    <GestureDetector gesture={gesture}>
                        <View style={[styles.formContainer, { marginTop: Spacing.xxLarge + Spacing.xxLarge + Spacing.small }]}>
                            <AnimatedView style={[
                                styles.modeSwitcher,
                                { borderWidth: 1 },
                                useAnimatedStyle(() => ({
                                    backgroundColor: interpolateColor(themeAnim.value, [0, 1], [lightColors.inputBackground, darkColors.inputBackground]),
                                    borderColor: interpolateColor(themeAnim.value, [0, 1], [lightColors.border, darkColors.border])
                                }))
                            ]}>
                                <AnimatedTouchableOpacity
                                    testID="login-mode-button"
                                    style={[styles.modeButton, loginTabStyle]}
                                    onPress={() => {
                                        swipeDirection.value = -1;
                                        targetProgress.value = 0;
                                    }}
                                >
                                    <Animated.Text style={[styles.modeButtonText, loginTextStyle]}>Zaloguj się</Animated.Text>
                                </AnimatedTouchableOpacity>
                                <AnimatedTouchableOpacity
                                    testID="register-mode-button"
                                    style={[styles.modeButton, registerTabStyle]}
                                    onPress={() => {
                                        swipeDirection.value = 1;
                                        targetProgress.value = 1;
                                    }}
                                >
                                    <Animated.Text style={[styles.modeButtonText, registerTextStyle]}>Zarejestruj się</Animated.Text>
                                </AnimatedTouchableOpacity>
                            </AnimatedView>

                            <View style={[styles.formSliderContainer, { backgroundColor: 'transparent' }]}>
                                <Animated.View style={[styles.formWrapper, loginFormAnimatedStyle]}>
                                    <LoginForm identifier={identifier} setIdentifier={setIdentifier} loginPassword={loginPassword} setLoginPassword={setLoginPassword} isLoading={isLoading} handleLogin={handleLogin} setForgotPasswordModalVisible={setForgotPasswordModalVisible} onGoogleButtonPress={onGoogleButtonPress} theme={theme} focusedOffset={focusedOffset} themeAnim={themeAnim} accentColors={accentColors} />
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
                                        theme={theme}
                                        focusedOffset={focusedOffset}
                                        themeAnim={themeAnim}
                                        registerButtonAnimatedStyle={registerButtonAnimatedStyle}
                                        registerButtonTextStyle={registerButtonTextStyle}
                                        accentColors={accentColors}
                                    />
                                </Animated.View>
                            </View>
                        </View>
                    </GestureDetector>
                </Animated.View>
            </View>
            <ForgotPasswordModal visible={forgotPasswordModalVisible} onClose={() => setForgotPasswordModalVisible(false)} />
            {/* Dialog: konto niezweryfikowane */}
            <ActionModal
                visible={unverifiedDialogVisible}
                title={pendingVerificationUserEmail ? 'Zweryfikuj konto' : 'Konto niezweryfikowane'}
                message={pendingVerificationUserEmail ? `Wygląda na to, że nie kliknąłeś jeszcze w link aktywacyjny wysłany na ${pendingVerificationUserEmail}.` : 'Wygląda na to, że nie kliknąłeś jeszcze w link aktywacyjny.'}
                actions={[
                    { text: 'Wyślij link ponownie', onPress: () => { const u = getAuth().currentUser; if (u) handleResendVerification(u); setUnverifiedDialogVisible(false); } },
                    { text: 'OK', onPress: () => { getAuth().signOut(); setUnverifiedDialogVisible(false); }, variant: 'secondary' },
                ]}
                onRequestClose={() => setUnverifiedDialogVisible(false)}
            />
            {/* Dialog: po rejestracji e-mail */}
            <ActionModal
                visible={emailVerificationDialogVisible}
                title={'Prawie gotowe! Sprawdź e‑mail'}
                message={registerData.email ? `Wysłaliśmy link weryfikacyjny na adres ${registerData.email}. Kliknij go, aby dokończyć rejestrację.` : 'Wysłaliśmy link weryfikacyjny na Twój adres e‑mail.'}
                actions={[
                    { text: 'Wyślij ponownie', onPress: async () => { if (emailVerificationUser) { try { await emailVerificationUser.sendEmailVerification(); showToast('Link wysłany ponownie.', 'success'); } catch (e: any) { handleAuthError(e); } } } },
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
                            } else {
                                // Zapisz, że Google jest połączony, by nie pytać ponownie przy kolejnych logowaniach
                                try { await upsertAuthProvidersForUser(user); } catch { }
                            }
                        }
                        setLinkModalVisible(false);
                        showToast('Konta połączone. Zalogowano.', 'success');
                    } catch (e: any) {
                        handleAuthError(e);
                    }
                }}
            />
            <ActionModal
                visible={loginSuggestionVisible}
                title={'Konto już istnieje'}
                message={loginSuggestionDetails
                    ? `Dla adresu ${loginSuggestionEmail} znaleziono:\n${loginSuggestionDetails}`
                    : `Dla adresu ${loginSuggestionEmail} istnieje już konto.`}
                actions={[
                    ...(loginSuggestionHasPassword ? [{ text: 'Zaloguj hasłem', onPress: () => { setIdentifier(loginSuggestionEmail); swipeDirection.value = -1; targetProgress.value = 0; setLoginSuggestionVisible(false); } }] as any : []),
                    { text: 'Anuluj', onPress: () => setLoginSuggestionVisible(false), variant: 'secondary' },
                    // Force show Google button if flag is true (now includes gmail fallback)
                    ...(loginSuggestionHasGoogle ? [{ text: 'Zaloguj Google', onPress: async () => { setLoginSuggestionVisible(false); try { await handleReverseLinkGoogleLogin(); } catch { } } }] as any : []),
                ]}
                onRequestClose={() => setLoginSuggestionVisible(false)}
            />
            {/* Reverse Linking Modals */}
            <LinkAvailableModal
                visible={linkAvailableModalVisible}
                email={pendingReverseLinkData?.email || ''}
                onClose={() => { setLinkAvailableModalVisible(false); setPendingReverseLinkData(null); }}
                onGoogleSignIn={handleReverseLinkGoogleLogin}
            />
            <NicknameConflictModal
                visible={nicknameConflictModalVisible}
                oldNickname={googleAccountNickname}
                newNickname={pendingReverseLinkData?.nickname || ''}
                onKeepOld={() => { finalizeReverseLink(googleAccountNickname, pendingGoogleCredentialForLink); }}
                onUseNew={() => { finalizeReverseLink(pendingReverseLinkData?.nickname || '', pendingGoogleCredentialForLink); }}
            />
        </AnimatedView >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // do not set hard background here; theme controls it in JSX
        overflow: 'hidden', // Prevent scrollbar flash
    },
    scrollContentContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: Spacing.xLarge,
        paddingBottom: Spacing.xLarge,
    },
    contentContainer: {
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: Spacing.xLarge,
    },
    headerContainer: {
        alignItems: 'center',
        overflow: 'visible', // Changed to visible so wide spheres don't get clipped
        marginTop: 0, // Reset to 0 (Lowered further)
        marginBottom: Spacing.small,
    },

    header: { fontSize: 44, fontWeight: 'normal', color: Colors.textPrimary, textAlign: 'center' },
    subtitle: { fontSize: 18, color: Colors.textSecondary, textAlign: 'center' },
    formContainer: {
        width: '100%',
        marginTop: Spacing.large,
    },
    modeSwitcher: {
        flexDirection: 'row',
        backgroundColor: Colors.inputBackground,
        borderRadius: 10,
        marginBottom: Spacing.medium,
        position: 'relative',
    },
    modeButton: {
        flex: 1,
        paddingVertical: Spacing.small,
        borderRadius: 8,
        alignItems: 'center',
    },

    modeButtonText: {
        fontSize: Typography.body.fontSize,
        fontWeight: '600',
    },
    formSliderContainer: {
        // Increase to prevent vertical clipping of Register form when errors are shown
        minHeight: 520,
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
    dividerContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: Spacing.medium },
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
        marginBottom: 0,
        height: 72, // Increased from 66 to 72 (more spacing)
        justifyContent: 'flex-start',
    },
    errorText: {
        color: Colors.danger,
        alignSelf: 'flex-start',
        textAlign: 'left',
        marginTop: 0,
        marginLeft: Spacing.small,
        marginBottom: 0,
        fontSize: 13,
        position: 'absolute',
        bottom: 4, // Adjusted from 0 to 4
    },
    logoContainer: {
        width: LOGO_WIDTH,
        height: LOGO_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: Spacing.small,
        position: 'relative',
    },
    logoBackground: {
        width: LOGO_WIDTH,
        height: LOGO_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        backgroundColor: 'transparent',
    },
    textContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.small,
        zIndex: 1,
    },
    textOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },


    sphere: {
        position: 'absolute',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    sphereHighlight: {
        position: 'absolute',
        bottom: 2,
        left: 2,
        width: '40%',
        height: '40%',
        borderRadius: 100,
        opacity: 0.55,
        backgroundColor: 'rgba(255,255,255,0.22)'
    },
    themeSwitcher: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        right: 20,
        zIndex: 100,
        padding: 10,
        borderRadius: 20,
    }
});

export default LoginScreen;

