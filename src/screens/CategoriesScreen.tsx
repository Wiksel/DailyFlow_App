// src/screens/CategoriesScreen.tsx
import React, { useState } from 'react';
// Dodano import ScrollView
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { getAuth } from '@react-native-firebase/auth'; // ZMIANA
import { db } from '../../firebaseConfig'; // <--- TEN IMPORT ZOSTAJE
import { collection, addDoc, deleteDoc, doc, updateDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { Feather } from '@expo/vector-icons';
import { useCategories } from '../contexts/CategoryContext';
import { Category } from '../types';
import { useToast } from '../contexts/ToastContext';
import { Colors, Spacing, Typography, GlobalStyles, isColorLight } from '../styles/AppStyles';

const COLORS = [
    '#3498db', '#2ecc71', '#f1c40f', '#e74c3c',
    '#9b59b6', '#1abc9c', '#e67e22', '#34495e',
    '#7f8c8d', '#a22a3e', '#1c7ed6', '#0ca678'
];

const CategoriesScreen = () => {
    const { categories, loading } = useCategories();
    const [newCategoryName, setNewCategoryName] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLORS[0]);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const auth = getAuth();
    const currentUser = auth.currentUser; // ZMIANA
    const { showToast } = useToast();

    const handleAddOrUpdateCategory = async () => {
        if (!newCategoryName.trim() || !currentUser) {
            showToast("Nazwa kategorii nie może być pusta.", 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingCategory) {
                const categoryRef = doc(db, 'categories', editingCategory.id);
                await updateDoc(categoryRef, {
                    name: newCategoryName.trim(),
                    color: selectedColor,
                });
                showToast("Kategoria zaktualizowana!", 'success');
                setEditingCategory(null);
            } else {
                await addDoc(collection(db, 'categories'), {
                    name: newCategoryName.trim(),
                    color: selectedColor,
                    userId: currentUser.uid,
                });
                showToast("Kategoria dodana!", 'success');
            }
            setNewCategoryName('');
            setSelectedColor(COLORS[0]);
        } catch (error: any) {
            showToast(`Błąd: ${error.message}`, 'error');
            console.error("Błąd dodawania/aktualizacji kategorii:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCategory = (category: Category) => {
        Alert.alert(
            "Potwierdź usunięcie",
            `Czy na pewno chcesz usunąć kategorię\n"${category.name}"?\n\nZadania przypisane do niej zostaną\nprzeniesione do kategorii "Inne".`,
            [
                { text: "Anuluj", style: "cancel" },
                { text: "Usuń", style: "destructive", onPress: async () => {
                    setIsSubmitting(true);
                    try {
                        if (!currentUser) {
                            showToast("Użytkownik nie jest zalogowany.", 'error');
                            return;
                        }

                        const otherCategory = categories.find(cat => cat.name === 'Inne');
                        const defaultCategoryId = otherCategory?.id;

                        if (!defaultCategoryId) {
                            showToast("Błąd: Nie znaleziono domyślnej kategorii 'Inne'. Upewnij się, że istnieje.", 'error');
                            return;
                        }

                        const tasksRef = collection(db, 'tasks');
                        const tasksToUpdateQuery = query(
                            tasksRef,
                            where('category', '==', category.id),
                            where('userId', '==', currentUser.uid)
                        );
                        const tasksSnapshot = await getDocs(tasksToUpdateQuery);

                        const batch = writeBatch(db);

                        tasksSnapshot.docs.forEach(taskDoc => {
                            batch.update(taskDoc.ref, { category: defaultCategoryId });
                        });

                        batch.delete(doc(db, 'categories', category.id));

                        await batch.commit();
                        showToast("Kategoria i powiązane zadania zaktualizowane!", 'success');
                    } catch (error: any) {
                        showToast(`Błąd podczas usuwania kategorii: ${error.message}`, 'error');
                        console.error("Błąd usuwania kategorii:", error);
                    } finally {
                        setIsSubmitting(false);
                    }
                }}
            ]
        );
    };

    const startEditing = (category: Category) => {
        setEditingCategory(category);
        setNewCategoryName(category.name);
        setSelectedColor(category.color);
    };

    const cancelEditing = () => {
        setEditingCategory(null);
        setNewCategoryName('');
        setSelectedColor(COLORS[0]);
    };

    const renderCategory = ({ item }: { item: Category }) => (
        <View style={styles.categoryItem}>
            <View style={[styles.colorDot, { backgroundColor: item.color }]} />
            <Text style={styles.categoryName}>{item.name}</Text>
            <TouchableOpacity onPress={() => startEditing(item)} style={{ marginHorizontal: Spacing.medium }}>
                <Feather name="edit-2" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteCategory(item)}>
                <Feather name="trash-2" size={22} color={Colors.danger} />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={GlobalStyles.container}>
            <View style={styles.addSection}>
                <Text style={styles.sectionTitle}>{editingCategory ? 'Edytuj kategorię' : 'Dodaj nową kategorię'}</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Nazwa kategorii"
                    value={newCategoryName}
                    onChangeText={setNewCategoryName}
                    placeholderTextColor={Colors.placeholder}
                    editable={!isSubmitting}
                />
                <Text style={styles.label}>Wybierz kolor</Text>
                {/* Zmieniono View na ScrollView */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorContainer}>
                    {COLORS.map(color => (
                        <TouchableOpacity
                            key={color}
                            style={[styles.colorButton, { backgroundColor: color }, selectedColor === color && styles.colorSelected]}
                            onPress={() => setSelectedColor(color)}
                            disabled={isSubmitting}
                        />
                    ))}
                </ScrollView>
                <TouchableOpacity style={styles.addButton} onPress={handleAddOrUpdateCategory} disabled={isSubmitting}>
                    {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.addButtonText}>{editingCategory ? 'Zapisz zmiany' : 'Dodaj kategorię'}</Text>}
                </TouchableOpacity>
                {editingCategory && (
                    <TouchableOpacity style={styles.cancelButton} onPress={cancelEditing} disabled={isSubmitting}>
                        {isSubmitting ? <ActivityIndicator color={Colors.danger} /> : <Text style={styles.cancelButtonText}>Anuluj edycję</Text>}
                    </TouchableOpacity>
                )}
            </View>
            <FlatList
                data={categories}
                renderItem={renderCategory}
                keyExtractor={item => item.id}
                ListHeaderComponent={<Text style={styles.listHeader}>Twoje kategorie</Text>}
                ListEmptyComponent={<Text style={styles.emptyText}>Brak własnych kategorii.</Text>}
            />
        </View>
    );
};

// Styles
const styles = StyleSheet.create({
    // Usunięto 'container' stąd, bo jest w GlobalStyles.container
    addSection: {
        padding: Spacing.large,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderColor: Colors.border,
    },
    sectionTitle: {
        fontSize: Typography.h3.fontSize,
        fontWeight: Typography.bold.fontWeight, // <-- Zmiana tutaj
        marginBottom: Spacing.small,
    },
    listHeader: {
        fontSize: Typography.h3.fontSize,
        fontWeight: Typography.bold.fontWeight, // <-- Zmiana tutaj
        marginBottom: Spacing.small,
        paddingHorizontal: Spacing.large,
        paddingTop: Spacing.large,
    },
    input: {
        ...GlobalStyles.input,
        marginBottom: Spacing.small,
    },
    label: {
        fontSize: Typography.body.fontSize,
        fontWeight: Typography.semiBold.fontWeight, // <-- Zmiana tutaj
        marginVertical: Spacing.small,
    },
    colorContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        paddingVertical: Spacing.xSmall,
        marginBottom: Spacing.medium,
        minHeight: 45,
    },
    colorButton: {
        width: 35,
        height: 35,
        borderRadius: 17.5,
        marginHorizontal: Spacing.xSmall,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorSelected: {
        borderColor: Colors.primary,
    },
    addButton: {
        ...GlobalStyles.button,
        backgroundColor: Colors.primary,
    },
    addButtonText: {
        ...GlobalStyles.buttonText,
    },
    cancelButton: {
        marginTop: Spacing.small,
        padding: Spacing.small,
    },
    cancelButtonText: {
        color: Colors.danger,
        textAlign: 'center',
        fontSize: Typography.body.fontSize,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.large,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderColor: Colors.border,
    },
    colorDot: {
        width: 15,
        height: 15,
        borderRadius: 7.5,
        marginRight: Spacing.medium,
    },
    categoryName: {
        fontSize: Typography.body.fontSize,
        fontWeight: Typography.semiBold.fontWeight, // <-- Zmiana tutaj
        flex: 1,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: Spacing.xLarge,
        fontSize: Typography.body.fontSize,
        color: Colors.textSecondary,
    },
});

export default CategoriesScreen;