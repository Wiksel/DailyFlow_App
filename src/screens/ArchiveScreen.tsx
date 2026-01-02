// src/screens/ArchiveScreen.tsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, ScrollView, Platform, Dimensions, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import ActionModal from '../components/ActionModal';
import { useToast } from '../contexts/ToastContext';
import { getAuth } from '../utils/authCompat';
import { db } from '../utils/firestoreCompat'; // <--- TEN IMPORT ZOSTAJE
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc, getDoc, addDoc, Timestamp, QuerySnapshotCompat } from '../utils/firestoreCompat';
import { enqueueAdd, enqueueUpdate, enqueueDelete } from '../utils/offlineQueue';
import { Task, Category, UserProfile, Pair } from '../types';
import { useCategories } from '../contexts/CategoryContext';
import { Feather } from '@expo/vector-icons';
import EmptyState from '../components/EmptyState';
import CategoryFilter from '../components/CategoryFilter';
import DateRangeFilter from '../components/DateRangeFilter';
import ActionButton from '../components/ActionButton';
import { Picker } from '@react-native-picker/picker';
import { Colors, Spacing, Typography, GlobalStyles, densityScale } from '../styles/AppStyles';
import AppHeader from '../components/AppHeader';
import { useTheme } from '../contexts/ThemeContext';
import FilterPresets from '../components/FilterPresets';
import SearchBar from '../components/SearchBar'; // <-- Import SearchBar
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toCsv, fromCsv } from '../utils/csv';
import { safeToIsoString, safeToDate } from '../utils/dateUtils';
import Animated, { FadeInUp, Layout, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import AnimatedIconButton from '../components/AnimatedIconButton';
import { useUI } from '../contexts/UIContext';

const ArchivedTaskItem = React.memo(({
    item,
    categories,
    userProfile,
    theme,
    isCompact,
    onRestore,
    onDelete
}: {
    item: Task;
    categories: Category[];
    userProfile: UserProfile | null;
    theme: any;
    isCompact: boolean;
    onRestore: (id: string) => void;
    onDelete: (id: string) => void;
}) => {
    const category = categories.find((c: Category) => c.id === item.category);
    const isCompletedByCurrentUser = item.completedBy === userProfile?.nickname;
    const isCreatedByCurrentUser = item.creatorNickname === userProfile?.nickname;

    let sharedWithInfo = '';
    if (item.isShared && userProfile?.pairId) {
        if (item.completedBy && !isCompletedByCurrentUser) {
            sharedWithInfo = `Ukończone przez: ${item.completedBy}`;
        }
        else if (item.creatorNickname && !isCreatedByCurrentUser) {
            sharedWithInfo = `Utworzone przez: ${item.creatorNickname}`;
        }
    }

    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    return (
        <Animated.View style={[
            styles.taskContainer,
            isCompact && { paddingVertical: Spacing.small, paddingHorizontal: Spacing.medium },
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            GlobalStyles.rowPress,
            animatedStyle
        ]}>
            <View style={styles.taskContent}>
                <Text style={[styles.taskTitle, { color: theme.colors.textPrimary }, isCompact && { fontSize: densityScale(Typography.body.fontSize + 1, true) }]}>{item.text}</Text>
                {!!item.description && <Text style={[styles.taskDescription, { color: theme.colors.textSecondary }]}>{item.description}</Text>}

                <View style={styles.taskMetaContainer}>
                    {category && <View style={[styles.categoryTag, { backgroundColor: category.color }]}><Text style={styles.categoryTagText}>{category.name}</Text></View>}
                    {item.isShared && <Text style={[styles.creatorText, { color: theme.colors.textSecondary }]}>od: {item.creatorNickname}</Text>}

                    {sharedWithInfo ? <Text style={styles.sharedInfoText}>{sharedWithInfo}</Text> : null}
                </View>
                {item.completedBy && item.completedAt && (
                    <Text style={[styles.completedText, { color: theme.colors.textSecondary }]}>
                        Wykonane przez: {item.completedBy} dnia {safeToDate(item.completedAt)?.toLocaleDateString('pl-PL') || ''}
                    </Text>
                )}
            </View>
            <View style={styles.actionsContainer}>
                <AnimatedIconButton icon="refresh-ccw" size={22} color={theme.colors.primary} onPress={async () => { try { await Haptics.selectionAsync(); } catch { }; await onRestore(item.id); }} style={styles.actionButton as any} accessibilityLabel="Przywróć zadanie" />
                <AnimatedIconButton icon="trash-2" size={22} color={theme.colors.danger} onPress={async () => { try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch { }; onDelete(item.id); }} style={[styles.actionButton as any, { marginLeft: Spacing.medium }]} accessibilityLabel="Usuń na stałe" />
            </View>
        </Animated.View>
    );
});

const ArchiveScreen = () => {
    const [rawArchivedTasks, setRawArchivedTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();
    const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const { density } = useUI();
    const isCompact = density === 'compact';

    const [filterCompletedFromDate, setFilterCompletedFromDate] = useState<Date | null>(null);
    const [filterCompletedToDate, setFilterCompletedToDate] = useState<Date | null>(null);

    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [activeCategoryArchive, setActiveCategoryArchive] = useState<string | 'all'>('all');

    const [archivedTaskType, setArchivedTaskType] = useState<'personal' | 'shared' | 'all'>('all');
    const [partnerNicknames, setPartnerNicknames] = useState<{ id: string; nickname: string }[]>([]);
    const [selectedPartnerId, setSelectedPartnerId] = useState<string | 'all'>('all');

    const { categories } = useCategories();
    const theme = useTheme();
    const currentUser = getAuth().currentUser;
    const didLoadFiltersRef = useRef(false);
    const ARCHIVE_FILTERS_KEY = 'dailyflow_archive_filters';

    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }

        const userUnsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), async (docSnapshot) => {
            const profileData = docSnapshot.data() as UserProfile;
            setUserProfile(profileData);

            if (profileData?.pairId) {
                const pairDoc = await getDoc(doc(db, 'pairs', profileData.pairId));
                if (pairDoc.exists()) {
                    const pairData = pairDoc.data() as any;
                    const pairMembers: string[] = Array.isArray(pairData?.members) ? pairData.members : [];
                    const nicknames: { id: string; nickname: string }[] = [];
                    for (const memberId of pairMembers) {
                        const memberDoc = await getDoc(doc(db, 'users', memberId));
                        if (memberDoc.exists() && memberDoc.data()?.nickname) {
                            nicknames.push({ id: memberId, nickname: memberDoc.data()!.nickname });
                        }
                    }
                    setPartnerNicknames(nicknames);
                } else {
                    setPartnerNicknames([]);
                }
            } else {
                setPartnerNicknames([]);
            }
        });

        const tasksRef = collection(db, 'tasks');

        let personalUnsubscribe: (() => void) | undefined;
        let sharedUnsubscribe: (() => void) | undefined;

        const updateRawTasks = (newPersonalTasks: Task[], newSharedTasks: Task[]) => {
            const combinedTasks = new Map<string, Task>();
            newPersonalTasks.forEach(task => combinedTasks.set(task.id, task));
            newSharedTasks.forEach(task => combinedTasks.set(task.id, task));
            setRawArchivedTasks(Array.from(combinedTasks.values()));
            setLoading(false);
        };

        let currentPersonalTasks: Task[] = [];
        let currentSharedTasks: Task[] = [];

        personalUnsubscribe = onSnapshot(query(
            tasksRef,
            where("userId", "==", currentUser.uid),
            where("status", "==", "archived"),
            orderBy("completedAt", "desc")
        ), (snapshot: QuerySnapshotCompat) => {
            currentPersonalTasks = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task));
            updateRawTasks(currentPersonalTasks, currentSharedTasks);
        }, (error) => {
            console.error("Błąd pobierania osobistych zadań archiwalnych: ", error);
            setLoading(false);
        });

        const setupSharedTasksSubscription = (pairId: string | undefined | null) => {
            if (sharedUnsubscribe) {
                sharedUnsubscribe();
            }

            if (pairId) {
                sharedUnsubscribe = onSnapshot(query(
                    tasksRef,
                    where("pairId", "==", pairId),
                    where("status", "==", "archived"),
                    orderBy("completedAt", "desc")
                ), (snapshot: QuerySnapshotCompat) => {
                    currentSharedTasks = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task));
                    updateRawTasks(currentPersonalTasks, currentSharedTasks);
                }, (error) => {
                    console.error("Błąd pobierania współdzielonych zadań archiwalnych: ", error);
                    setLoading(false);
                });
            } else {
                currentSharedTasks = [];
                updateRawTasks(currentPersonalTasks, currentSharedTasks);
            }
        };

        setupSharedTasksSubscription(userProfile?.pairId);


        return () => {
            userUnsubscribe();
            if (personalUnsubscribe) personalUnsubscribe();
            if (sharedUnsubscribe) sharedUnsubscribe();
        };
    }, [currentUser, userProfile?.pairId]);

    // Load saved filters
    useEffect(() => {
        const loadFilters = async () => {
            if (!currentUser) return;
            try {
                const key = `${ARCHIVE_FILTERS_KEY}_${currentUser.uid}`;
                const raw = await AsyncStorage.getItem(key);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed.searchQuery) setSearchQuery(parsed.searchQuery);
                    if (parsed.activeCategoryArchive) setActiveCategoryArchive(parsed.activeCategoryArchive);
                    if (parsed.archivedTaskType) setArchivedTaskType(parsed.archivedTaskType);
                    if (parsed.selectedPartnerId) setSelectedPartnerId(parsed.selectedPartnerId);
                    if (parsed.filterCompletedFromDate) setFilterCompletedFromDate(new Date(parsed.filterCompletedFromDate));
                    if (parsed.filterCompletedToDate) setFilterCompletedToDate(new Date(parsed.filterCompletedToDate));
                }
            } catch { }
            finally { didLoadFiltersRef.current = true; }
        };
        loadFilters();
    }, [currentUser]);

    // Save filters with debounce
    useEffect(() => {
        const saveFilters = async () => {
            if (!currentUser || !didLoadFiltersRef.current) return;
            try {
                const key = `${ARCHIVE_FILTERS_KEY}_${currentUser.uid}`;
                const payload = {
                    searchQuery,
                    activeCategoryArchive,
                    archivedTaskType,
                    selectedPartnerId,
                    filterCompletedFromDate: filterCompletedFromDate ? filterCompletedFromDate.toISOString() : null,
                    filterCompletedToDate: filterCompletedToDate ? filterCompletedToDate.toISOString() : null,
                };
                await AsyncStorage.setItem(key, JSON.stringify(payload));
            } catch { }
        };
        const t = setTimeout(saveFilters, 300);
        return () => clearTimeout(t);
    }, [currentUser, searchQuery, activeCategoryArchive, archivedTaskType, selectedPartnerId, filterCompletedFromDate, filterCompletedToDate]);


    const processedAndSortedArchivedTasks = useMemo(() => {
        let filtered = rawArchivedTasks.filter(task => {
            if (archivedTaskType !== 'all') {
                const isPersonalTask = !task.isShared;
                if (archivedTaskType === 'personal' && !isPersonalTask) return false;
                if (archivedTaskType === 'shared' && isPersonalTask) return false;
            }

            if (searchQuery.trim() !== '') {
                const lowerCaseQuery = searchQuery.toLowerCase();
                const matchesSearch = task.text.toLowerCase().includes(lowerCaseQuery) ||
                    (task.description && task.description.toLowerCase().includes(lowerCaseQuery));
                if (!matchesSearch) return false;
            }

            const taskCompletedAt = safeToDate(task.completedAt);
            if (taskCompletedAt) {
                if (filterCompletedFromDate) {
                    const fromTime = new Date(filterCompletedFromDate);
                    fromTime.setHours(0, 0, 0, 0);
                    if (taskCompletedAt.getTime() < fromTime.getTime()) {
                        return false;
                    }
                }
                if (filterCompletedToDate) {
                    const toTime = new Date(filterCompletedToDate);
                    toTime.setHours(23, 59, 59, 999);
                    if (taskCompletedAt.getTime() > toTime.getTime()) {
                        return false;
                    }
                }
            }

            const matchesCategory = activeCategoryArchive === 'all' || task.category === activeCategoryArchive;
            if (!matchesCategory) return false;

            // FILTROWANIE PO PARTNERZE
            if (selectedPartnerId !== 'all' && task.isShared) {
                if (selectedPartnerId === currentUser?.uid) {
                    if (task.creatorNickname !== userProfile?.nickname && task.completedBy !== userProfile?.nickname) {
                        return false;
                    }
                } else {
                    const targetPartnerNickname = partnerNicknames.find(p => p.id === selectedPartnerId)?.nickname;
                    if (targetPartnerNickname) {
                        if (task.creatorNickname !== targetPartnerNickname && task.completedBy !== targetPartnerNickname) {
                            return false;
                        }
                    }
                }
            }

            return true;
        });

        const sorted = filtered.sort((a, b) => {
            const dateA = a.completedAt?.toMillis() || 0;
            const dateB = b.completedAt?.toMillis() || 0;
            return dateB - dateA;
        });
        return sorted;

    }, [rawArchivedTasks, searchQuery, filterCompletedFromDate, filterCompletedToDate, activeCategoryArchive, archivedTaskType, selectedPartnerId, partnerNicknames, userProfile, currentUser]);

    const handleRestoreTask = useCallback(async (taskId: string) => {
        const payload = { status: 'active', completed: false, completedAt: null, completedBy: null };
        try { await updateDoc(doc(db, 'tasks', taskId), payload); }
        catch { await enqueueUpdate(`tasks/${taskId}`, payload); }
    }, []);

    const handlePermanentDelete = useCallback((taskId: string) => setConfirmDeleteTaskId(taskId), []);



    return (
        <View style={[GlobalStyles.container, { backgroundColor: theme.colors.background }]}>
            <AppHeader title="Archiwum" />
            {/* Pasek akcji eksportu */}
            <Animated.View layout={Layout.springify()} style={[GlobalStyles.card, styles.exportBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <ActionButton
                    leftIcon="download"
                    leftIconSize={20}
                    title="Eksportuj CSV"
                    haptic="light"
                    style={[styles.exportButton, { backgroundColor: theme.colors.primary }]}
                    onPress={async () => {
                        try {
                            await Haptics.selectionAsync();
                        } catch { }
                        try {
                            // Przygotuj dane CSV
                            const rows = processedAndSortedArchivedTasks.map(t => ({
                                id: t.id,
                                text: t.text,
                                description: t.description || '',
                                category: categories.find(c => c.id === t.category)?.name || '',
                                isShared: t.isShared ? 'tak' : 'nie',
                                creatorNickname: t.creatorNickname,
                                completedBy: t.completedBy || '',
                                createdAt: safeToIsoString(t.createdAt) || '',
                                completedAt: safeToIsoString(t.completedAt) || '',
                                deadline: safeToIsoString(t.deadline) || '',
                            }));
                            const csv = toCsv(rows);
                            const dir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory!;
                            const filePath = `${dir}archive_export_${Date.now()}.csv`;
                            await FileSystem.writeAsStringAsync(filePath, csv, { encoding: (FileSystem as any).EncodingType.UTF8 });
                            // W Android/Expo można użyć shareSheet – ale brak expo-sharing, więc podamy ścieżkę i log
                            try { console.debug('CSV saved at:', filePath); } catch { }
                            showToast('Wyeksportowano CSV. Plik zapisany w: ' + filePath, 'success');
                        } catch (e) {
                            console.error('Export CSV failed', e);
                            showToast('Nie udało się wyeksportować CSV.', 'error');
                        }
                    }}
                />
                <ActionButton
                    leftIcon="upload"
                    leftIconSize={20}
                    title="Importuj CSV"
                    haptic="light"
                    style={[styles.exportButton, { backgroundColor: theme.colors.secondary, marginLeft: Spacing.small }]}
                    onPress={async () => {
                        try { await Haptics.selectionAsync(); } catch { }
                        try {
                            const res = await DocumentPicker.getDocumentAsync({ type: 'text/*', multiple: false });
                            if (res.canceled || !res.assets?.[0]) return;
                            const uri = res.assets[0].uri;
                            const csv = await FileSystem.readAsStringAsync(uri, { encoding: (FileSystem as any).EncodingType.UTF8 });
                            const rows = fromCsv(csv);
                            // Import minimalny: tylko tekst i kategoria
                            let imported = 0;
                            for (const r of rows) {
                                const text = (r['text'] || r['name'] || '').trim();
                                if (!text) continue;
                                const catName = (r['category'] || '').trim();
                                const category = categories.find(c => c.name === catName)?.id || activeCategoryArchive !== 'all' ? activeCategoryArchive as string : (categories[0]?.id || 'default');
                                const payload = {
                                    text,
                                    description: r['description'] || '',
                                    category,
                                    basePriority: Number(r['basePriority'] || 3),
                                    difficulty: Number(r['difficulty'] || 2),
                                    deadline: r['deadline'] ? new Date(r['deadline']) : null,
                                    completed: true,
                                    status: 'archived',
                                    userId: currentUser?.uid,
                                    creatorNickname: userProfile?.nickname || 'Użytkownik',
                                    isShared: false,
                                    pairId: null,
                                    createdAt: Timestamp.now(),
                                    completedAt: Timestamp.now(),
                                };
                                try { await addDoc(collection(db, 'tasks'), payload); imported++; }
                                catch { await enqueueAdd('tasks', payload); imported++; }
                            }
                            showToast(`Zaimportowano ${imported} pozycji.`, 'success');
                        } catch (e) {
                            console.error('Import CSV failed', e);
                            showToast('Nie udało się zaimportować CSV.', 'error');
                        }
                    }}
                />
            </Animated.View>
            {/* Przełącznik typu zadań (osobiste/wspólne/wszystkie) */}
            <Animated.View layout={Layout.springify()} style={[GlobalStyles.card, styles.taskTypeSwitchContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <ActionButton
                    title="Osobiste"
                    onPress={() => { setArchivedTaskType('personal'); setSelectedPartnerId('all'); }}
                    style={[styles.taskTypeButton, archivedTaskType === 'personal' ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.inputBackground }]}
                    textStyle={[styles.taskTypeButtonText, archivedTaskType === 'personal' ? { color: '#fff' } : { color: theme.colors.textSecondary }]}
                />
                <ActionButton
                    title="Wspólne"
                    onPress={() => { setArchivedTaskType('shared'); setSelectedPartnerId('all'); }}
                    style={[styles.taskTypeButton, archivedTaskType === 'shared' ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.inputBackground }]}
                    textStyle={[styles.taskTypeButtonText, archivedTaskType === 'shared' ? { color: '#fff' } : { color: theme.colors.textSecondary }]}
                />
                <ActionButton
                    title="Wszystkie"
                    onPress={() => { setArchivedTaskType('all'); setSelectedPartnerId('all'); }}
                    style={[styles.taskTypeButton, archivedTaskType === 'all' ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.inputBackground }]}
                    textStyle={[styles.taskTypeButtonText, archivedTaskType === 'all' ? { color: '#fff' } : { color: theme.colors.textSecondary }]}
                />
            </Animated.View>

            {/* Filtr po osobach, tylko jeśli wybrano "Wspólne" i użytkownik jest w parze */}
            {archivedTaskType === 'shared' && userProfile?.pairId && partnerNicknames.length > 0 && (
                <Animated.View layout={Layout.springify()} style={[GlobalStyles.card, styles.partnerFilterContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <Text style={[styles.partnerFilterLabel, { color: theme.colors.textSecondary }]}>Filtruj wg partnera:</Text>
                    <View style={[styles.pickerWrapper, { borderColor: theme.colors.border }]}>
                        <Picker
                            selectedValue={selectedPartnerId}
                            onValueChange={(itemValue: string | 'all') => setSelectedPartnerId(itemValue)}
                            style={styles.picker}
                            dropdownIconColor={theme.colors.textPrimary}
                        >
                            <Picker.Item label="Wszyscy w parze" value="all" />
                            {/* Opcja dla "Mnie" */}
                            <Picker.Item label={userProfile?.nickname || "Ja"} value={currentUser?.uid || ''} />
                            {/* Opcje dla partnerów (inni niż ja) */}
                            {partnerNicknames
                                .filter(p => p.id !== currentUser?.uid)
                                .map(p => (
                                    <Picker.Item key={p.id} label={p.nickname} value={p.id} />
                                ))}
                        </Picker>
                    </View>
                    <View style={{ height: 1, backgroundColor: theme.colors.border }} />
                </Animated.View>
            )}

            <SearchBar
                placeholder="Szukaj po nazwie lub opisie..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                debounceMs={200}
                inputStyle={{}}
            />

            <FilterPresets
                storageKey="dailyflow_archive_filter_presets"
                userId={currentUser?.uid}
                title="Presety filtrów (Archiwum)"
                getCurrentFilters={() => ({
                    archivedTaskType,
                    selectedPartnerId,
                    activeCategoryArchive,
                    searchQuery,
                    filterCompletedFromDate: filterCompletedFromDate ? filterCompletedFromDate.toISOString() : null,
                    filterCompletedToDate: filterCompletedToDate ? filterCompletedToDate.toISOString() : null,
                })}
                applyFilters={(data: any) => {
                    setArchivedTaskType(data.archivedTaskType ?? 'all');
                    setSelectedPartnerId(data.selectedPartnerId ?? 'all');
                    setActiveCategoryArchive(data.activeCategoryArchive ?? 'all');
                    setSearchQuery(data.searchQuery ?? '');
                    setFilterCompletedFromDate(data.filterCompletedFromDate ? new Date(data.filterCompletedFromDate) : null);
                    setFilterCompletedToDate(data.filterCompletedToDate ? new Date(data.filterCompletedToDate) : null);
                }}
            />

            {/* Filtry daty (ukończenia) - WYBÓR ZAKRESU Z NOWEGO KOMPONENTU */}
            <DateRangeFilter
                label="Filtruj datę ukończenia:"
                fromDate={filterCompletedFromDate}
                toDate={filterCompletedToDate}
                onFromDateChange={setFilterCompletedFromDate}
                onToDateChange={setFilterCompletedToDate}
                predefinedRanges={true}
            />

            {/* Filtr kategorii */}
            <CategoryFilter activeCategory={activeCategoryArchive} onSelectCategory={setActiveCategoryArchive} />

            <Animated.FlatList
                style={styles.list}
                data={processedAndSortedArchivedTasks}
                renderItem={({ item }) => (
                    <ArchivedTaskItem
                        item={item}
                        categories={categories}
                        userProfile={userProfile}
                        theme={theme}
                        isCompact={isCompact}
                        onRestore={handleRestoreTask}
                        onDelete={handlePermanentDelete}
                    />
                )}
                keyExtractor={item => item.id}
                initialNumToRender={12}
                windowSize={10}
                removeClippedSubviews
                maxToRenderPerBatch={12}
                contentContainerStyle={{ paddingBottom: Spacing.xLarge * 2 }}
                ListEmptyComponent={
                    <EmptyState
                        icon={searchQuery || filterCompletedFromDate || filterCompletedToDate || activeCategoryArchive !== 'all' || archivedTaskType !== 'all' || selectedPartnerId !== 'all' ? "search" : "archive"}
                        title={searchQuery || filterCompletedFromDate || filterCompletedToDate || activeCategoryArchive !== 'all' || archivedTaskType !== 'all' || selectedPartnerId !== 'all' ? "Brak wyników" : "Archiwum jest puste"}
                        subtitle={searchQuery ? `Nie znaleziono zarchiwizowanych zadań dla frazy "${searchQuery}"` : "Ukończone zadania, które zarchiwizujesz, pojawią się tutaj."}
                        actions={[{ title: 'Przejdź do zadań', onPress: () => { try { (require('@react-navigation/native') as any).useNavigation?.().navigate('TasksTab' as any); } catch { } } }]}
                        illustration={require('../../assets/icon.png')}
                    />
                }
            />
            <ActionModal
                visible={!!confirmDeleteTaskId}
                title={'Trwałe usunięcie'}
                message={'Czy na pewno chcesz trwale usunąć to zadanie? Tej operacji nie można cofnąć.'}
                onRequestClose={() => setConfirmDeleteTaskId(null)}
                actions={[
                    { text: 'Anuluj', variant: 'secondary', onPress: () => setConfirmDeleteTaskId(null) },
                    { text: 'Usuń', onPress: async () => { if (!confirmDeleteTaskId) return; try { await deleteDoc(doc(db, 'tasks', confirmDeleteTaskId)); } catch { await enqueueDelete(`tasks/${confirmDeleteTaskId}`); } setConfirmDeleteTaskId(null); showToast('Zadanie usunięte.', 'success'); } },
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    exportBar: {
        backgroundColor: 'transparent',
        paddingHorizontal: Spacing.medium,
        paddingTop: Spacing.small,
        paddingBottom: Spacing.small,
        borderBottomWidth: 1,
        borderColor: Colors.border,
    },
    exportButton: {
        alignSelf: 'flex-start',
    },
    list: {
        flex: 1,
    },
    taskContainer: {
        backgroundColor: 'transparent',
        padding: Spacing.medium,
        borderBottomWidth: 1,
        borderColor: Colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    taskContent: {
        flex: 1,
    },
    taskTitle: {
        fontSize: Typography.body.fontSize + 1, // 16
        fontWeight: Typography.semiBold.fontWeight, // '600'
    },
    taskDescription: {
        fontSize: Typography.small.fontSize + 2, // 14
        marginTop: Spacing.xSmall, // 4
        fontStyle: 'italic',
    },
    taskMetaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.xSmall + 2, // 6
        flexWrap: 'wrap',
    },
    creatorText: {
        fontSize: Typography.small.fontSize, // 12
        fontStyle: 'italic',
        marginRight: Spacing.small, // 8
    },
    sharedInfoText: {
        fontSize: Typography.small.fontSize, // 12
        fontStyle: 'italic',
        marginTop: Spacing.xSmall, // 4
        marginLeft: Spacing.small, // 8
    },
    categoryTag: {
        paddingHorizontal: Spacing.small, // 8
        paddingVertical: 3,
        borderRadius: 10,
        marginRight: Spacing.small, // 8
        marginTop: Spacing.xSmall + 2, // 6
        alignSelf: 'flex-start',
    },
    categoryTagText: {
        color: 'white',
        fontSize: Typography.small.fontSize, // 10
        fontWeight: Typography.bold.fontWeight, // 'bold'
    },
    completedText: {
        fontSize: Typography.small.fontSize, // 12
        fontStyle: 'italic',
        marginTop: Spacing.xSmall + 2, // 6
    },
    actionsContainer: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: Spacing.xSmall, // 5
    },
    // SearchBar styles zostały przeniesione do SearchBar.tsx
    taskTypeSwitchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: Spacing.small,
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderColor: Colors.border,
    },
    taskTypeButton: {
        flex: 1,
        marginHorizontal: Spacing.xSmall, // 5
    },
    taskTypeButtonText: {
        fontWeight: Typography.bold.fontWeight,
        fontSize: Typography.body.fontSize,
    },
    partnerFilterContainer: {
        backgroundColor: 'transparent',
        paddingHorizontal: Spacing.medium,
        paddingTop: Spacing.small,
        paddingBottom: Spacing.xSmall, // 5
        borderBottomWidth: 1,
        borderColor: Colors.border,
    },
    partnerFilterLabel: {
        fontSize: Typography.body.fontSize,
        fontWeight: Typography.semiBold.fontWeight,
        marginBottom: Spacing.xSmall, // 5
    },
    pickerWrapper: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: Spacing.small, // 10
    },
    picker: {
        height: 50,
        width: '100%',
    },
});

export default ArchiveScreen;
