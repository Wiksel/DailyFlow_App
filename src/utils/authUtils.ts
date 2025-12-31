import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, collection, writeBatch, query, where, getDocs, limit, getDoc, db } from "./firestoreCompat";
import { FirebaseAuthTypes } from '../utils/authCompat';
import { DEFAULT_CATEGORIES } from '../constants/categories';

export function mapFirebaseAuthErrorToMessage(code: string): { message: string; level: 'error' | 'info' } {
    const c = (code || '').toLowerCase();
    switch (c) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
            return { message: 'Nieprawidłowe dane logowania. Sprawdź identyfikator i hasło.', level: 'error' };
        case 'auth/too-many-requests':
            return { message: 'Dostęp tymczasowo zablokowany. Spróbuj ponownie później.', level: 'info' };
        case 'auth/email-already-in-use':
            return { message: 'Ten e‑mail jest już używany.', level: 'error' };
        case 'auth/weak-password':
            return { message: 'Hasło jest zbyt słabe.\nUżyj min. 6 znaków, w tym cyfry i litery.', level: 'error' };
        case 'auth/invalid-email':
            return { message: 'Podany adres e‑mail jest nieprawidłowy.', level: 'error' };
        case 'auth/account-exists-with-different-credential':
            return { message: 'Konto istnieje z innym sposobem logowania.', level: 'info' };
        case 'auth/requires-recent-login':
            return { message: 'Operacja wymaga ponownego logowania.', level: 'error' };
        default:
            return { message: 'Wystąpił błąd logowania. Spróbuj ponownie.', level: 'error' };
    }
}

export const createNewUserInFirestore = async (user: FirebaseAuthTypes.User, displayName: string) => {
    const finalNickname = displayName.trim() || user.email?.split('@')[0] || 'Nowy Użytkownik';
    const userRef = doc(db, "users", user.uid);

    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
        const userData = userDoc.data();
        const updateData: any = {};

        if (finalNickname !== userData.nickname) {
            updateData.nickname = finalNickname;
        }

        if (user.email && user.email !== userData.email) {
            updateData.email = user.email;
            updateData.emailLower = user.email.toLowerCase();
        }

        try {
            const providers = (user.providerData || []).map((p: any) => p?.providerId);
            updateData.authProviders = {
                password: providers.includes('password'),
                google: providers.includes('google.com'),
            };
        } catch { }

        if (Object.keys(updateData).length > 0) {
            await setDoc(userRef as any, updateData, { merge: true });
        }
        return;
    }

    const batch = writeBatch(db);

    batch.set(userRef, {
        ...(user.email ? { email: user.email, emailLower: (user.email || '').toLowerCase() } : {}),
        photoURL: user.photoURL || null,
        points: 0,
        nickname: finalNickname,
        completedTasksCount: 0,
        authProviders: {
            password: (user.providerData || []).some((p: any) => p?.providerId === 'password'),
            google: (user.providerData || []).some((p: any) => p?.providerId === 'google.com'),
        },
        prioritySettings: {
            criticalThreshold: 1, urgentThreshold: 3, soonThreshold: 7,
            distantThreshold: 14, criticalBoost: 4, urgentBoost: 3,
            soonBoost: 2, distantBoost: 1, agingBoostDays: 5, agingBoostAmount: 1,
        },
    });

    const publicUserRef = doc(collection(db, 'publicUsers'), user.uid);
    batch.set(publicUserRef as any, {
        nickname: finalNickname,
        photoURL: user.photoURL || null,
        emailLower: user.email ? user.email.toLowerCase() : null,
        hasGoogle: (user.providerData || []).some((p: any) => p?.providerId === 'google.com'),
        hasPassword: (user.providerData || []).some((p: any) => p?.providerId === 'password'),
    });

    DEFAULT_CATEGORIES.forEach(category => {
        const categoryRef = doc(collection(db, "categories"));
        batch.set(categoryRef, { ...category, userId: user.uid });
    });

    await batch.commit();
};

export const upsertAuthProvidersForUser = async (user: FirebaseAuthTypes.User) => {
    try {
        const userRef = doc(db, 'users', user.uid);
        const providers = (user.providerData || []).map((p: any) => p?.providerId);
        const update: any = {
            authProviders: {
                password: providers.includes('password'),
                google: providers.includes('google.com'),
            },
        };
        if (user.email) {
            update.email = user.email;
            update.emailLower = user.email.toLowerCase();
        }
        await setDoc(userRef as any, update, { merge: true });

        const publicRef = doc(collection(db, 'publicUsers'), user.uid);
        const pubUpdate: any = {
            nickname: (user.displayName || null),
            photoURL: user.photoURL || null,
            emailLower: user.email ? user.email.toLowerCase() : null,
            hasGoogle: (user.providerData || []).some((p: any) => p?.providerId === 'google.com'),
            hasPassword: (user.providerData || []).some((p: any) => p?.providerId === 'password'),
        };
        await setDoc(publicRef as any, pubUpdate, { merge: true });
    } catch { }
};

export const findUserEmailByIdentifier = async (identifier: string): Promise<string | null> => {
    const cleanIdentifier = identifier.trim();
    if (/\S+@\S+\.\S+/.test(cleanIdentifier)) {
        return cleanIdentifier;
    }
    // Fallback: if user enters something that is not email, treat is as invalid or try to use it as is
    return cleanIdentifier;
};


// Globalna flaga do blokowania nawigacji podczas resetu hasła przez SMS
let passwordResetInProgress = false;

export const setPasswordResetInProgress = (inProgress: boolean) => {
    passwordResetInProgress = inProgress;
    if (!inProgress) return;
    // Auto-timeout: zabezpieczenie aby flaga nie blokowała nawigacji w razie błędu/porzucenia procesu
    setTimeout(() => {
        passwordResetInProgress = false;
    }, 5 * 60 * 1000); // 5 minut
};

export const isPasswordResetInProgress = () => passwordResetInProgress;

// Suggested login identifier persistence (to prefill login after flows)
const SUGGESTED_LOGIN_KEY = 'dailyflow_suggested_login_identifier';
export const setSuggestedLoginIdentifier = async (identifier: string) => {
    try { await AsyncStorage.setItem(SUGGESTED_LOGIN_KEY, identifier); } catch { }
};
export const popSuggestedLoginIdentifier = async (): Promise<string | null> => {
    try {
        const v = await AsyncStorage.getItem(SUGGESTED_LOGIN_KEY);
        await AsyncStorage.removeItem(SUGGESTED_LOGIN_KEY);
        return v;
    } catch { return null; }
};

// Simple onboarding completion flag (first run helper)
const ONBOARD_FLAG_KEY = 'dailyflow_onboarding_done';
export const isOnboardingDone = async (): Promise<boolean> => {
    try { return (await AsyncStorage.getItem(ONBOARD_FLAG_KEY)) === '1'; } catch { return false; }
};
export const setOnboardingDone = async (): Promise<void> => {
    try { await AsyncStorage.setItem(ONBOARD_FLAG_KEY, '1'); } catch { }
};


