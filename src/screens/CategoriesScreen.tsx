// src/screens/CategoriesScreen.tsx
import React, { useState, useMemo } from 'react';
// Dodano import ScrollView
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import LabeledInput from '../components/LabeledInput';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { getAuth } from '../utils/authCompat'; // ZMIANA
import { db } from '../utils/firestoreCompat'; // <--- TEN IMPORT ZOSTAJE
import { collection, addDoc, deleteDoc, doc, updateDoc, query, where, getDocs, writeBatch } from '../utils/firestoreCompat';
import { enqueueAdd, enqueueUpdate, enqueueDelete } from '../utils/offlineQueue';
import { Feather } from '@expo/vector-icons';
import AnimatedIconButton from '../components/AnimatedIconButton';
import { useCategories } from '../contexts/CategoryContext';
import { Category } from '../types';
import { useToast } from '../contexts/ToastContext';
import ActionModal from '../components/ActionModal';
import { Colors, Spacing, Typography, GlobalStyles, isColorLight, densityScale } from '../styles/AppStyles';
import { useTheme, Theme } from '../contexts/ThemeContext';
import { useUI } from '../contexts/UIContext';
import AppHeader from '../components/AppHeader';

const COLORS = [
    '#3498db', '#2ecc71', '#f1c40f', '#e74c3c',
    '#9b59b6', '#1abc9c', '#e67e22', '#34495e',
    '#7f8c8d', '#a22a3e', '#1c7ed6', '#0ca678'
];

const CategoriesScreen = () => {
    const { categories, loading } = useCategories();
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const { density } = useUI();
    const isCompact = density === 'compact';
    const [newCategoryName, setNewCategoryName] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLORS[0]);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const currentUser = getAuth().currentUser; // ZMIANA
    const { showToast } = useToast();
    const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<Category | null>(null);

    const handleAddOrUpdateCategory = async () => {
        if (!newCategoryName.trim() || !currentUser) {
            showToast("Nazwa kategorii nie może być pusta.", 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingCategory) {
                const categoryRef = doc(db, 'categories', editingCategory.id);
                const payload = {
                    name: newCategoryName.trim(),
                    color: selectedColor,
                };
                try { await updateDoc(categoryRef, payload); }
                catch { await enqueueUpdate(`categories/${editingCategory.id}`, payload); }
                showToast("Kategoria zaktualizowana!", 'success');
                setEditingCategory(null);
            } else {
                const payload = {
                    name: newCategoryName.trim(),
                    color: selectedColor,
                    userId: currentUser.uid,
                };
                try { await addDoc(collection(db, 'categories'), payload); }
                catch { await enqueueAdd('categories', payload); }
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

    const handleDeleteCategory = (category: Category) => setConfirmDeleteCategory(category);

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
        <View style={[
            styles.categoryItem,
            isCompact && { paddingVertical: Spacing.small, paddingHorizontal: Spacing.medium }
        ]}>
            <View style={[styles.colorDot, { backgroundColor: item.color }]} />
            <Text style={[styles.categoryName, isCompact && { fontSize: densityScale(Typography.body.fontSize, true) }]}>{item.name}</Text>
            <AnimatedIconButton icon="edit-2" size={22} color={theme.colors.primary} onPress={() => startEditing(item)} style={{ marginHorizontal: Spacing.medium }} accessibilityLabel={`Edytuj kategorię ${item.name}`} />
            <AnimatedIconButton icon="trash-2" size={22} color={theme.colors.danger} onPress={() => handleDeleteCategory(item)} accessibilityLabel={`Usuń kategorię ${item.name}`} />
        </View>
    );

    if (loading) {
        return (
            <View style={[GlobalStyles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }
    return (
        <View style={styles.container}>
            <AppHeader title="Kategorie" />
            <View style={styles.addSection}>
                <Text style={styles.sectionTitle}>{editingCategory ? 'Edytuj kategorię' : 'Dodaj nową kategorię'}</Text>
                <LabeledInput
                    label="Nazwa kategorii"
                    value={newCategoryName}
                    onChangeText={setNewCategoryName}
                    editable={!isSubmitting}
                />
                <Text style={styles.label} accessibilityRole="header">Wybierz kolor</Text>
                {/* Zmieniono View na ScrollView */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorContainer}>
                    {COLORS.map(color => (
                        <TouchableOpacity
                            key={color}
                            style={[styles.colorButton, { backgroundColor: color }, selectedColor === color && [styles.colorSelected, { borderColor: theme.colors.primary }]]}
                            onPress={() => setSelectedColor(color)}
                            disabled={isSubmitting}
                            accessibilityLabel={`Kolor ${color}${selectedColor === color ? ' wybrany' : ''}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected: selectedColor === color }}
                        />
                    ))}
                </ScrollView>
                <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.colors.primary }]} onPress={handleAddOrUpdateCategory} disabled={isSubmitting}>
                    {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.addButtonText}>{editingCategory ? 'Zapisz zmiany' : 'Dodaj kategorię'}</Text>}
                </TouchableOpacity>
                {editingCategory && (
                    <TouchableOpacity style={styles.cancelButton} onPress={cancelEditing} disabled={isSubmitting}>
                        {isSubmitting ? <ActivityIndicator color={theme.colors.danger} /> : <Text style={[styles.cancelButtonText, { color: theme.colors.danger }]}>Anuluj edycję</Text>}
                    </TouchableOpacity>
                )}
            </View>
            <Animated.FlatList
                data={categories}
                renderItem={(args) => (
                    <Animated.View layout={Layout.springify()}>
                        {renderCategory(args)}
                    </Animated.View>
                )}
                keyExtractor={item => item.id}
                ListHeaderComponent={<Text style={[styles.listHeader, { marginTop: Spacing.medium }]}>Twoje kategorie</Text>}
                ListEmptyComponent={<Text style={styles.emptyText}>Brak własnych kategorii.</Text>}
                contentContainerStyle={{ paddingBottom: Spacing.xLarge * 2 }}
            />
            {confirmDeleteCategory && (
                <ActionModal
                    visible={!!confirmDeleteCategory}
                    title={'Potwierdź usunięcie'}
                    message={`Czy na pewno chcesz usunąć kategorię "${confirmDeleteCategory?.name ?? ''}"? Zadania przypisane do niej zostaną przeniesione do kategorii "Inne".`}
                    onRequestClose={() => setConfirmDeleteCategory(null)}
                    actions={[
                        { text: 'Anuluj', variant: 'secondary', onPress: () => setConfirmDeleteCategory(null) },
                        {
                            text: 'Usuń', onPress: async () => {
                                if (!confirmDeleteCategory) return;
                                setIsSubmitting(true);
                                try {
                                    if (!currentUser) {
                                        showToast('Użytkownik nie jest zalogowany.', 'error');
                                        return;
                                    }
                                    const otherCategory = categories.find(cat => cat.name === 'Inne');
                                    const defaultCategoryId = otherCategory?.id;
                                    if (!defaultCategoryId) {
                                        showToast("Błąd: Nie znaleziono domyślnej kategorii 'Inne'. Upewnij się, że istnieje.", 'error');
                                        return;
                                    }
                                    const tasksRef = collection(db, 'tasks');
                                    const tasksToUpdateQuery = query(tasksRef, where('category', '==', confirmDeleteCategory.id), where('userId', '==', currentUser.uid));
                                    const tasksSnapshot = await getDocs(tasksToUpdateQuery);
                                    const batch = writeBatch(db);
                                    tasksSnapshot.docs.forEach(taskDoc => { batch.update(taskDoc.ref, { category: defaultCategoryId }); });
                                    batch.delete(doc(db, 'categories', confirmDeleteCategory.id));
                                    await batch.commit();
                                    showToast('Kategoria i powiązane zadania zaktualizowane!', 'success');
                                } catch (error: any) {
                                    // fallback do kolejki dla samego usunięcia kategorii (aktualizacja zadań offline pomijamy)
                                    try { await enqueueDelete(`categories/${confirmDeleteCategory.id}`); showToast('Kategoria zostanie usunięta po powrocie online.', 'info'); }
                                    catch { showToast('Błąd podczas usuwania kategorii.', 'error'); }
                                } finally {
                                    setIsSubmitting(false);
                                    setConfirmDeleteCategory(null);
                                }
                            }
                        },
                    ]}
                />
            )}
        </View>
    );
};

// Styles
const createStyles = (theme: Theme) => StyleSheet.create({
    container: {
        ...GlobalStyles.container,
        backgroundColor: theme.colors.background,
    },
    // Usunięto 'container' stąd, bo jest w GlobalStyles.container
    addSection: {
        padding: Spacing.large,
        backgroundColor: theme.colors.card,
        borderBottomWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 12, // From inline override
        marginHorizontal: Spacing.medium, // From inline override
    },
    sectionTitle: {
        fontSize: Typography.h3.fontSize,
        fontWeight: Typography.bold.fontWeight, // <-- Zmiana tutaj
        marginBottom: Spacing.small,
        color: theme.colors.textPrimary,
    },
    listHeader: {
        fontSize: Typography.h3.fontSize,
        fontWeight: Typography.bold.fontWeight, // <-- Zmiana tutaj
        marginBottom: Spacing.small,
        paddingHorizontal: Spacing.large,
        paddingTop: Spacing.large,
        color: theme.colors.textPrimary,
    },
    input: {
        ...GlobalStyles.input,
        marginBottom: Spacing.small,
        backgroundColor: theme.colors.inputBackground,
        borderColor: theme.colors.border,
        color: theme.colors.textPrimary,
    },
    label: {
        fontSize: Typography.body.fontSize,
        fontWeight: Typography.semiBold.fontWeight, // <-- Zmiana tutaj
        marginVertical: Spacing.small,
        color: theme.colors.textPrimary,
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
        borderColor: theme.colors.primary,
    },
    addButton: {
        ...GlobalStyles.button,
        backgroundColor: theme.colors.primary,
    },
    addButtonText: {
        ...GlobalStyles.buttonText,
    },
    cancelButton: {
        marginTop: Spacing.small,
        padding: Spacing.small,
    },
    cancelButtonText: {
        color: theme.colors.danger,
        textAlign: 'center',
        fontSize: Typography.body.fontSize,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.large,
        backgroundColor: theme.colors.card,
        borderBottomWidth: 1,
        borderColor: theme.colors.border,
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
        color: theme.colors.textPrimary,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: Spacing.xLarge,
        fontSize: Typography.body.fontSize,
        color: theme.colors.textSecondary,
    },
});

export default CategoriesScreen;
// Render confirm modal at bottom
/* eslint-disable react/display-name */
export const CategoriesScreenWithModals = () => null;
