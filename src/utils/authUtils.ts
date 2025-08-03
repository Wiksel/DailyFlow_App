import { db } from '../../firebaseConfig';
import { doc, setDoc, collection, writeBatch, query, where, getDocs, limit } from "firebase/firestore";
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { DEFAULT_CATEGORIES } from '../constants/categories';

export const createNewUserInFirestore = async (user: FirebaseAuthTypes.User, displayName: string) => {
    const finalNickname = displayName.trim() || user.email?.split('@')[0] || 'Nowy Użytkownik';
    const batch = writeBatch(db);
    const userRef = doc(db, "users", user.uid);
    
    batch.set(userRef, {
        email: user.email,
        phoneNumber: user.phoneNumber,
        photoURL: user.photoURL || null, // <-- DODANA NOWA LINIA
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
    
    if (/\S+@\S+\.\S+/.test(cleanIdentifier)) {
        return cleanIdentifier;
    }

    const phoneQuery = query(usersRef, where('phoneNumber', '==', `+48${cleanIdentifier}`), limit(1));
    const phoneSnapshot = await getDocs(phoneQuery);
    if (!phoneSnapshot.empty && phoneSnapshot.docs[0].data().email) {
        return phoneSnapshot.docs[0].data().email;
    }
    
    return null;
};