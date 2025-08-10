import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import ActionModal from '../components/ActionModal';
import { useRoute, RouteProp } from '@react-navigation/native';
import auth, { getAuth } from '@react-native-firebase/auth'; // ZMIANA
import { db } from '../../firebaseConfig'; // <--- TEN IMPORT ZOSTAJE
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import Slider from '@react-native-community/slider';
import { Feather } from '@expo/vector-icons';
import { TaskStackParamList } from '../types/navigation';
import { ChoreTemplate } from '../types';
import CategoryFilter from '../components/CategoryFilter';

import { useCategories } from '../contexts/CategoryContext';
import { useToast } from '../contexts/ToastContext';
import { Colors, Spacing, Typography, GlobalStyles, isColorLight } from '../styles/AppStyles';

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
    const currentUser = getAuth().currentUser; // ZMIANA


    useEffect(() => {
        if (!currentUser) return;
        const templatesRef = collection(db, 'choreTemplates');
        const q = query(templatesRef, where("userId", "==", currentUser.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
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
                await updateDoc(templateRef, {
                    name: newTemplateName.trim(),
                    difficulty: newTemplateDifficulty,
                    category: selectedCategory,
                });
                showToast("Szablon zaktualizowany!", 'success');
                setEditingTemplate(null);
            } else {
                await addDoc(collection(db, 'choreTemplates'), {
                    name: newTemplateName.trim(),
                    difficulty: newTemplateDifficulty,
                    category: selectedCategory,
                    userId: currentUser.uid,
                });
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
            <View style={styles.templateItem}>
                <View style={{flex: 1}}>
                    <Text style={styles.templateName}>{item.name}</Text>
                    <Text style={styles.templateDifficulty}>Trudność: {item.difficulty}/10</Text>
                </View>
                {category && <View style={[styles.categoryTag, {backgroundColor: category.color}]}><Text style={styles.categoryTagText}>{category.name}</Text></View>}
                <TouchableOpacity onPress={() => startEditing(item)} style={{marginHorizontal: Spacing.medium}}>
                    <Feather name="edit-2" size={22} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteTemplate(item)}>
                    <Feather name="trash-2" size={22} color={Colors.danger} />
                </TouchableOpacity>
            </View>
        );
    };

    if (loading || categoriesLoading) {
        return <View style={GlobalStyles.container}><ActivityIndicator size="large" color={Colors.primary} /></View>;
    }

    return (
        <View style={GlobalStyles.container}>
            <View style={GlobalStyles.section}>
                <Text style={styles.sectionTitle}>{editingTemplate ? 'Edytuj szablon' : 'Dodaj nowy szablon'}</Text>
                <TextInput
                    style={GlobalStyles.input}
                    placeholder="Np. Zmywanie naczyń"
                    value={newTemplateName}
                    onChangeText={setNewTemplateName}
                    placeholderTextColor={Colors.placeholder}
                    editable={!isSubmitting}
                />
                <Text style={styles.label}>Kategoria</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryContainer}>
                    {categories.map(cat => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.categoryButton,
                                {backgroundColor: cat.color},
                                selectedCategory === cat.id && styles.categorySelected
                            ]}
                            onPress={() => setSelectedCategory(cat.id)}
                            disabled={isSubmitting}
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
                    minimumTrackTintColor={Colors.primary}
                    maximumTrackTintColor={Colors.border}
                    thumbTintColor={Colors.primary}
                    disabled={isSubmitting}
                />
                <TouchableOpacity style={GlobalStyles.button} onPress={handleAddOrUpdateTemplate} disabled={isSubmitting}>
                    {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={GlobalStyles.buttonText}>{editingTemplate ? 'Zapisz zmiany' : 'Dodaj szablon'}</Text>}
                </TouchableOpacity>
                {editingTemplate && (
                    <TouchableOpacity style={styles.cancelButton} onPress={cancelEditing} disabled={isSubmitting}>
                        {isSubmitting ? <ActivityIndicator color={Colors.danger} /> : <Text style={styles.cancelButtonText}>Anuluj edycję</Text>}
                    </TouchableOpacity>
                )}
            </View>

            <CategoryFilter activeCategory={activeCategoryFilter} onSelectCategory={setActiveCategoryFilter} />

            <View style={{flex: 1}}>
                {loading ? <ActivityIndicator size="large" color={Colors.primary} /> : (
                    <FlatList
                        data={filteredTemplates}
                        renderItem={renderTemplate}
                        keyExtractor={item => item.id}
                        ListHeaderComponent={<Text style={styles.listHeader}>Twoje szablony</Text>}
                        ListEmptyComponent={<Text style={styles.emptyText}>Brak szablonów w tej kategorii.</Text>}
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
                    { text: 'Usuń', onPress: async () => { if (!confirmDeleteTemplate) return; setIsSubmitting(true); try { await deleteDoc(doc(db, 'choreTemplates', confirmDeleteTemplate.id)); showToast('Szablon usunięty!', 'success'); } catch (e:any) { showToast('Błąd podczas usuwania szablonu.', 'error'); } finally { setIsSubmitting(false); setConfirmDeleteTemplate(null); } } },
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    addSection: {
        backgroundColor: 'white',
    },
    sectionTitle: {
        fontSize: Typography.h3.fontSize,
        fontWeight: Typography.bold.fontWeight,
        marginBottom: Spacing.small,
    },
    listHeader: {
        fontSize: Typography.h3.fontSize,
        fontWeight: Typography.bold.fontWeight,
        marginBottom: Spacing.small,
        paddingHorizontal: Spacing.large,
        paddingTop: Spacing.large,
    },
    label: { fontSize: Typography.body.fontSize, fontWeight: Typography.semiBold.fontWeight, marginVertical: Spacing.small },
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
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
    },
    categoryText: { color: 'white', fontWeight: Typography.bold.fontWeight },
    cancelButton: { marginTop: Spacing.small, padding: Spacing.small },
    cancelButtonText: { color: Colors.danger, textAlign: 'center', fontSize: Typography.body.fontSize },
    templateItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.large, backgroundColor: 'white', borderBottomWidth: 1, borderColor: Colors.border },
    templateName: { fontSize: Typography.body.fontSize, fontWeight: Typography.semiBold.fontWeight },
    templateDifficulty: { fontSize: Typography.small.fontSize, color: Colors.textSecondary },
    categoryTag: { paddingHorizontal: Spacing.small, paddingVertical: 3, borderRadius: 10 },
    categoryTagText: { color: 'white', fontSize: Typography.small.fontSize, fontWeight: Typography.bold.fontWeight },
    emptyText: { textAlign: 'center', marginTop: Spacing.xLarge, fontSize: Typography.body.fontSize, color: Colors.textSecondary },
});

export default ChoreTemplatesScreen;