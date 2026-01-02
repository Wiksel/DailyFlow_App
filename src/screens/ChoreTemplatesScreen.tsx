import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import LabeledInput from '../components/LabeledInput';
import ActionModal from '../components/ActionModal';
import { useRoute, RouteProp } from '@react-navigation/native';
import { getAuth } from '../utils/authCompat';
import { db } from '../utils/firestoreCompat';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, QuerySnapshotCompat } from '../utils/firestoreCompat';
import { enqueueAdd, enqueueUpdate, enqueueDelete } from '../utils/offlineQueue';
import Slider from '@react-native-community/slider';
import { Feather } from '@expo/vector-icons';
import { TaskStackParamList } from '../types/navigation';
import { ChoreTemplate } from '../types';
import CategoryFilter from '../components/CategoryFilter';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import AnimatedIconButton from '../components/AnimatedIconButton';
import { useUI } from '../contexts/UIContext';

import { useCategories } from '../contexts/CategoryContext';
import { useToast } from '../contexts/ToastContext';
import { Colors, Spacing, Typography, GlobalStyles, isColorLight, densityScale } from '../styles/AppStyles';
import { useTheme, Theme } from '../contexts/ThemeContext';
import AppHeader from '../components/AppHeader';

type ChoreTemplatesScreenRouteProp = RouteProp<TaskStackParamList, 'ChoreTemplates'>;

const ChoreTemplatesScreen = () => {
    const route = useRoute<ChoreTemplatesScreenRouteProp>();

    const { categories, loading: categoriesLoading } = useCategories();
    const { showToast } = useToast();

    const [templates, setTemplates] = useState<ChoreTemplate[]>([]);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateDifficulty, setNewTemplateDifficulty] = useState(5);

    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | 'all'>('all');
    const [loading, setLoading] = useState(true);
    const [editingTemplate, setEditingTemplate] = useState<ChoreTemplate | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { density } = useUI();
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const isCompact = density === 'compact';
    const currentUser = getAuth().currentUser;


    useEffect(() => {
        if (!currentUser) return;
        const templatesRef = collection(db, 'choreTemplates');
        const q = query(templatesRef, where("userId", "==", currentUser.uid));
        const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshotCompat) => {
            const templatesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ChoreTemplate));
            setTemplates(templatesData);
            setLoading(false);

            const templateIdToEdit = route.params?.templateId;
            if (templateIdToEdit) {
                const templateToEdit = templatesData.find(t => t.id === templateIdToEdit);
                if (templateToEdit) {
                    startEditing(templateToEdit);
                }
            }
        }, (error) => {
            console.error("Błąd pobierania szablonów: ", error);
            showToast("Błąd pobierania szablonów.", 'error');
            setLoading(false);
        });
        return unsubscribe;
    }, [currentUser, route.params?.templateId]);

    useEffect(() => {
        if (!editingTemplate && categories.length > 0 && !selectedCategory) {
            setSelectedCategory(categories[0].id);
        }
    }, [categories, editingTemplate, selectedCategory]);

    const filteredTemplates = useMemo(() => {
        if (activeCategoryFilter === 'all') {
            return templates;
        }
        return templates.filter(t => t.category === activeCategoryFilter);
    }, [templates, activeCategoryFilter]);

    const handleAddOrUpdateTemplate = async () => {
        if (!newTemplateName.trim() || !currentUser) {
            showToast("Nazwa szablonu nie może być pusta.", 'error');
            return;
        }
        if (!selectedCategory) {
            showToast("Proszę wybrać kategorię.", 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingTemplate) {
                const templateRef = doc(db, 'choreTemplates', editingTemplate.id);
                const payload = {
                    name: newTemplateName.trim(),
                    difficulty: newTemplateDifficulty,
                    category: selectedCategory,
                };
                try { await updateDoc(templateRef, payload); }
                catch { await enqueueUpdate(`choreTemplates/${editingTemplate.id}`, payload); }
                showToast("Szablon zaktualizowany!", 'success');
                setEditingTemplate(null);
            } else {
                const payload = {
                    name: newTemplateName.trim(),
                    difficulty: newTemplateDifficulty,
                    category: selectedCategory,
                    userId: currentUser.uid,
                };
                try { await addDoc(collection(db, 'choreTemplates'), payload); }
                catch { await enqueueAdd('choreTemplates', payload); }
                showToast("Szablon dodany!", 'success');
            }
            setNewTemplateName('');
            setNewTemplateDifficulty(5);
            if (categories.length > 0) {
                setSelectedCategory(categories[0].id);
            }
        } catch (error: any) {
            showToast('Błąd dodawania/aktualizacji szablonu.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState<ChoreTemplate | null>(null);
    const handleDeleteTemplate = (template: ChoreTemplate) => setConfirmDeleteTemplate(template);

    const startEditing = (template: ChoreTemplate) => {
        setEditingTemplate(template);
        setNewTemplateName(template.name);
        setNewTemplateDifficulty(template.difficulty);
        setSelectedCategory(template.category);
    };

    const cancelEditing = () => {
        setEditingTemplate(null);
        setNewTemplateName('');
        setNewTemplateDifficulty(5);
        if (categories.length > 0) {
            setSelectedCategory(categories[0].id);
        }
    };

    const renderTemplate = ({ item }: { item: ChoreTemplate }) => {
        const category = categories.find(c => c.id === item.category);
        return (
            <View style={[styles.templateItem, GlobalStyles.rowPress, isCompact && { paddingVertical: Spacing.medium, paddingHorizontal: Spacing.medium }]}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.templateName, isCompact && { fontSize: densityScale(Typography.body.fontSize, true) }]}>{item.name}</Text>
                    <Text style={[styles.templateDifficulty, isCompact && { fontSize: densityScale(Typography.small.fontSize, true) }]}>Trudność: {item.difficulty}/10</Text>
                </View>
                {category && <View style={[styles.categoryTag, { backgroundColor: category.color }]}><Text style={styles.categoryTagText}>{category.name}</Text></View>}
                <AnimatedIconButton icon="edit-2" size={22} color={theme.colors.primary} onPress={() => startEditing(item)} style={{ marginHorizontal: Spacing.medium }} accessibilityLabel="Edytuj szablon" />
                <AnimatedIconButton icon="trash-2" size={22} color={theme.colors.danger} onPress={() => handleDeleteTemplate(item)} accessibilityLabel="Usuń szablon" />
            </View>
        );
    };

    if (loading || categoriesLoading) {
        return (
            <View style={[GlobalStyles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <AppHeader title="Szablony" />
            <Animated.View layout={Layout.springify()} style={styles.section}>
                <Text style={styles.sectionTitle}>{editingTemplate ? 'Edytuj szablon' : 'Dodaj nowy szablon'}</Text>
                <LabeledInput label="Nazwa szablonu" placeholder="Np. Zmywanie naczyń" value={newTemplateName} onChangeText={setNewTemplateName} editable={!isSubmitting} />
                <Text style={styles.label}>Kategoria</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryContainer}>
                    {categories.map(cat => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.categoryButton,
                                { backgroundColor: cat.color },
                                selectedCategory === cat.id && styles.categorySelected
                            ]}
                            onPress={() => setSelectedCategory(cat.id)}
                            disabled={isSubmitting}
                            accessibilityRole="button"
                            accessibilityLabel={`Kategoria ${cat.name}${selectedCategory === cat.id ? ' wybrana' : ''}`}
                            accessibilityState={{ selected: selectedCategory === cat.id }}
                        >
                            <Text style={[
                                styles.categoryText,
                                isColorLight(cat.color) ? { color: Colors.textPrimary } : { color: 'white' }
                            ]}>
                                {cat.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                <Text style={styles.label}>Trudność: {newTemplateDifficulty}</Text>
                <Slider
                    style={GlobalStyles.slider}
                    minimumValue={1}
                    maximumValue={10}
                    step={1}
                    value={newTemplateDifficulty}
                    onValueChange={setNewTemplateDifficulty}
                    minimumTrackTintColor={theme.colors.primary}
                    maximumTrackTintColor={theme.colors.border}
                    thumbTintColor={theme.colors.primary}
                    disabled={isSubmitting}
                />
                <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.colors.primary }]} onPress={handleAddOrUpdateTemplate} disabled={isSubmitting}>
                    {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={GlobalStyles.buttonText}>{editingTemplate ? 'Zapisz zmiany' : 'Dodaj szablon'}</Text>}
                </TouchableOpacity>
                {editingTemplate && (
                    <TouchableOpacity style={styles.cancelButton} onPress={cancelEditing} disabled={isSubmitting}>
                        {isSubmitting ? <ActivityIndicator color={theme.colors.danger} /> : <Text style={[styles.cancelButtonText, { color: theme.colors.danger }]}>Anuluj edycję</Text>}
                    </TouchableOpacity>
                )}
            </Animated.View>

            <CategoryFilter activeCategory={activeCategoryFilter} onSelectCategory={setActiveCategoryFilter} />

            <View style={{ flex: 1 }}>
                {loading ? <ActivityIndicator size="large" color={theme.colors.primary} /> : (
                    <Animated.FlatList
                        data={filteredTemplates}
                        renderItem={(args) => (
                            <Animated.View layout={Layout.springify()}>
                                {renderTemplate(args)}
                            </Animated.View>
                        )}
                        keyExtractor={item => item.id}
                        ListHeaderComponent={<Text style={styles.listHeader}>Twoje szablony</Text>}
                        ListEmptyComponent={<Text style={styles.emptyText}>Brak szablonów w tej kategorii.</Text>}
                        initialNumToRender={12}
                        windowSize={10}
                        removeClippedSubviews
                        maxToRenderPerBatch={12}
                    />
                )}
            </View>
            <ActionModal
                visible={!!confirmDeleteTemplate}
                title={'Potwierdź usunięcie'}
                message={confirmDeleteTemplate ? `Czy na pewno chcesz usunąć szablon "${confirmDeleteTemplate.name}"?` : ''}
                onRequestClose={() => setConfirmDeleteTemplate(null)}
                actions={[
                    { text: 'Anuluj', variant: 'secondary', onPress: () => setConfirmDeleteTemplate(null) },
                    { text: 'Usuń', onPress: async () => { if (!confirmDeleteTemplate) return; setIsSubmitting(true); try { await deleteDoc(doc(db, 'choreTemplates', confirmDeleteTemplate.id)); showToast('Szablon usunięty!', 'success'); } catch (e: any) { try { await enqueueDelete(`choreTemplates/${confirmDeleteTemplate.id}`); showToast('Szablon zostanie usunięty po powrocie online.', 'info'); } catch { } } finally { setIsSubmitting(false); setConfirmDeleteTemplate(null); } } },
                ]}
            />
        </View>
    );
};

const createStyles = (theme: Theme) => StyleSheet.create({
    container: {
        ...GlobalStyles.container,
        backgroundColor: theme.colors.background,
    },
    section: {
        backgroundColor: theme.colors.card,
        padding: Spacing.large,
        marginTop: Spacing.medium,
        borderRadius: 10,
        marginHorizontal: Spacing.medium,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
        elevation: 3,
        borderColor: theme.colors.border,
        borderWidth: 1, // Add explicit border
    },
    addSection: {
        backgroundColor: theme.colors.card,
        borderColor: theme.colors.border,
        borderBottomWidth: 1,
    },
    sectionTitle: {
        fontSize: Typography.h3.fontSize,
        fontWeight: Typography.bold.fontWeight,
        marginBottom: Spacing.small,
        color: theme.colors.textPrimary,
    },
    listHeader: {
        fontSize: Typography.h3.fontSize,
        fontWeight: Typography.bold.fontWeight,
        marginBottom: Spacing.small,
        paddingHorizontal: Spacing.large,
        paddingTop: Spacing.large,
        color: theme.colors.textPrimary,
    },
    label: {
        fontSize: Typography.body.fontSize,
        fontWeight: Typography.semiBold.fontWeight,
        marginVertical: Spacing.small,
        color: theme.colors.textPrimary,
    },
    categoryContainer: { flexDirection: 'row', paddingVertical: Spacing.xSmall, marginBottom: Spacing.small },
    categoryButton: {
        paddingVertical: Spacing.xSmall,
        paddingHorizontal: Spacing.medium,
        borderRadius: 20,
        marginRight: Spacing.small,
        opacity: 0.7
    },
    categorySelected: {
        opacity: 1,
        transform: [{ scale: 1.05 }],
        elevation: 2,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
    },
    categoryText: { color: 'white', fontWeight: Typography.bold.fontWeight },
    addButton: {
        ...GlobalStyles.button,
        marginTop: Spacing.small,
        backgroundColor: theme.colors.primary,
    },
    cancelButton: { marginTop: Spacing.small, padding: Spacing.small },
    cancelButtonText: { color: theme.colors.danger, textAlign: 'center', fontSize: Typography.body.fontSize },
    templateItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.large,
        borderBottomWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.card,
    },
    templateName: { fontSize: Typography.body.fontSize, fontWeight: Typography.semiBold.fontWeight, color: theme.colors.textPrimary },
    templateDifficulty: { fontSize: Typography.small.fontSize, color: theme.colors.textSecondary },
    categoryTag: { paddingHorizontal: Spacing.small, paddingVertical: 3, borderRadius: 10 },
    categoryTagText: { color: 'white', fontSize: Typography.small.fontSize, fontWeight: Typography.bold.fontWeight },
    emptyText: { textAlign: 'center', marginTop: Spacing.xLarge, fontSize: Typography.body.fontSize, color: theme.colors.textSecondary },
});

export default ChoreTemplatesScreen;
