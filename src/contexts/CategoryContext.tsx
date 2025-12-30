import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from '../utils/firestoreCompat';
import auth from '@react-native-firebase/auth';
import { db } from '../utils/firestoreCompat';
import { Category } from '../types';

interface CategoryContextData {
    categories: Category[];
    loading: boolean;
}

const CategoryContext = createContext<CategoryContextData | undefined>(undefined);

export const useCategories = () => {
    const context = useContext(CategoryContext);
    if (!context) {
        throw new Error('useCategories must be used within a CategoryProvider');
    }
    return context;
};

interface CategoryProviderProps {
    children: ReactNode;
}

export const CategoryProvider = ({ children }: CategoryProviderProps) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    // Przechowuj aktywną subskrypcję kategorii, aby móc ją odpiąć przy zmianie użytkownika
    const categoriesUnsubscribeRef = useRef<null | (() => void)>(null);

    useEffect(() => {
        setLoading(true);
        const unsubscribeAuth = auth().onAuthStateChanged((firebaseUser) => {
            // Odpnij poprzednią subskrypcję kolekcji kategorii
            if (categoriesUnsubscribeRef.current) {
                categoriesUnsubscribeRef.current();
                categoriesUnsubscribeRef.current = null;
            }

            if (firebaseUser) {
                const categoriesRef = collection(db, 'categories');
                const q = query(categoriesRef, where('userId', '==', firebaseUser.uid));
                categoriesUnsubscribeRef.current = onSnapshot(
                    q,
                    (snapshot: any) => {
                        console.log("CategoryContext snapshot:", snapshot);
                        if (!snapshot || !snapshot.docs) {
                            console.error("CategoryContext: snapshot or snapshot.docs is undefined!");
                            setCategories([]);
                            setLoading(false);
                            return;
                        }
                        const categoriesData = snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as Category));
                        setCategories(categoriesData);
                        setLoading(false);
                    },
                    (error) => {
                        console.error('Błąd podczas pobierania kategorii z Firestore!', error);
                        setLoading(false);
                    }
                );
            } else {
                setCategories([]);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (categoriesUnsubscribeRef.current) {
                categoriesUnsubscribeRef.current();
                categoriesUnsubscribeRef.current = null;
            }
        };
    }, []);

    return <CategoryContext.Provider value={{ categories, loading }}>{children}</CategoryContext.Provider>;
};
