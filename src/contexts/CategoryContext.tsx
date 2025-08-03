import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import auth from '@react-native-firebase/auth';
import { db } from '../../firebaseConfig';
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

    const user = auth().currentUser;

    useEffect(() => {
        if (user) {
            const categoriesRef = collection(db, 'categories');
            const q = query(categoriesRef, where("userId", "==", user.uid));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const categoriesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Category));
                setCategories(categoriesData);
                setLoading(false);
            }, (error) => {
                console.error("Błąd podczas pobierania kategorii z Firestore!", error);
                setLoading(false);
            });

            return () => unsubscribe();
        } else {
            setCategories([]);
            setLoading(false);
        }
    }, [user]);

    return (
        <CategoryContext.Provider value={{ categories, loading }}>
            {children}
        </CategoryContext.Provider>
    );
};