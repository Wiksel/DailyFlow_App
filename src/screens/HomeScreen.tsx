import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ScrollView, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics'; // Fixed import
import { LinearGradient } from 'expo-linear-gradient';
import { isOnboardingDone, setOnboardingDone } from '../utils/authUtils'; // Fixed import
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from '../utils/authCompat';
import { doc, getDoc, onSnapshot, collection, query, where, orderBy, limit, getDocs, Timestamp, db, addDoc } from '../utils/firestoreCompat';
import { Feather } from '@expo/vector-icons';
import { TaskStackNavigationProp } from '../types/navigation';
import { Task, UserProfile, ChoreTemplate, Category } from '../types';
import { useCategories } from '../contexts/CategoryContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../contexts/ToastContext';
import { Colors, Spacing, GlobalStyles, Typography } from '../styles/AppStyles';
import { useUI } from '../contexts/UIContext';
import { useTheme } from '../contexts/ThemeContext';

// Components
import AddTaskModal from './AddTaskModal';
import TaskListItem from '../components/TaskListItem';
import TaskSectionList, { TaskSectionListHandle } from '../components/TaskSectionList';
import InlineFilters from '../components/InlineFilters';
import CalendarRangeModal from '../components/CalendarRangeModal';
import EmptyState from '../components/EmptyState';
import ActionModal from '../components/ActionModal';
import SearchBar from '../components/SearchBar';
import FilterPresets from '../components/FilterPresets';
import AppHeader from '../components/AppHeader';
import BottomQuickAdd from '../components/BottomQuickAdd';
import ActiveFiltersSummary from '../components/ActiveFiltersSummary';
import TaskListSkeleton from '../components/TaskListSkeleton';

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
    const { density, focusModeEnabled, setDensity } = useUI();
    const { categories } = useCategories();
    const { showToast } = useToast();
    const currentUser = getAuth().currentUser;

    // Component State
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [addTaskModalVisible, setAddTaskModalVisible] = useState(false);
    const [templatesModalVisible, setTemplatesModalVisible] = useState(false);
    const [templates, setTemplates] = useState<ChoreTemplate[]>([]);
    const [pendingDeadline, setPendingDeadline] = useState<any>(null);
    const [quickTaskText, setQuickTaskText] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [globalSearchVisible, setGlobalSearchVisible] = useState(false);
    const [globalSearchQuery, setGlobalSearchQuery] = useState('');
    const [presetsRefreshToken, setPresetsRefreshToken] = useState<number>(0);
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
        filters, setFilters, processedAndSortedTasks, todayTasks,
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

    // --- Computed ---
    const sharedCreators = useMemo(() => {
        const setNames = new Set<string>();
        tasks.filter(t => t.isShared).forEach(t => { if (t.creatorNickname) setNames.add(t.creatorNickname); });
        return Array.from(setNames);
    }, [tasks]);

    const filteredTemplates = templates.filter(t => filters.activeCategories.length === 0 || filters.activeCategories.includes(t.category));

    // --- Handlers ---
    const handleAddTask = async (taskData: any) => {
        await actions.addTask(taskData, userProfile, filters.taskType);
    };

    const handleQuickAdd = async () => {
        if (!quickTaskText.trim()) return;
        const defaultCategoryId = filters.activeCategories[0] || (categories.find(c => c.name === 'Inne')?.id || 'default');
        const payload = {
            text: quickTaskText.trim(),
            description: '',
            category: defaultCategoryId,
            basePriority: 3,
            difficulty: 2,
            deadline: null,
        };
        const newId = await actions.addTask(payload, userProfile, filters.taskType);
        if (newId || newId === null) setQuickTaskText('');
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

    const jumpToFirstMatch = useCallback((q: string) => {
        const match = processedAndSortedTasks.find(t => t.text.toLowerCase().includes(q.toLowerCase()));
        if (match) taskListRef.current?.scrollToTaskId(match.id);
    }, [processedAndSortedTasks]);

    return (
        <View style={[GlobalStyles.container, { backgroundColor: theme.colors.background }]}>
            <AppHeader
                title="Twoje zadania"
                rightActions={[
                    { icon: density === 'compact' ? 'maximize-2' : 'minimize-2', onPress: async () => { try { await Haptics.selectionAsync(); } catch { }; setDensity(density === 'compact' ? 'standard' : 'compact'); }, accessibilityLabel: density === 'compact' ? 'Tryb komfortowy' : 'Tryb kompaktowy' },
                    { icon: globalSearchVisible ? 'x' : 'search', onPress: async () => { try { await Haptics.selectionAsync(); } catch { }; setGlobalSearchVisible(v => !v); if (globalSearchVisible) setGlobalSearchQuery(''); }, accessibilityLabel: 'Szukaj' },
                    { icon: 'archive', onPress: () => navigation.navigate('Archive'), accessibilityLabel: 'Archiwum zadań' },
                    { icon: 'settings', onPress: () => navigation.navigate('Profile'), accessibilityLabel: 'Ustawienia' }, // Changed to settings icon for clarity
                ]}
                avatarUrl={userProfile?.photoURL || null}
                onAvatarPress={() => navigation.navigate('Profile')}
            />

            <View style={[styles.tabContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <TouchableOpacity style={[styles.tab, filters.taskType === 'personal' && { backgroundColor: theme.colors.primary }]} onPress={() => setTaskType('personal')} activeOpacity={0.8}>
                    <Text style={[styles.tabText, filters.taskType === 'personal' && { color: '#fff' }]}>Osobiste</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, filters.taskType === 'shared' && { backgroundColor: theme.colors.primary }]} onPress={() => setTaskType('shared')} activeOpacity={0.8}>
                    <Text style={[styles.tabText, filters.taskType === 'shared' && { color: '#fff' }]}>Wspólne</Text>
                </TouchableOpacity>
            </View>
            {filters.taskType === 'shared' && userProfile?.partnerNickname ? (
                <View style={[styles.partnerInfoBanner, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <Text style={[styles.partnerInfoText, { color: theme.colors.textSecondary }]}>Dzielone z: <Text style={{ fontWeight: '700', color: theme.colors.textPrimary }}>{userProfile.partnerNickname}</Text></Text>
                </View>
            ) : null}

            {todayTasks.length > 0 && (
                <LinearGradient
                    colors={theme.colorScheme === 'dark' ? ['#1e3c72', '#2a5298'] : ['#a1c4fd', '#c2e9fb']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[GlobalStyles.card, styles.todaySection, { borderWidth: 0, shadowOpacity: theme.colorScheme === 'dark' ? 0.25 : 0.18 }]}
                >
                    <Text style={[styles.todayTitle, { color: 'white' }]}>Dzisiaj · {todayTasks.length} {pluralizeTasks(todayTasks.length)}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 6 }}>
                        {todayTasks.map(t => (
                            <TodayTile key={t.id} text={t.text} onPress={async () => { try { await Haptics.selectionAsync(); } catch { }; navigation.navigate('TaskDetail', { taskId: t.id }); }} />
                        ))}
                    </ScrollView>
                </LinearGradient>
            )}

            <FilterPresets
                storageKey="dailyflow_home_filter_presets"
                userId={currentUser?.uid}
                hideTitle
                hideSaveButton
                refreshToken={presetsRefreshToken}
                getCurrentFilters={() => filters}
                applyFilters={(data: any) => setFilters(data)}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 0, backgroundColor: theme.colors.inputBackground }}>
                <TouchableOpacity onPress={() => setShowFilters(prev => !prev)} style={{ marginLeft: Spacing.small, marginRight: Spacing.small, padding: 6, borderRadius: 8, backgroundColor: 'transparent' }}>
                    <Feather name="sliders" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                {globalSearchVisible ? (
                    <SearchBar
                        placeholder="Globalne szukanie..."
                        value={globalSearchQuery}
                        onChangeText={setGlobalSearchQuery}
                        debounceMs={150}
                        showBottomBorder={false}
                        style={{ flex: 1, paddingBottom: 0, paddingTop: 0, marginLeft: 0, marginRight: Spacing.small, backgroundColor: 'transparent' }}
                        onSubmitEditing={() => jumpToFirstMatch(globalSearchQuery)}
                    />
                ) : (
                    <SearchBar
                        placeholder="Szukaj zadań..."
                        value={filters.searchQuery}
                        onChangeText={setSearchQuery}
                        debounceMs={200}
                        showBottomBorder={false}
                        style={{ flex: 1, paddingBottom: 0, paddingTop: 0, marginLeft: 0, marginRight: Spacing.small, backgroundColor: 'transparent' }}
                        onPressSaveIcon={async () => {
                            try {
                                const key = `dailyflow_home_filter_presets_${currentUser?.uid}`;
                                const raw = await AsyncStorage.getItem(key);
                                const arr = raw ? JSON.parse(raw) : [];
                                const name = (filters.searchQuery || '').trim();
                                if (!name) return;
                                const candidate = { ...filters, searchQuery: name };
                                const isDuplicate = Array.isArray(arr) && arr.some((p: any) => p?.name === name);
                                if (isDuplicate) { showToast('Taki preset już istnieje.', 'info'); return; }
                                const next = [{ id: Date.now(), name, data: candidate }, ...arr].slice(0, 20);
                                await AsyncStorage.setItem(key, JSON.stringify(next));
                                setPresetsRefreshToken(t => t + 1);
                            } catch { }
                        }}
                        saveIconName="save"
                    />
                )}
            </View>

            <ActiveFiltersSummary
                categories={categories}
                activeCategory={'all'}
                activeCategories={filters.activeCategories}
                onClearCategory={() => setActiveCategories([])}
                onRemoveCategory={(id) => setActiveCategories(prev => prev.filter(x => x !== id))}
                difficultyFilter={filters.difficultyFilter}
                onClearDifficulty={() => setDifficultyFilter([])}
                createdFrom={filters.filterFromDate}
                createdTo={filters.filterToDate}
                onClearCreated={() => { setFilterFromDate(null); setFilterToDate(null); }}
                deadlineFrom={filters.deadlineFromDate}
                deadlineTo={filters.deadlineToDate}
                onClearDeadline={() => { setDeadlineFromDate(null); setDeadlineToDate(null); }}
                completedFrom={filters.completedFromDate}
                completedTo={filters.completedToDate}
                onClearCompleted={() => { setCompletedFromDate(null); setCompletedToDate(null); }}
                taskType={filters.taskType}
                creatorFilter={filters.creatorFilter}
                onClearCreator={() => setCreatorFilter('all')}
                searchQuery={filters.searchQuery}
                onClearSearch={() => setSearchQuery('')}
                onClearAll={() => setFilters({
                    activeCategories: [], difficultyFilter: [],
                    filterFromDate: null, filterToDate: null,
                    deadlineFromDate: null, deadlineToDate: null,
                    completedFromDate: null, completedToDate: null,
                    creatorFilter: 'all', searchQuery: ''
                })}
            />

            {/* BottomQuickAdd REMOVED as requested */}

            {showFilters && (
                <InlineFilters
                    showCreatorFilter={filters.taskType === 'shared'}
                    categories={categories}
                    activeCategory={'all'}
                    onChangeCategory={() => { }}
                    activeCategories={filters.activeCategories}
                    onChangeCategories={setActiveCategories}
                    difficultyFilter={filters.difficultyFilter}
                    onChangeDifficulty={setDifficultyFilter}
                    createdFrom={filters.filterFromDate}
                    createdTo={filters.filterToDate}
                    onChangeCreatedFrom={setFilterFromDate}
                    onChangeCreatedTo={setFilterToDate}
                    deadlineFrom={filters.deadlineFromDate}
                    deadlineTo={filters.deadlineToDate}
                    onChangeDeadlineFrom={setDeadlineFromDate}
                    onChangeDeadlineTo={setDeadlineToDate}
                    completedFrom={filters.completedFromDate}
                    completedTo={filters.completedToDate}
                    onChangeCompletedFrom={setCompletedFromDate}
                    onChangeCompletedTo={setCompletedToDate}
                    creators={sharedCreators}
                    creatorFilter={filters.creatorFilter}
                    onChangeCreator={setCreatorFilter}
                    onOpenCalendar={(type) => setCalendarModal({ visible: true, type })}
                />
            )}

            {tasksLoading ? <TaskListSkeleton rows={8} /> : (
                processedAndSortedTasks.length === 0 ? (
                    <View style={GlobalStyles.centered}>
                        <HomeEmptyState onAddTask={() => setAddTaskModalVisible(true)} onOpenTemplates={() => navigation.navigate('ChoreTemplates' as any)} />
                    </View>
                ) : (
                    <TaskSectionList
                        tasks={processedAndSortedTasks}
                        categories={categories}
                        onPressTask={(t) => navigation.navigate('TaskDetail', { taskId: t.id })}
                        onToggleComplete={(t) => toggleComplete(t)}
                        onConfirmAction={(t) => handleTaskAction(t)}
                        selectionMode={selectionMode}
                        selectedIds={selectedIds}
                        onToggleSelect={toggleSelect}
                        onOpenTaskMenu={(t) => setMenuTask(t)}
                        onSelectAllSection={(key, items) => {
                            const ids = new Set(selectedIds);
                            const list = items as Task[];
                            const allSelected = list.every(it => ids.has(it.id));
                            if (allSelected) { list.forEach(it => ids.delete(it.id)); } else { list.forEach(it => ids.add(it.id)); }
                            setSelectedIds(ids);
                            setSelectionMode(true);
                        }}
                        onQuickAdd={(key) => {
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
                <TouchableOpacity
                    style={styles.templateFab}
                    onPress={() => {
                        if (filters.taskType === 'shared' && !userProfile?.pairId) { showToast('Musisz być w parze...', 'info'); return; }
                        setTemplatesModalVisible(true);
                    }}
                >
                    <Feather name="file-text" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => {
                        if (filters.taskType === 'shared' && !userProfile?.pairId) { showToast('Musisz być w parze...', 'info'); return; }
                        setAddTaskModalVisible(true);
                    }}
                >
                    <Feather name="plus" size={30} color="white" />
                </TouchableOpacity>
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
                                await actions.deleteTask(confirmModalTask.id);
                                // Simple undo snapshot
                                try {
                                    const key = `undo_last_task_${currentUser?.uid || 'anon'}`;
                                    await AsyncStorage.setItem(key, JSON.stringify(confirmModalTask));
                                    showToast('Zadanie usunięte. Cofnij?', 'info');
                                } catch { }
                            }
                            setConfirmModalTask(null);
                        }
                    },
                ]}
            />

            {/* Menu Task Modal */}
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

            {/* Category Picker */}
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
                            value={categorySearch}
                            onChangeText={setCategorySearch}
                            style={[GlobalStyles.input, { marginBottom: Spacing.small }]}
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

            {/* Difficulty Picker */}
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

            {/* Bulk Pickers */}
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
                            value={categorySearch}
                            onChangeText={setCategorySearch}
                            style={[GlobalStyles.input, { marginBottom: Spacing.small }]}
                        />
                        {recentCategoryIds.length > 0 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 6 }}>
                                {recentCategoryIds.map(id => {
                                    const cat = categories.find(c => c.id === id);
                                    if (!cat) return null;
                                    return (
                                        <TouchableOpacity key={id} onPress={async () => {
                                            const ids = Array.from(selectedIds);
                                            for (const tid of ids) await actions.updateTask(tid, { category: id });
                                            await saveRecentCategory(id);
                                            clearSelection();
                                            setCategoryPickerBulk(false);
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
                        {recentDifficulties.length > 0 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.small }}>
                                {recentDifficulties.map(lvl => (
                                    <TouchableOpacity key={`rdb-${lvl}`} onPress={async () => {
                                        const ids = Array.from(selectedIds);
                                        for (const id of ids) await actions.updateTask(id, { difficulty: lvl });
                                        await saveRecentDifficulty(lvl);
                                        clearSelection();
                                        setDifficultyPickerBulk(false);
                                    }} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border, marginRight: 8 }}>
                                        <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>Poziom {lvl}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
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

            {/* Selection Mode Bar */}
            {selectionMode && (
                <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: Spacing.medium, backgroundColor: theme.colors.card, borderTopWidth: 1, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>{selectedIds.size} wybranych</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity style={{ padding: 8, marginHorizontal: 4 }} onPress={() => setCategoryPickerBulk(true)}>
                            <Feather name="tag" size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={{ padding: 8, marginHorizontal: 4 }} onPress={() => setDifficultyPickerBulk(true)}>
                            <Feather name="bar-chart-2" size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={{ padding: 8, marginHorizontal: 4 }} onPress={() => setBulkSnoozeVisible(true)}>
                            <Feather name="clock" size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={{ padding: 8, marginHorizontal: 4 }} onPress={async () => {
                            const ids = Array.from(selectedIds);
                            for (const id of ids) await actions.archiveTask(id);
                            clearSelection();
                        }}>
                            <Feather name="archive" size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={{ padding: 8, marginHorizontal: 4 }} onPress={async () => {
                            const ids = Array.from(selectedIds);
                            for (const id of ids) await actions.deleteTask(id);
                            clearSelection();
                        }}>
                            <Feather name="trash-2" size={20} color={theme.colors.danger} />
                        </TouchableOpacity>
                        <TouchableOpacity style={{ padding: 8, marginHorizontal: 4 }} onPress={clearSelection}>
                            <Feather name="x" size={22} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <UndoLastDeleted />

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
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.backgroundLight },
    headerContainer: {
        paddingTop: Spacing.xxLarge,
        paddingBottom: Spacing.medium,
        paddingHorizontal: Spacing.large,
        backgroundColor: 'white',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderColor: Colors.border,
    },
    headerTitle: {
        fontSize: Typography.h1.fontSize,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    headerIcons: { flexDirection: 'row', alignItems: 'center' },
    headerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    headerAvatarPlaceholder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.secondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerAvatarText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    partnerInfoBanner: {
        backgroundColor: Colors.light,
        padding: Spacing.small,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderColor: Colors.border,
    },
    partnerInfoText: {
        fontSize: Typography.body.fontSize,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: Spacing.small,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderColor: Colors.border,
    },
    tab: { paddingVertical: Spacing.small, paddingHorizontal: Spacing.large, borderRadius: 20 },
    tabActive: { backgroundColor: Colors.primary },
    tabText: {
        fontSize: Typography.body.fontSize,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    tabTextActive: { color: 'white' },
    list: { flex: 1 },
    taskContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.small,
        paddingHorizontal: Spacing.medium,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderColor: Colors.border,
        borderLeftWidth: 2,
        borderLeftColor: 'transparent',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 1,
    },
    taskContainerCompleted: { opacity: 0.6 },
    checkboxTouchable: { padding: Spacing.small },
    checkbox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center'
    },
    checkboxCompleted: { backgroundColor: Colors.success, borderColor: Colors.success },
    taskContent: { flex: 1, marginLeft: Spacing.xSmall },
    taskText: {
        fontSize: Typography.body.fontSize,
        fontWeight: '600',
        color: Colors.textPrimary
    },
    taskTextCompleted: { textDecorationLine: 'line-through', color: Colors.textSecondary, fontWeight: 'normal' },
    descriptionText: {
        fontSize: Typography.small.fontSize,
        color: Colors.textSecondary,
        marginTop: 2,
        paddingRight: Spacing.small,
    },
    metaRowTop: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    metaRowBottom: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
    categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, marginRight: 8 },
    categoryDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    categoryChipText: { fontSize: Typography.small.fontSize, fontWeight: '600' },
    creatorText: { fontSize: Typography.small.fontSize },
    metaDateText: { fontSize: Typography.small.fontSize },
    overdueBadge: { marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    overdueBadgeText: { color: 'white', fontSize: Typography.small.fontSize - 1, fontWeight: '700' },
    rightSection: { alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' },
    actionButton: { marginTop: Spacing.xSmall, padding: Spacing.xSmall },
    emptyListText: { textAlign: 'center', marginTop: Spacing.xLarge, fontSize: Typography.body.fontSize, color: Colors.textSecondary },
    fabContainer: {
        position: 'absolute',
        right: Spacing.large,
        bottom: Spacing.large,
        width: 110,
        height: 110,
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
    },
    templateFab: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.info,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 7,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        zIndex: 10,
    },
    fab: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        zIndex: 10,
    },
    modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.large, maxHeight: '50%' },
    modalTitle: { fontSize: Typography.h3.fontSize, fontWeight: '700', textAlign: 'center', marginBottom: Spacing.medium },
    templateItem: { padding: Spacing.medium, borderBottomWidth: 1, borderColor: Colors.border },
    templateName: { fontSize: Typography.body.fontSize },
    closeButton: { marginTop: Spacing.medium, padding: Spacing.small },
    closeButtonText: { textAlign: 'center', color: Colors.danger, fontSize: Typography.body.fontSize },
    todaySection: {
        marginHorizontal: Spacing.medium,
        marginTop: Spacing.medium,
        padding: Spacing.medium,
        borderRadius: 10,
        borderWidth: 1,
    },
    todayTitle: {
        ...Typography.h3,
        marginBottom: Spacing.small,
    },
    // Focus Mode UI zostało przeniesione do ustawień, style nie są już używane
    todayItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
    },
    todayText: {
        ...Typography.body,
        flex: 1,
    },
    swipeAction: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.medium,
    },
    swipeActionText: {
        color: 'white',
        fontWeight: '700',
    },
    swipeActionWidth: {
        width: 140,
        justifyContent: 'center',
    },
    quickAddContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingHorizontal: Spacing.medium,
        paddingVertical: Spacing.small,
        borderBottomWidth: 1,
        borderTopWidth: 1,
        borderColor: Colors.border,
    },
    quickAddInput: {
        flex: 1,
        paddingVertical: 10,
        paddingRight: Spacing.small,
        color: Colors.textPrimary,
    },
    quickAddButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickAddButtonDisabled: {
        backgroundColor: Colors.textSecondary,
        opacity: 0.5,
    },
});

export default HomeScreen;

// Onboarding-aware empty state for Home
const HomeEmptyState = ({ onAddTask, onOpenTemplates }: { onAddTask: () => void; onOpenTemplates: () => void }) => {
    const theme = useTheme();
    const [done, setDone] = React.useState<boolean | null>(null);
    React.useEffect(() => { (async () => setDone(await isOnboardingDone()))(); }, []);
    if (done === null) return null;
    if (done) {
        return (
            <EmptyState
                icon="inbox"
                title="Pusta skrzynka"
                subtitle="Brak zadań w tej kategorii. Czas dodać nowe!"
                actions={[
                    { title: 'Dodaj zadanie', onPress: onAddTask },
                    { title: 'Szablony', onPress: onOpenTemplates, variant: 'secondary' },
                ]}
                illustration={require('../../assets/icon.png')}
            />
        );
    }
    return (
        <EmptyState
            icon="inbox"
            title="Zacznijmy!"
            subtitle="Szybki start: dodaj pierwsze zadanie lub wybierz gotowy szablon."
            actions={[
                { title: 'Dodaj zadanie', onPress: async () => { try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch { }; onAddTask(); setOnboardingDone(); } },
                { title: 'Otwórz szablony', onPress: async () => { onOpenTemplates(); setOnboardingDone(); }, variant: 'secondary' },
            ]}
            illustration={require('../../assets/icon.png')}
        />
    );
}

// Simple undo bar (restores last deleted task from AsyncStorage)
const UndoLastDeleted = () => {
    const theme = useTheme();
    const [payload, setPayload] = React.useState<any | null>(null);
    const [visible, setVisible] = React.useState(false);
    React.useEffect(() => {
        (async () => {
            try {
                const uid = getAuth().currentUser?.uid || 'anon';
                const raw = await AsyncStorage.getItem(`undo_last_task_${uid}`);
                if (raw) { setPayload(JSON.parse(raw)); setVisible(true); }
            } catch { }
        })();
    }, []);
    if (!visible || !payload) return null;
    return (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 76, backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.colors.textPrimary, flex: 1 }} numberOfLines={1}>Cofnij usunięcie: {String(payload?.text || '')}</Text>
            <TouchableOpacity onPress={async () => {
                try {
                    await addDoc(collection(db, 'tasks'), payload);
                } catch { }
                try { const uid = getAuth().currentUser?.uid || 'anon'; await AsyncStorage.removeItem(`undo_last_task_${uid}`); } catch { }
                setVisible(false); setPayload(null);
            }} style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>COFNIJ</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={async () => { try { const uid = getAuth().currentUser?.uid || 'anon'; await AsyncStorage.removeItem(`undo_last_task_${uid}`); } catch { }; setVisible(false); setPayload(null); }} style={{ paddingHorizontal: 6, paddingVertical: 6 }}>
                <Feather name="x" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
        </View>
    );
};

// Small pill-like tile for Today's tasks
const TodayTile = ({ text, onPress }: { text: string; onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginRight: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="clock" size={16} color={'#ffffffcc'} style={{ marginRight: 6 }} />
            <Text style={{ color: 'white', fontWeight: '600' }} numberOfLines={1}>{text}</Text>
        </View>
    </TouchableOpacity>
);

function pluralizeTasks(n: number) {
    if (n === 1) return 'zadanie';
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'zadania';
    return 'zadań';
}

function formatRelativePl(date: Date): string {
    const now = new Date();
    const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
    const d = startOfDay(date).getTime();
    const n = startOfDay(now).getTime();
    const diffDays = Math.round((d - n) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'dzisiaj';
    if (diffDays === 1) return 'jutro';
    if (diffDays === -1) return 'wczoraj';
    if (diffDays > 1 && diffDays <= 7) return `za ${diffDays} dni`;
    if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} dni temu`;
    if (diffDays > 7) return `za ${Math.ceil(diffDays / 7)} tyg.`;
    return `${Math.ceil(Math.abs(diffDays) / 7)} tyg. temu`;
}
