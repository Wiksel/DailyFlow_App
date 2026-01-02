import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ScrollView, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import { isOnboardingDone, setOnboardingDone } from '../utils/authUtils';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from '../utils/authCompat';
import { doc, getDoc, onSnapshot, collection, query, where, Timestamp, db, addDoc } from '../utils/firestoreCompat';
import { Feather } from '@expo/vector-icons';
import { TaskStackNavigationProp } from '../types/navigation';
import { Task, UserProfile, ChoreTemplate } from '../types';
import { useCategories } from '../contexts/CategoryContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../contexts/ToastContext';
import { Spacing, GlobalStyles, Typography, Colors } from '../styles/AppStyles';
import { useUI } from '../contexts/UIContext';
import { useTheme, Theme } from '../contexts/ThemeContext';

// Components
import SectionedTaskList, { TaskSectionListHandle } from '../components/SectionedTaskList';
import AddTaskModal from './AddTaskModal';
import CalendarRangeModal from '../components/CalendarRangeModal';
import EmptyState from '../components/EmptyState';
import ActionModal from '../components/ActionModal';
import TaskListSkeleton from '../components/TaskListSkeleton';

// New Components
import { HomeBackground } from '../components/HomeBackground';
import HomeHeader from '../components/HomeHeader';
import FilterBar from '../components/FilterBar';
import ModernFab from '../components/ModernFab';

// Hooks
import { useTasks } from '../hooks/useTasks';
import { useTaskActions } from '../hooks/useTaskActions';
import { useTaskFilters } from '../hooks/useTaskFilters';

const RECENT_CATEGORIES_KEY = 'dailyflow_recent_categories';
const RECENT_DIFFICULTIES_KEY = 'dailyflow_recent_difficulties';
const PINNED_KEY_PREFIX = 'dailyflow_pinned_';
const HOME_FILTERS_KEY = 'dailyflow_home_filters';

const HomeScreen = () => {
    const navigation = useNavigation<TaskStackNavigationProp>();
    const theme = useTheme();
    const { focusModeEnabled } = useUI();
    const { categories } = useCategories();
    const { showToast } = useToast();
    const currentUser = getAuth().currentUser;

    const styles = useMemo(() => createStyles(theme), [theme]);

    // Component State
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [addTaskModalVisible, setAddTaskModalVisible] = useState(false);
    const [templatesModalVisible, setTemplatesModalVisible] = useState(false);
    const [templates, setTemplates] = useState<ChoreTemplate[]>([]);
    const [pendingDeadline, setPendingDeadline] = useState<any>(null);

    const [activeQuickFilter, setActiveQuickFilter] = useState<'all' | 'today' | 'upcoming' | 'overdue'>('all');
    const [globalSearchVisible, setGlobalSearchVisible] = useState(false);
    const [globalSearchQuery, setGlobalSearchQuery] = useState('');
    const [calendarModal, setCalendarModal] = useState<{ visible: boolean; type: 'created' | 'deadline' | 'completed' | null }>({ visible: false, type: null });

    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
    const [confirmModalTask, setConfirmModalTask] = useState<Task | null>(null);
    const [menuTask, setMenuTask] = useState<Task | null>(null);
    const [categoryPickerTask, setCategoryPickerTask] = useState<Task | null>(null);
    const [difficultyPickerTask, setDifficultyPickerTask] = useState<Task | null>(null);
    const [categoryPickerBulk, setCategoryPickerBulk] = useState(false);
    const [difficultyPickerBulk, setDifficultyPickerBulk] = useState(false);
    const [bulkSnoozeVisible, setBulkSnoozeVisible] = useState(false);
    const [categorySearch, setCategorySearch] = useState('');
    const [recentCategoryIds, setRecentCategoryIds] = useState<string[]>([]);
    const [recentDifficulties, setRecentDifficulties] = useState<number[]>([]);

    // Undo State
    const [undoTask, setUndoTask] = useState<Task | null>(null);
    const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const taskListRef = useRef<TaskSectionListHandle | null>(null);

    // --- Data Subscriptions (User, Templates) ---
    useEffect(() => {
        if (!currentUser) return;
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribe = onSnapshot(userDocRef, async (docSnapshot) => {
            if (!docSnapshot.exists()) { setUserProfile(null); return; }
            const profileData = docSnapshot.data() as UserProfile;
            if (profileData.pairId) {
                const pairDoc = await getDoc(doc(db, 'pairs', profileData.pairId));
                if (pairDoc.exists()) {
                    const pairData = pairDoc.data() as any;
                    const members: string[] = Array.isArray(pairData?.members) ? pairData.members : [];
                    const partnerId = members.find((id: string) => id !== currentUser.uid);
                    if (partnerId) {
                        const partnerDoc = await getDoc(doc(db, 'users', partnerId));
                        profileData.partnerNickname = partnerDoc.data()?.nickname || "Nieznany Partner";
                    }
                }
            }
            setUserProfile(profileData);
        });
        return unsubscribe;
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser) return;
        const q = query(collection(db, 'choreTemplates'), where("userId", "==", currentUser.uid));
        const unsubscribe = onSnapshot(q, (snapshot: any) => {
            setTemplates(snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as ChoreTemplate)));
        });
        return () => unsubscribe();
    }, [currentUser]);

    // --- Hooks ---
    const [hasLoadedFilters, setHasLoadedFilters] = useState(false);
    const [initialFilters, setInitialFilters] = useState<any>({});

    useEffect(() => {
        if (!currentUser) { setHasLoadedFilters(true); return; }
        AsyncStorage.getItem(`${HOME_FILTERS_KEY}_${currentUser.uid}`).then(raw => {
            if (raw) {
                try {
                    const data = JSON.parse(raw);
                    if (data.filterFromDate) data.filterFromDate = new Date(data.filterFromDate);
                    if (data.filterToDate) data.filterToDate = new Date(data.filterToDate);
                    if (data.deadlineFromDate) data.deadlineFromDate = new Date(data.deadlineFromDate);
                    if (data.deadlineToDate) data.deadlineToDate = new Date(data.deadlineToDate);
                    if (data.completedFromDate) data.completedFromDate = new Date(data.completedFromDate);
                    if (data.completedToDate) data.completedToDate = new Date(data.completedToDate);
                    setInitialFilters(data);
                } catch { }
            }
            setHasLoadedFilters(true);
        });
    }, [currentUser]);

    const effectiveTaskType = hasLoadedFilters ? (initialFilters.taskType || 'personal') : 'personal';
    const { tasks, loading: tasksLoading } = useTasks(effectiveTaskType, userProfile);

    const {
        filters, setFilters, processedAndSortedTasks,
        setTaskType, setActiveCategories, setDifficultyFilter, setCreatorFilter, setSearchQuery,
        setFilterFromDate, setFilterToDate, setDeadlineFromDate, setDeadlineToDate, setCompletedFromDate, setCompletedToDate
    } = useTaskFilters(tasks, userProfile, focusModeEnabled);

    const loadedRef = useRef(false);
    useEffect(() => {
        if (hasLoadedFilters && !loadedRef.current && Object.keys(initialFilters).length > 0) {
            setFilters(initialFilters);
            loadedRef.current = true;
        }
    }, [hasLoadedFilters, initialFilters, setFilters]);

    useEffect(() => {
        if (!currentUser) return;
        const save = setTimeout(() => {
            AsyncStorage.setItem(`${HOME_FILTERS_KEY}_${currentUser.uid}`, JSON.stringify(filters));
        }, 500);
        return () => clearTimeout(save);
    }, [filters, currentUser]);

    const actions = useTaskActions();

    const filteredTemplates = templates.filter(t => filters.activeCategories.length === 0 || filters.activeCategories.includes(t.category));

    // --- Handlers ---
    const handleAddTask = async (taskData: any) => {
        await actions.addTask(taskData, userProfile, filters.taskType);
    };

    const handleAddTaskFromTemplate = async (template: ChoreTemplate) => {
        const payload = {
            text: template.name,
            description: '',
            category: template.category,
            basePriority: 3,
            difficulty: template.difficulty,
            deadline: null,
        };
        const newId = await actions.addTask(payload, userProfile, filters.taskType);
        if (newId) {
            setTemplatesModalVisible(false);
            showToast("Zadanie z szablonu dodane!", 'success');
            navigation.navigate('TaskDetail', { taskId: newId });
        }
    };

    const toggleComplete = (task: Task) => actions.toggleCompleteTask(task, userProfile);
    const handleTaskAction = (task: Task) => setConfirmModalTask(task);

    const toggleSelect = useCallback((task: Task) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(task.id)) next.delete(task.id); else next.add(task.id);
            return next;
        });
        setSelectionMode(true);
    }, []);

    const clearSelection = useCallback(() => { setSelectedIds(new Set()); setSelectionMode(false); }, []);

    useEffect(() => {
        if (!currentUser) return;
        AsyncStorage.getItem(`${PINNED_KEY_PREFIX}${currentUser.uid}`).then(raw => {
            if (raw) setPinnedIds(new Set(JSON.parse(raw)));
        });
    }, [currentUser]);

    const togglePinned = useCallback((task: Task) => {
        setPinnedIds(prev => {
            const next = new Set(prev);
            if (next.has(task.id)) next.delete(task.id); else next.add(task.id);
            AsyncStorage.setItem(`${PINNED_KEY_PREFIX}${currentUser?.uid}`, JSON.stringify(Array.from(next))).catch(() => { });
            return next;
        });
    }, [currentUser]);

    const loadRecentCategories = useCallback(async () => {
        try {
            const raw = await AsyncStorage.getItem(RECENT_CATEGORIES_KEY);
            const arr = raw ? JSON.parse(raw) : [];
            if (Array.isArray(arr)) setRecentCategoryIds(arr.slice(0, 10));
        } catch { }
    }, []);
    const saveRecentCategory = useCallback(async (categoryId: string) => {
        try {
            const raw = await AsyncStorage.getItem(RECENT_CATEGORIES_KEY);
            const arr: string[] = raw ? JSON.parse(raw) : [];
            const next = [categoryId, ...arr.filter(id => id !== categoryId)].slice(0, 10);
            await AsyncStorage.setItem(RECENT_CATEGORIES_KEY, JSON.stringify(next));
            setRecentCategoryIds(next);
        } catch { }
    }, []);
    const loadRecentDifficulties = useCallback(async () => {
        try {
            const raw = await AsyncStorage.getItem(RECENT_DIFFICULTIES_KEY);
            const arr = raw ? JSON.parse(raw) : [];
            if (Array.isArray(arr)) setRecentDifficulties(arr.filter((n: any) => Number.isFinite(n)).slice(0, 5));
        } catch { }
    }, []);
    const saveRecentDifficulty = useCallback(async (lvl: number) => {
        try {
            const raw = await AsyncStorage.getItem(RECENT_DIFFICULTIES_KEY);
            const arr: number[] = raw ? JSON.parse(raw) : [];
            const next = [lvl, ...arr.filter(n => n !== lvl)].slice(0, 5);
            await AsyncStorage.setItem(RECENT_DIFFICULTIES_KEY, JSON.stringify(next));
            setRecentDifficulties(next);
        } catch { }
    }, []);

    useEffect(() => {
        if (categoryPickerTask || categoryPickerBulk) { loadRecentCategories(); setCategorySearch(''); }
    }, [categoryPickerTask, categoryPickerBulk, loadRecentCategories]);

    useEffect(() => {
        if (difficultyPickerTask || difficultyPickerBulk) { loadRecentDifficulties(); }
    }, [difficultyPickerTask, difficultyPickerBulk, loadRecentDifficulties]);

    const applyQuickFilter = useCallback((type: 'all' | 'today' | 'upcoming' | 'overdue') => {
        setActiveQuickFilter(type);
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        setFilterFromDate(null); setFilterToDate(null);
        setDeadlineFromDate(null); setDeadlineToDate(null);
        setCompletedFromDate(null); setCompletedToDate(null);

        switch (type) {
            case 'today':
                setDeadlineFromDate(new Date(now));
                setDeadlineToDate(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59));
                break;
            case 'upcoming':
                const nextWeek = new Date(now); nextWeek.setDate(now.getDate() + 7);
                setDeadlineFromDate(now);
                setDeadlineToDate(nextWeek);
                break;
            case 'overdue':
                const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1); yesterday.setHours(23, 59, 59);
                setDeadlineToDate(yesterday);
                break;
            case 'all':
            default:
                break;
        }
    }, [setDeadlineFromDate, setDeadlineToDate, setCompletedFromDate, setCompletedToDate, setFilterFromDate, setFilterToDate]);

    return (
        <HomeBackground>
            <HomeHeader
                title={filters.taskType === 'shared' ? 'Wspólne Zadania' : 'Twoje Zadania'}
                subtitle={undefined}
                avatarUrl={userProfile?.photoURL || null}
                onAvatarPress={() => navigation.navigate('Profile')}
                isSearchActive={globalSearchVisible}
                onToggleSearch={() => {
                    const next = !globalSearchVisible;
                    setGlobalSearchVisible(next);
                    if (next) {
                        try { Haptics.selectionAsync() } catch { }
                    } else {
                        setGlobalSearchQuery('');
                        setSearchQuery('');
                    }
                }}
                searchQuery={globalSearchQuery || filters.searchQuery}
                onSearchChange={(t) => {
                    setGlobalSearchQuery(t);
                    setSearchQuery(t);
                }}
                onArchivePress={() => navigation.navigate('Archive')}
            />

            <FilterBar
                taskType={filters.taskType}
                onTaskTypeChange={setTaskType}
                activeCategoryIds={filters.activeCategories}
                categories={categories}
                onToggleCategory={(id: string) => setActiveCategories(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                activeTimeFilter={activeQuickFilter}
                onTimeFilterChange={applyQuickFilter}
                onClearAll={() => {
                    setActiveCategories([]);
                    setActiveQuickFilter('all');
                    setGlobalSearchQuery('');
                    setSearchQuery('');
                    setFilterFromDate(null); setFilterToDate(null);
                    setDeadlineFromDate(null); setDeadlineToDate(null);
                    setCompletedFromDate(null); setCompletedToDate(null);
                }}
            />

            {tasksLoading ? <TaskListSkeleton rows={8} /> : (
                processedAndSortedTasks.length === 0 ? (
                    <View style={GlobalStyles.centered}>
                        <HomeEmptyState onAddTask={() => setAddTaskModalVisible(true)} onOpenTemplates={() => navigation.navigate('ChoreTemplates' as any)} />
                    </View>
                ) : (
                    <SectionedTaskList
                        tasks={processedAndSortedTasks}
                        categories={categories}
                        onPressTask={(t: Task) => navigation.navigate('TaskDetail', { taskId: t.id })}
                        onToggleComplete={(t: Task) => toggleComplete(t)}
                        onConfirmAction={(t: Task) => handleTaskAction(t)}
                        selectionMode={selectionMode}
                        selectedIds={selectedIds}
                        onToggleSelect={toggleSelect}
                        onOpenTaskMenu={(t: Task) => setMenuTask(t)}
                        onSelectAllSection={(key: string, items: Task[]) => {
                            const ids = new Set(selectedIds);
                            const list = items as Task[];
                            const allSelected = list.every(it => ids.has(it.id));
                            if (allSelected) { list.forEach(it => ids.delete(it.id)); } else { list.forEach(it => ids.add(it.id)); }
                            setSelectedIds(ids);
                            setSelectionMode(true);
                        }}
                        onQuickAdd={(key: string) => {
                            let initial: Date | null = null;
                            const now = new Date();
                            if (key === 'today') { initial = new Date(now); initial.setHours(23, 59, 0, 0); }
                            else if (key === 'tomorrow') { initial = new Date(now); initial.setDate(now.getDate() + 1); initial.setHours(12, 0, 0, 0); }
                            else if (key === 'week') { initial = new Date(now); initial.setDate(now.getDate() + 7); initial.setHours(12, 0, 0, 0); }
                            setAddTaskModalVisible(true);
                            setPendingDeadline(initial ? Timestamp.fromDate(initial) : null);
                        }}
                        pinnedIds={pinnedIds}
                        onTogglePinned={togglePinned}
                        ref={taskListRef}
                        highlightQuery={globalSearchQuery}
                    />
                )
            )}

            <View style={styles.fabContainer}>
                <ModernFab
                    onAddPress={() => {
                        if (filters.taskType === 'shared' && !userProfile?.pairId) { showToast('Musisz być w parze...', 'info'); return; }
                        setAddTaskModalVisible(true);
                    }}
                    onTemplatePress={() => {
                        if (filters.taskType === 'shared' && !userProfile?.pairId) { showToast('Musisz być w parze...', 'info'); return; }
                        setTemplatesModalVisible(true);
                    }}
                />
            </View>

            <AddTaskModal
                visible={addTaskModalVisible}
                onClose={() => setAddTaskModalVisible(false)}
                onAddTask={handleAddTask}
                initialCategory={filters.activeCategories[0] || (categories.find(c => c.name === 'Inne')?.id || 'default')}
                initialDeadline={pendingDeadline}
            />

            <ActionModal
                visible={templatesModalVisible}
                title="Wybierz z szablonu"
                onRequestClose={() => setTemplatesModalVisible(false)}
                actions={[{ text: 'Zamknij', onPress: () => setTemplatesModalVisible(false), variant: 'secondary' }]}
            >
                <FlatList
                    data={filteredTemplates}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.templateItem} onPress={() => handleAddTaskFromTemplate(item)}>
                            <Text style={styles.templateName}>{item.name}</Text>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={<Text style={styles.emptyListText}>Brak szablonów dla tej kategorii.</Text>}
                    style={{ maxHeight: 280, width: '100%' }}
                />
            </ActionModal>

            <ActionModal
                visible={!!confirmModalTask}
                title={`Potwierdź ${confirmModalTask?.completed ? 'archiwizację' : 'usunięcie'}`}
                message={`Czy na pewno chcesz ${confirmModalTask?.completed ? 'zarchiwizować' : 'usunąć'} to zadanie?`}
                placement="bottom"
                onRequestClose={() => setConfirmModalTask(null)}
                actions={[
                    { text: 'Anuluj', onPress: () => setConfirmModalTask(null), variant: 'secondary' },
                    {
                        text: confirmModalTask?.completed ? 'Zarchiwizuj' : 'Usuń', onPress: async () => {
                            if (!confirmModalTask) return;
                            if (confirmModalTask.completed) await actions.archiveTask(confirmModalTask.id);
                            else {
                                // Undo Logic
                                const taskToRestore = { ...confirmModalTask };
                                await actions.deleteTask(confirmModalTask.id);

                                setUndoTask(taskToRestore);
                                if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
                                undoTimeoutRef.current = setTimeout(() => {
                                    setUndoTask(null);
                                }, 5000);
                            }
                            setConfirmModalTask(null);
                        }
                    },
                ]}
            />

            {menuTask && (
                <ActionModal
                    visible={!!menuTask}
                    title={menuTask.text}
                    onRequestClose={() => setMenuTask(null)}
                    actions={[
                        { text: 'Edytuj', onPress: () => { setMenuTask(null); navigation.navigate('TaskDetail', { taskId: menuTask.id }); } },
                        { text: 'Przenieś do kategorii…', onPress: async () => { setMenuTask(null); setCategoryPickerTask(menuTask); } },
                        { text: 'Zmień trudność…', onPress: async () => { setMenuTask(null); setDifficultyPickerTask(menuTask); } },
                        {
                            text: 'Uśpij na dziś', onPress: async () => {
                                const d = new Date(); d.setHours(23, 59, 0, 0);
                                await actions.updateTask(menuTask.id, { deadline: Timestamp.fromDate(d) });
                                setMenuTask(null);
                                showToast('Przeniesiono na dzisiaj.', 'success');
                            }
                        },
                        {
                            text: 'Uśpij do jutra', onPress: async () => {
                                const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(12, 0, 0, 0);
                                await actions.updateTask(menuTask.id, { deadline: Timestamp.fromDate(d) });
                                setMenuTask(null);
                                showToast('Przeniesiono na jutro.', 'success');
                            }
                        },
                        {
                            text: 'Uśpij na tydzień', onPress: async () => {
                                const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(12, 0, 0, 0);
                                await actions.updateTask(menuTask.id, { deadline: Timestamp.fromDate(d) });
                                setMenuTask(null);
                                showToast('Przeniesiono o tydzień.', 'success');
                            }
                        },
                        {
                            text: 'Wyczyść termin', onPress: async () => {
                                await actions.updateTask(menuTask.id, { deadline: null });
                                setMenuTask(null);
                                showToast('Usunięto termin.', 'success');
                            }
                        },
                        { text: 'Zamknij', variant: 'secondary', onPress: () => setMenuTask(null) },
                    ]}
                />
            )}

            {categoryPickerTask && (
                <ActionModal
                    visible={!!categoryPickerTask}
                    title={'Wybierz kategorię'}
                    onRequestClose={() => setCategoryPickerTask(null)}
                    actions={[{ text: 'Anuluj', variant: 'secondary', onPress: () => setCategoryPickerTask(null) }]}
                >
                    <View style={{ paddingHorizontal: Spacing.medium }}>
                        <TextInput
                            placeholder="Szukaj kategorii..."
                            placeholderTextColor={theme.colors.placeholder}
                            value={categorySearch}
                            onChangeText={setCategorySearch}
                            style={[GlobalStyles.input, { marginBottom: Spacing.small, backgroundColor: theme.colors.inputBackground, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                        />
                        {recentCategoryIds.length > 0 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 6 }}>
                                {recentCategoryIds.map(id => {
                                    const cat = categories.find(c => c.id === id);
                                    if (!cat) return null;
                                    return (
                                        <TouchableOpacity key={id} onPress={async () => {
                                            await actions.updateTask(categoryPickerTask!.id, { category: id });
                                            await saveRecentCategory(id);
                                            setCategoryPickerTask(null);
                                        }} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border, marginRight: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cat.color }} />
                                            <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>{cat.name}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        )}
                        <FlatList
                            data={categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name))}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={[styles.templateItem, { flexDirection: 'row', alignItems: 'center', gap: 10 }]} onPress={async () => {
                                    await actions.updateTask(categoryPickerTask!.id, { category: item.id });
                                    await saveRecentCategory(item.id);
                                    setCategoryPickerTask(null);
                                }}>
                                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
                                    <Text style={styles.templateName}>{item.name}</Text>
                                </TouchableOpacity>
                            )}
                            style={{ maxHeight: 320, width: '100%' }}
                        />
                    </View>
                </ActionModal>
            )}

            {difficultyPickerTask && (
                <ActionModal
                    visible={!!difficultyPickerTask}
                    title={'Poziom trudności'}
                    onRequestClose={() => setDifficultyPickerTask(null)}
                >
                    <View style={{ paddingHorizontal: Spacing.medium }}>
                        {recentDifficulties.length > 0 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.small }}>
                                {recentDifficulties.map(lvl => (
                                    <TouchableOpacity key={`rd-${lvl}`} onPress={async () => {
                                        await actions.updateTask(difficultyPickerTask!.id, { difficulty: lvl });
                                        await saveRecentDifficulty(lvl);
                                        setDifficultyPickerTask(null);
                                    }} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border, marginRight: 8 }}>
                                        <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>Poziom {lvl}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((lvl) => (
                            <TouchableOpacity key={`dl-${lvl}`} style={styles.templateItem} onPress={async () => {
                                await actions.updateTask(difficultyPickerTask!.id, { difficulty: lvl });
                                await saveRecentDifficulty(lvl);
                                setDifficultyPickerTask(null);
                            }}>
                                <Text style={styles.templateName}>Poziom {lvl}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ActionModal>
            )}

            {categoryPickerBulk && (
                <ActionModal
                    visible={categoryPickerBulk}
                    title={'Kategoria dla wybranych'}
                    onRequestClose={() => setCategoryPickerBulk(false)}
                    actions={[{ text: 'Anuluj', variant: 'secondary', onPress: () => setCategoryPickerBulk(false) }]}
                >
                    <View style={{ paddingHorizontal: Spacing.medium }}>
                        <TextInput
                            placeholder="Szukaj kategorii..."
                            placeholderTextColor={theme.colors.placeholder}
                            value={categorySearch}
                            onChangeText={setCategorySearch}
                            style={[GlobalStyles.input, { marginBottom: Spacing.small, backgroundColor: theme.colors.inputBackground, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                        />
                        <FlatList
                            data={categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name))}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={[styles.templateItem, { flexDirection: 'row', alignItems: 'center', gap: 10 }]} onPress={async () => {
                                    const ids = Array.from(selectedIds);
                                    for (const tid of ids) await actions.updateTask(tid, { category: item.id });
                                    await saveRecentCategory(item.id);
                                    clearSelection();
                                    setCategoryPickerBulk(false);
                                }}>
                                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
                                    <Text style={styles.templateName}>{item.name}</Text>
                                </TouchableOpacity>
                            )}
                            style={{ maxHeight: 320, width: '100%' }}
                        />
                    </View>
                </ActionModal>
            )}

            {difficultyPickerBulk && (
                <ActionModal
                    visible={difficultyPickerBulk}
                    title={'Trudność dla wybranych'}
                    onRequestClose={() => setDifficultyPickerBulk(false)}
                >
                    <View style={{ paddingHorizontal: Spacing.medium }}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((lvl) => (
                            <TouchableOpacity key={`dlb-${lvl}`} style={styles.templateItem} onPress={async () => {
                                const ids = Array.from(selectedIds);
                                for (const id of ids) await actions.updateTask(id, { difficulty: lvl });
                                await saveRecentDifficulty(lvl);
                                clearSelection();
                                setDifficultyPickerBulk(false);
                            }}>
                                <Text style={styles.templateName}>Poziom {lvl}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ActionModal>
            )}

            {bulkSnoozeVisible && (
                <ActionModal
                    visible={bulkSnoozeVisible}
                    title={'Uśpij wybrane'}
                    onRequestClose={() => setBulkSnoozeVisible(false)}
                    actions={[
                        {
                            text: 'Dziś', onPress: async () => {
                                const ids = Array.from(selectedIds); const d = new Date(); d.setHours(23, 59, 0, 0);
                                for (const id of ids) await actions.updateTask(id, { deadline: Timestamp.fromDate(d) });
                                clearSelection(); setBulkSnoozeVisible(false); showToast('Uśpiono na dziś.', 'success');
                            }
                        },
                        {
                            text: 'Jutro', onPress: async () => {
                                const ids = Array.from(selectedIds); const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(12, 0, 0, 0);
                                for (const id of ids) await actions.updateTask(id, { deadline: Timestamp.fromDate(d) });
                                clearSelection(); setBulkSnoozeVisible(false); showToast('Uśpiono do jutra.', 'success');
                            }
                        },
                        {
                            text: 'Za tydzień', onPress: async () => {
                                const ids = Array.from(selectedIds); const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(12, 0, 0, 0);
                                for (const id of ids) await actions.updateTask(id, { deadline: Timestamp.fromDate(d) });
                                clearSelection(); setBulkSnoozeVisible(false); showToast('Uśpiono o tydzień.', 'success');
                            }
                        },
                        { text: 'Anuluj', variant: 'secondary', onPress: () => setBulkSnoozeVisible(false) },
                    ]}
                />
            )}

            {selectionMode && (
                <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 16, paddingBottom: 32, paddingHorizontal: 16, backgroundColor: theme.colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, elevation: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 100 }}>
                    <Text style={{ color: theme.colors.textPrimary, fontWeight: '700', fontSize: 16 }}>{selectedIds.size} wybranych</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity style={{ padding: 8, marginHorizontal: 4 }} onPress={() => setCategoryPickerBulk(true)}>
                            <Feather name="tag" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={{ padding: 8, marginHorizontal: 4 }} onPress={() => setDifficultyPickerBulk(true)}>
                            <Feather name="bar-chart-2" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={{ padding: 8, marginHorizontal: 4 }} onPress={() => setBulkSnoozeVisible(true)}>
                            <Feather name="clock" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={{ padding: 8, marginHorizontal: 4 }} onPress={async () => {
                            const ids = Array.from(selectedIds);
                            for (const id of ids) await actions.archiveTask(id);
                            clearSelection();
                        }}>
                            <Feather name="archive" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={{ padding: 8, marginHorizontal: 4 }} onPress={async () => {
                            const ids = Array.from(selectedIds);
                            for (const id of ids) await actions.deleteTask(id);
                            clearSelection();
                        }}>
                            <Feather name="trash-2" size={24} color={theme.colors.danger} />
                        </TouchableOpacity>
                        <TouchableOpacity style={{ padding: 8, marginHorizontal: 4 }} onPress={clearSelection}>
                            <Feather name="x" size={28} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Undo Snackbar */}
            {undoTask && (
                <View style={{ position: 'absolute', left: 16, right: 16, bottom: 24, backgroundColor: '#333', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 6, zIndex: 200, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25 }}>
                    <Text style={{ color: 'white', fontWeight: '500' }}>Usunięto zadanie</Text>
                    <TouchableOpacity onPress={async () => {
                        const { id, ...restorePayload } = undoTask;
                        await actions.addTask(restorePayload, userProfile, filters.taskType);
                        if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
                        setUndoTask(null);
                        showToast('Zadanie przywrócone', 'success');
                    }}>
                        <Text style={{ color: '#8A4FFF', fontWeight: '700' }}>COFNIJ</Text>
                    </TouchableOpacity>
                </View>
            )}

            <CalendarRangeModal
                visible={calendarModal.visible}
                title={calendarModal.type === 'created' ? 'Data dodania' : calendarModal.type === 'deadline' ? 'Deadline' : 'Data wykonania'}
                initialFrom={calendarModal.type === 'created' ? filters.filterFromDate : calendarModal.type === 'deadline' ? filters.deadlineFromDate : filters.completedFromDate}
                initialTo={calendarModal.type === 'created' ? filters.filterToDate : calendarModal.type === 'deadline' ? filters.deadlineToDate : filters.completedToDate}
                onApply={(from, to) => {
                    if (calendarModal.type === 'created') { setFilterFromDate(from); setFilterToDate(to); }
                    if (calendarModal.type === 'deadline') { setDeadlineFromDate(from); setDeadlineToDate(to); }
                    if (calendarModal.type === 'completed') { setCompletedFromDate(from); setCompletedToDate(to); }
                }}
                onRequestClose={() => setCalendarModal({ visible: false, type: null })}
            />
        </HomeBackground>
    );
};

const createStyles = (theme: Theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    fabContainer: {
        position: 'absolute',
        right: 16,
        bottom: 16,
        width: 110,
        height: 110,
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        pointerEvents: 'box-none',
        zIndex: 50,
    },
    templateItem: { padding: Spacing.medium, borderBottomWidth: 1, borderColor: theme.colors.border },
    templateName: { fontSize: Typography.body.fontSize, color: theme.colors.textPrimary },
    emptyListText: { textAlign: 'center', marginTop: Spacing.xLarge, fontSize: Typography.body.fontSize, color: theme.colors.textSecondary },
});

export default HomeScreen;

const HomeEmptyState = ({ onAddTask, onOpenTemplates }: { onAddTask: () => void; onOpenTemplates: () => void }) => {
    const [done, setDone] = React.useState<boolean | null>(null);
    React.useEffect(() => { (async () => setDone(await isOnboardingDone()))(); }, []);
    if (done === null) return null;

    return (
        <EmptyState
            icon="inbox"
            title={done ? "Pusta skrzynka" : "Zacznijmy!"}
            subtitle={done ? "Brak zadań w tej kategorii. Czas dodać nowe!" : "Szybki start: dodaj pierwsze zadanie lub wybierz gotowy szablon."}
            actions={[
                { title: 'Dodaj zadanie', onPress: async () => { try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch { }; onAddTask(); setOnboardingDone(); } },
                { title: 'Otwórz szablony', onPress: async () => { onOpenTemplates(); setOnboardingDone(); }, variant: 'secondary' },
            ]}
            illustration={require('../../assets/icon.png')}
        />
    );
};
