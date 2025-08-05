import { db } from '../../firebaseConfig';
import { doc, setDoc, collection, writeBatch, query, where, getDocs, limit, getDoc } from "firebase/firestore";
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { DEFAULT_CATEGORIES } from '../constants/categories';

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
        }
        
        // Zaktualizuj tylko jeśli są zmiany
        if (Object.keys(updateData).length > 0) {
            await setDoc(userRef, updateData, { merge: true });
        }
        return;
    }
    
    // Jeśli użytkownik nie istnieje, utwórz nowy
    const batch = writeBatch(db);
    
    batch.set(userRef, {
        email: user.email || `${user.phoneNumber}@dailyflow.app`,
        phoneNumber: user.phoneNumber,
        photoURL: user.photoURL || null,
        points: 0,
        nickname: finalNickname,
        completedTasksCount: 0,
        prioritySettings: {
            criticalThreshold: 1, urgentThreshold: 3, soonThreshold: 7,
            distantThreshold: 14, criticalBoost: 4, urgentBoost: 3,
            soonBoost: 2, distantBoost: 1, agingBoostDays: 5, agingBoostAmount: 1,
        },
    });

    DEFAULT_CATEGORIES.forEach(category => {
        const categoryRef = doc(collection(db, "categories"));
        batch.set(categoryRef, { ...category, userId: user.uid });
    });

    await batch.commit();
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
        const phoneQuery = query(usersRef, where('phoneNumber', '==', format), limit(1));
        const phoneSnapshot = await getDocs(phoneQuery);
        
        if (!phoneSnapshot.empty) {
            const userData = phoneSnapshot.docs[0].data();
            if (userData.email) {
                return userData.email;
            }
        }
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
    
    console.log('checkIfPhoneExists - sprawdzane formaty:', uniqueFormats);
    console.log('checkIfPhoneExists - oryginalny numer:', phoneNumber);
    
    // Sprawdź każdy możliwy format
    for (const format of uniqueFormats) {
        const phoneQuery = query(usersRef, where('phoneNumber', '==', format), limit(1));
        const phoneSnapshot = await getDocs(phoneQuery);
        
        console.log(`checkIfPhoneExists - format "${format}": ${phoneSnapshot.empty ? 'nie znaleziono' : 'znaleziono'}`);
        
        if (!phoneSnapshot.empty) {
            console.log(`checkIfPhoneExists - ZNALEZIONO użytkownika z numerem: ${format}`);
            return true;
        }
    }
    
    console.log('checkIfPhoneExists - NIE ZNALEZIONO żadnego użytkownika');
    return false;
};

// Funkcja pomocnicza do debugowania - sprawdza wszystkie numery telefonów w bazie
export const debugPhoneNumbers = async () => {
    const usersRef = collection(db, 'users');
    const allUsersQuery = query(usersRef);
    const allUsersSnapshot = await getDocs(allUsersQuery);
    
    console.log('=== DEBUG: Wszystkie numery telefonów w bazie ===');
    allUsersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.phoneNumber) {
            console.log(`User ID: ${doc.id}, Phone: ${userData.phoneNumber}, Email: ${userData.email}`);
        }
    });
    console.log('=== KONIEC DEBUG ===');
};


