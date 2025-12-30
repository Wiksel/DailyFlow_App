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
            return { message: 'Hasło jest zbyt słabe. Użyj min. 6 znaków, w tym cyfry i litery.', level: 'error' };
        case 'auth/invalid-email':
            return { message: 'Podany adres e‑mail jest nieprawidłowy.', level: 'error' };
        case 'auth/invalid-phone-number':
            return { message: 'Nieprawidłowy format numeru telefonu.', level: 'error' };
        case 'auth/invalid-verification-code':
            return { message: 'Nieprawidłowy kod weryfikacyjny.', level: 'error' };
        case 'auth/account-exists-with-different-credential':
            return { message: 'Konto istnieje z innym sposobem logowania.', level: 'info' };
        case 'auth/requires-recent-login':
            return { message: 'Operacja wymaga ponownego logowania.', level: 'error' };
        default:
            return { message: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.', level: 'error' };
    }
}

export const createNewUserInFirestore = async (user: FirebaseAuthTypes.User, displayName: string) => {
    const finalNickname = displayName.trim() || user.email?.split('@')[0] || 'Nowy Użytkownik';
    const userRef = doc(db, "users", user.uid);

    // Sprawdź czy użytkownik już istnieje
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
        // Jeśli użytkownik już istnieje, zaktualizuj tylko nickname i email (jeśli potrzeba)
        const userData = userDoc.data();
        const updateData: any = {};

        if (finalNickname !== userData.nickname) {
            updateData.nickname = finalNickname;
        }

        if (user.email && user.email !== userData.email) {
            updateData.email = user.email;
            updateData.emailLower = user.email.toLowerCase();
        }
        // Aktualizuj flagi providerów
        try {
            const providers = (user.providerData || []).map(p => p?.providerId);
            updateData.authProviders = {
                password: providers.includes('password'),
                google: providers.includes('google.com'),
                phone: !!user.phoneNumber,
            };
        } catch { }

        // Zaktualizuj tylko jeśli są zmiany
        if (Object.keys(updateData).length > 0) {
            await setDoc(userRef as any, updateData, { merge: true });
        }
        return;
    }

    // Jeśli użytkownik nie istnieje, utwórz nowy
    const batch = writeBatch(db);

    batch.set(userRef, {
        // Dla kont telefonicznych nie ustawiamy e‑maila; dla kont e‑mail zapisujemy email + emailLower
        ...(user.email ? { email: user.email, emailLower: (user.email || '').toLowerCase() } : {}),
        phoneNumber: user.phoneNumber,
        photoURL: user.photoURL || null,
        points: 0,
        nickname: finalNickname,
        completedTasksCount: 0,
        authProviders: {
            password: (user.providerData || []).some(p => p?.providerId === 'password'),
            google: (user.providerData || []).some(p => p?.providerId === 'google.com'),
            phone: !!user.phoneNumber,
        },
        prioritySettings: {
            criticalThreshold: 1, urgentThreshold: 3, soonThreshold: 7,
            distantThreshold: 14, criticalBoost: 4, urgentBoost: 3,
            soonBoost: 2, distantBoost: 1, agingBoostDays: 5, agingBoostAmount: 1,
        },
    });

    // Public lookup profile (for safe pre-auth lookups)
    const publicUserRef = doc(collection(db, 'publicUsers'), user.uid);
    batch.set(publicUserRef as any, {
        nickname: finalNickname,
        photoURL: user.photoURL || null,
        // Keep lower-cased email only if present
        emailLower: user.email ? user.email.toLowerCase() : null,
        // Optional basic flags for UX
        hasGoogle: (user.providerData || []).some(p => p?.providerId === 'google.com'),
        hasPassword: (user.providerData || []).some(p => p?.providerId === 'password'),
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
        const snap = await getDoc(userRef);
        const providers = (user.providerData || []).map(p => p?.providerId);
        const update: any = {
            authProviders: {
                password: providers.includes('password'),
                google: providers.includes('google.com'),
                phone: !!user.phoneNumber,
            },
        };
        if (user.email) {
            update.email = user.email;
            update.emailLower = user.email.toLowerCase();
        } else {
            // Jeśli konto telefoniczne – upewnij się, że nie zostawiamy poprzedniego emaila
            update.email = null as any;
            update.emailLower = null as any;
        }
        if (user.phoneNumber) update.phoneNumber = user.phoneNumber;
        await setDoc(userRef as any, update, { merge: true });

        // Sync public profile
        const publicRef = doc(collection(db, 'publicUsers'), user.uid);
        const pubUpdate: any = {
            nickname: (user.displayName || null),
            photoURL: user.photoURL || null,
            emailLower: user.email ? user.email.toLowerCase() : null,
            hasGoogle: (user.providerData || []).some(p => p?.providerId === 'google.com'),
            hasPassword: (user.providerData || []).some(p => p?.providerId === 'password'),
        };
        await setDoc(publicRef as any, pubUpdate, { merge: true });
    } catch { }
};

export const findUserEmailByIdentifier = async (identifier: string): Promise<string | null> => {
    const usersRef = collection(db, 'users');
    const cleanIdentifier = identifier.trim();

    // Sprawdzenie, czy identyfikator jest adresem e-mail
    if (/\S+@\S+\.\S+/.test(cleanIdentifier)) {
        // Logika dla e-maila - można dodać zapytanie sprawdzające, czy e-mail istnieje
        // Na razie zwracamy po prostu identyfikator, zakładając, że jest to e-mail
        return cleanIdentifier;
    }

    // Sprawdzenie, czy identyfikator jest numerem telefonu
    // Usuwamy wszystkie znaki, które nie są cyframi
    const numericOnly = cleanIdentifier.replace(/\D/g, '');

    if (numericOnly.length === 0) {
        return null;
    }

    // Możliwe formaty do sprawdzenia:
    const possibleFormats = [
        cleanIdentifier, // Dokładnie jak wprowadzono
        `+${numericOnly}`, // Z prefiksem +
        numericOnly, // Tylko cyfry
    ];

    // Jeśli numer zaczyna się od cyfry (nie +), sprawdź też z kodem kraju
    if (/^\d/.test(cleanIdentifier) && numericOnly.length === 9) {
        // Dla polskich numerów (9 cyfr) dodaj +48
        possibleFormats.push(`+48${numericOnly}`);
    }

    // Usuń duplikaty
    const uniqueFormats = [...new Set(possibleFormats)];

    // Sprawdź każdy możliwy format
    for (const format of uniqueFormats) {
        try {
            const phoneQuery = query(usersRef, where('phoneNumber', '==', format), limit(1));
            const phoneSnapshot = await getDocs(phoneQuery);
            if (!phoneSnapshot.empty) {
                const userData: any = phoneSnapshot.docs[0].data();
                // Jeśli konto posiada e‑mail → użyj go. W przeciwnym razie użyj wzorca "dummy email" na bazie dokładnie zapisanego numeru.
                if (userData.email) return userData.email as string;
                const storedPhone: string = userData.phoneNumber || format;
                const canonical = storedPhone.startsWith('+') ? storedPhone : `+${storedPhone}`;
                return `${canonical}@dailyflow.app`;
            }
        } catch {
            // Brak uprawnień lub offline – kontynuuj fallbacki poniżej
        }
    }
    // Nie znaleziono w bazie, ale jeżeli identyfikator wygląda na telefon, spróbuj z domyślnym wzorcem (np. +48...)
    if (/^\d{9}$/.test(numericOnly)) {
        const canonical = `+48${numericOnly}`;
        return `${canonical}@dailyflow.app`;
    }
    if (/^\d{11,15}$/.test(numericOnly)) {
        const canonical = `+${numericOnly}`;
        return `${canonical}@dailyflow.app`;
    }

    return null;
};


export const checkIfPhoneExists = async (phoneNumber: string): Promise<boolean> => {
    const usersRef = collection(db, 'users');
    const cleanPhoneNumber = phoneNumber.trim();

    // Usuwamy wszystkie znaki, które nie są cyframi
    const numericOnly = cleanPhoneNumber.replace(/\D/g, '');

    if (numericOnly.length === 0) {
        return false;
    }

    // Możliwe formaty do sprawdzenia - bardziej precyzyjne
    const possibleFormats = [
        cleanPhoneNumber, // Dokładnie jak wprowadzono (np. +48123456789)
    ];

    // Jeśli numer ma prefiks kraju (np. +48), sprawdź też bez prefiksu
    if (cleanPhoneNumber.startsWith('+')) {
        const withoutPrefix = cleanPhoneNumber.substring(1); // Usuń +
        possibleFormats.push(withoutPrefix);

        // Dla polskich numerów sprawdź też z prefiksem +48
        if (cleanPhoneNumber.startsWith('+48') && numericOnly.length === 11) {
            const polishNumber = numericOnly.substring(2); // Usuń 48
            possibleFormats.push(`+48${polishNumber}`);
        }
    } else {
        // Jeśli numer nie ma prefiksu, sprawdź z prefiksem
        possibleFormats.push(`+${numericOnly}`);

        // Dla polskich numerów (9 cyfr) dodaj +48
        if (numericOnly.length === 9) {
            possibleFormats.push(`+48${numericOnly}`);
        }
    }

    // Usuń duplikaty
    const uniqueFormats = [...new Set(possibleFormats)];

    // Debug logi usunięte w produkcji

    // Sprawdź każdy możliwy format
    for (const format of uniqueFormats) {
        try {
            const phoneQuery = query(usersRef, where('phoneNumber', '==', format), limit(1));
            const phoneSnapshot = await getDocs(phoneQuery);
            if (!phoneSnapshot.empty) {
                return true;
            }
        } catch {
            // Brak uprawnień lub offline – traktuj jako brak wyniku
        }
    }

    return false;
};

// Funkcja pomocnicza do debugowania - sprawdza wszystkie numery telefonów w bazie
export const debugPhoneNumbers = async () => {
    // Intencjonalnie pusta w produkcji – pozostawiona do ew. lokalnych testów
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


