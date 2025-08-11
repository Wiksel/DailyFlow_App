import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, TextInput, Image, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import { scheduleTaskNotifications } from '../utils/notifications';
import Animated, { FadeInUp, FadeOutUp, Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import auth, { getAuth } from '@react-native-firebase/auth';
import { db } from '../../firebaseConfig';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, deleteDoc, increment, Timestamp, getDoc } from '../utils/firestoreCompat';
import { enqueueAdd, enqueueUpdate, enqueueDelete } from '../utils/offlineQueue';
import { Feather } from '@expo/vector-icons';
import AnimatedIconButton from '../components/AnimatedIconButton';
import { TaskStackNavigationProp } from '../types/navigation';
import AddTaskModal from './AddTaskModal';
import PriorityIndicator from '../components/PriorityIndicator';
import CategoryFilter from '../components/CategoryFilter';
import DateRangeFilter from '../components/DateRangeFilter';
import { Task, UserProfile, ChoreTemplate, Category } from '../types';
import EmptyState from '../components/EmptyState';
import { useCategories } from '../contexts/CategoryContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../contexts/ToastContext';
import ActionModal from '../components/ActionModal';
import { Colors, Spacing, GlobalStyles, Typography } from '../styles/AppStyles';
import { useUI } from '../contexts/UIContext';
import { useTheme } from '../contexts/ThemeContext';
import SearchBar from '../components/SearchBar';
import FilterPresets from '../components/FilterPresets';
import AppHeader from '../components/AppHeader';
import BottomQuickAdd from '../components/BottomQuickAdd';

const CACHED_TASKS_KEY = 'dailyflow_cached_tasks';
const HOME_FILTERS_KEY = 'dailyflow_home_filters';

type SerializableTask = Omit<Task, 'createdAt' | 'deadline' | 'completedAt'> & {
    createdAt: string | null;
    deadline: string | null;
    completedAt: string | null;
};

const HomeScreen = () => {
    const navigation = useNavigation<TaskStackNavigationProp>();
    const theme = useTheme();
    const { density } = useUI();
    const [rawTasks, setRawTasks] = useState<Task[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [taskType, setTaskType] = useState<'personal' | 'shared'>('personal');
    const [activeCategory, setActiveCategory] = useState<string | 'all'>('all');
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState<ChoreTemplate[]>([]);
    const [templatesModalVisible, setTemplatesModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [addTaskModalVisible, setAddTaskModalVisible] = useState(false);
    const [quickTaskText, setQuickTaskText] = useState('');
    const [filterFromDate, setFilterFromDate] = useState<Date | null>(null);
    const [filterToDate, setFilterToDate] = useState<Date | null>(null);
    const didLoadFiltersRef = useRef(false);
    const currentUser = getAuth().currentUser;
    const { categories } = useCategories();
    const { showToast } = useToast();

    useEffect(() => {
        const loadTasksFromCache = async () => {
            try {
                const cachedData = await AsyncStorage.getItem(`${CACHED_TASKS_KEY}_${currentUser?.uid}`);
                if (cachedData) {
                    const cachedTasks: SerializableTask[] = JSON.parse(cachedData);
                    const tasksWithDates = cachedTasks.map(t => ({
                        ...t,
                        createdAt: t.createdAt ? Timestamp.fromDate(new Date(t.createdAt)) : Timestamp.now(),
                        deadline: t.deadline ? Timestamp.fromDate(new Date(t.deadline)) : null,
                        completedAt: t.completedAt ? Timestamp.fromDate(new Date(t.completedAt)) : null,
                    })) as Task[];
                    setRawTasks(tasksWithDates);
                }
            } catch (e) {
                console.error("Nie udało się załadować zadań z pamięci podręcznej.", e);
            }
        };
        loadTasksFromCache();
    }, [currentUser]);

    // Persistuj/ładuj filtry widoku Home per użytkownik
    useEffect(() => {
        const loadFilters = async () => {
            if (!currentUser) return;
            try {
                const key = `${HOME_FILTERS_KEY}_${currentUser.uid}`;
                const raw = await AsyncStorage.getItem(key);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed.taskType) setTaskType(parsed.taskType);
                    if (parsed.activeCategory) setActiveCategory(parsed.activeCategory);
                    if (parsed.searchQuery) setSearchQuery(parsed.searchQuery);
                    if (parsed.filterFromDate) setFilterFromDate(new Date(parsed.filterFromDate));
                    if (parsed.filterToDate) setFilterToDate(new Date(parsed.filterToDate));
                }
            } catch {}
            finally { didLoadFiltersRef.current = true; }
        };
        loadFilters();
    }, [currentUser]);

    useEffect(() => {
        const saveFilters = async () => {
            if (!currentUser || !didLoadFiltersRef.current) return;
            try {
                const key = `${HOME_FILTERS_KEY}_${currentUser.uid}`;
                const payload = {
                    taskType,
                    activeCategory,
                    searchQuery,
                    filterFromDate: filterFromDate ? filterFromDate.toISOString() : null,
                    filterToDate: filterToDate ? filterToDate.toISOString() : null,
                };
                await AsyncStorage.setItem(key, JSON.stringify(payload));
            } catch {}
        };
        // Debounce zapisu
        const t = setTimeout(saveFilters, 300);
        return () => clearTimeout(t);
    }, [currentUser, taskType, activeCategory, searchQuery, filterFromDate, filterToDate]);

    useEffect(() => {
        if (!currentUser) return;
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribe = onSnapshot(userDocRef, async (docSnapshot) => {
            if (!docSnapshot.exists()) {
                setUserProfile(null);
                return;
            }
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
        }, (error) => {
            console.error("Błąd pobierania profilu użytkownika: ", error);
        });
        return unsubscribe;
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser) return;
        const templatesQuery = query(collection(db, 'choreTemplates'), where("userId", "==", currentUser.uid));
        const unsubscribe = onSnapshot(templatesQuery, (snapshot) => {
            setTemplates(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ChoreTemplate)));
        }, (error) => {
            console.error("Błąd pobierania szablonów: ", error);
        });
        return unsubscribe;
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }
        if (taskType === 'shared' && !userProfile?.pairId) {
            setRawTasks([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const tasksCollection = collection(db, 'tasks');
        let q;
        if (taskType === 'personal') {
            q = query(tasksCollection, where("userId", "==", currentUser.uid), where("status", "==", "active"));
        } else {
            q = query(tasksCollection, where("pairId", "==", userProfile!.pairId), where("status", "==", "active"));
        }
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const tasksData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task));
            setRawTasks(tasksData);
            try {
                 const serializableTasks = tasksData.map(t => ({
                    ...t,
                    createdAt: t.createdAt?.toDate().toISOString(),
                    deadline: t.deadline?.toDate().toISOString(),
                    completedAt: t.completedAt?.toDate().toISOString(),
                }));
                await AsyncStorage.setItem(`${CACHED_TASKS_KEY}_${currentUser?.uid}`, JSON.stringify(serializableTasks));
            } catch (e) {
                console.error("Nie udało się zapisać zadań w pamięci podręcznej.", e);
            }
            // schedule notifications for due tasks
            try { await scheduleTaskNotifications(tasksData, userProfile); } catch {}
            setLoading(false);
        }, (error) => {
            console.error("Błąd połączenia z Firestore, dane mogą być nieaktualne.", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser, taskType, userProfile?.pairId]);

    const processedAndSortedTasks = useMemo(() => {
        const now = new Date();
        const oneDay = 1000 * 60 * 60 * 24;
        const settings = userProfile?.prioritySettings || {
            criticalThreshold: 1, urgentThreshold: 3, soonThreshold: 7, distantThreshold: 14,
            criticalBoost: 4, urgentBoost: 3, soonBoost: 2, distantBoost: 1,
            agingBoostDays: 5, agingBoostAmount: 1
        };
        const filteredTasks = rawTasks.filter(task => {
            const matchesTaskType = task.isShared === (taskType === 'shared');
            if (!matchesTaskType) return false;
            const matchesCategory = activeCategory === 'all' || task.category === activeCategory;
            if (!matchesCategory) return false;
            const taskCreatedAt = task.createdAt?.toDate();
            if (taskCreatedAt) {
                if (filterFromDate) {
                    const fromTime = new Date(filterFromDate);
                    fromTime.setHours(0, 0, 0, 0);
                    if (taskCreatedAt.getTime() < fromTime.getTime()) return false;
                }
                if (filterToDate) {
                    const toTime = new Date(filterToDate);
                    toTime.setHours(23, 59, 59, 999);
                    if (taskCreatedAt.getTime() > toTime.getTime()) return false;
                }
            }
            if (searchQuery.trim() !== '') {
                const lowerCaseQuery = searchQuery.toLowerCase();
                const matchesSearch = task.text.toLowerCase().includes(lowerCaseQuery) ||
                                   (task.description && task.description.toLowerCase().includes(lowerCaseQuery));
                if (!matchesSearch) return false;
            }
            return true;
        });
        return filteredTasks
          .map(task => {
            let deadlineBoost = 0; let agingBoost = 0;
            if (task.deadline) {
              const diffDays = (task.deadline.toDate().getTime() - now.getTime()) / oneDay;
              if (diffDays < 0) deadlineBoost = settings.criticalBoost + 1;
              else if (diffDays <= settings.criticalThreshold) deadlineBoost = settings.criticalBoost;
              else if (diffDays <= settings.urgentThreshold) deadlineBoost = settings.urgentBoost;
              else if (diffDays <= settings.soonThreshold) deadlineBoost = settings.soonBoost;
              else if (diffDays <= settings.distantThreshold) deadlineBoost = settings.distantBoost;
            } else if (task.createdAt) {
                const diffDays = (now.getTime() - task.createdAt.toDate().getTime()) / oneDay;
                agingBoost = Math.floor(diffDays / settings.agingBoostDays) * settings.agingBoostAmount;
            }
            const dynamicPriority = Math.min(5, (task.basePriority || 3) + deadlineBoost + agingBoost);
            return { ...task, priority: dynamicPriority };
          })
          .sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            if (a.priority !== b.priority) return b.priority - a.priority;
            const deadlineA = a.deadline?.toMillis() || Infinity; const deadlineB = b.deadline?.toMillis() || Infinity;
            return deadlineA - deadlineB;
           });
    }, [rawTasks, userProfile, activeCategory, taskType, searchQuery, filterFromDate, filterToDate]);

    const todayTasks = useMemo(() => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        return processedAndSortedTasks.filter(t => {
            const deadline = t.deadline?.toDate?.() || (t.deadline as any);
            if (!deadline) return false;
            const time = deadline.getTime();
            return time < end.getTime(); // obejmuje dziś i przeterminowane
        }).slice(0, 5);
    }, [processedAndSortedTasks]);

    const handleAddTask = async (taskData: any) => {
        if (!currentUser) return;
        try {
            if (taskType === 'shared' && !userProfile?.pairId) {
                showToast('Musisz być w parze, \naby dodawać wspólne zadania.', 'info');
                return;
            }
            const payload = {
                ...taskData,
                completed: false,
                status: 'active',
                userId: currentUser.uid,
                creatorNickname: userProfile?.nickname || currentUser.email?.split('@')[0] || 'Użytkownik',
                isShared: taskType === 'shared',
                pairId: taskType === 'shared' ? (userProfile?.pairId ?? null) : null,
                createdAt: Timestamp.now(),
             };
            // spróbuj online, a w razie błędu dodaj do kolejki
            try { await addDoc(collection(db, 'tasks'), payload); }
            catch { await enqueueAdd('tasks', payload); }
            showToast("Zadanie dodane!", 'success');
        } catch (error) {
            console.error("Błąd dodawania zadania: ", error);
            showToast("Nie udało się dodać zadania.", 'error');
        }
    };

    const handleQuickAdd = async () => {
        if (!currentUser) return;
        if (!quickTaskText.trim()) return;
        if (taskType === 'shared' && !userProfile?.pairId) { showToast('Musisz być w parze, \naby dodawać wspólne zadania.', 'info'); return; }
        try {
            const defaultCategoryId = activeCategory === 'all'
                ? (categories.find(c => c.name === 'Inne')?.id || 'default')
                : activeCategory;
            const payload = {
                text: quickTaskText.trim(),
                description: '',
                category: defaultCategoryId,
                basePriority: 3,
                difficulty: 2,
                deadline: null,
                completed: false,
                status: 'active',
                userId: currentUser.uid,
                creatorNickname: userProfile?.nickname || currentUser.email?.split('@')[0] || 'Użytkownik',
                isShared: taskType === 'shared',
                pairId: taskType === 'shared' ? (userProfile?.pairId ?? null) : null,
                createdAt: Timestamp.now(),
            };
            try { await addDoc(collection(db, 'tasks'), payload); }
            catch { await enqueueAdd('tasks', payload); }
            setQuickTaskText('');
            showToast('Dodano!', 'success');
        } catch (e) {
            console.error('QuickAdd error', e);
            showToast('Nie udało się dodać.', 'error');
        }
    };

    const handleAddTaskFromTemplate = async (template: ChoreTemplate) => {
        if (!currentUser) return;
        try {
            if (taskType === 'shared' && !userProfile?.pairId) {
                showToast('Musisz być w parze, \naby dodawać wspólne zadania.', 'info');
                return;
            }
            const payload = {
                text: template.name,
                description: '',
                category: template.category,
                basePriority: 3,
                difficulty: template.difficulty,
                deadline: null,
                completed: false,
                status: 'active',
                userId: currentUser.uid,
                creatorNickname: userProfile?.nickname || currentUser.email?.split('@')[0] || 'Użytkownik',
                isShared: taskType === 'shared',
                pairId: taskType === 'shared' ? (userProfile?.pairId ?? null) : null,
                createdAt: Timestamp.now(),
            };
            let newId: string | null = null;
            try { const ref = await addDoc(collection(db, 'tasks'), payload); newId = ref.id; }
            catch { await enqueueAdd('tasks', payload); }

            setTemplatesModalVisible(false);
            showToast("Zadanie z szablonu dodane!", 'success');
            if (newId) navigation.navigate('TaskDetail', { taskId: newId });
        } catch (error) {
            console.error("Błąd dodawania zadania z szablonu: ", error);
        }
    };

    const pendingToggleIdsRef = useRef<Set<string>>(new Set());
    const toggleComplete = async (task: Task) => {
        if (!currentUser || !userProfile) return;
        if (pendingToggleIdsRef.current.has(task.id)) return;
        try {
            pendingToggleIdsRef.current.add(task.id);
            const taskRef = doc(db, 'tasks', task.id);
            const userRef = doc(db, 'users', currentUser.uid);
            const isCompleting = !task.completed;
            const updatePayload = {
                completed: isCompleting,
                completedAt: isCompleting ? Timestamp.now() : null,
                completedBy: isCompleting ? userProfile.nickname : null,
            };
            try { await updateDoc(taskRef, updatePayload); }
            catch { await enqueueUpdate(`tasks/${task.id}`, updatePayload); }
            const userUpdate = isCompleting
              ? { __inc: { points: 10, completedTasksCount: 1 } }
              : { __inc: { points: -10, completedTasksCount: -1 } };
            try { await updateDoc(userRef, { points: increment(isCompleting ? 10 : -10), completedTasksCount: increment(isCompleting ? 1 : -1) }); }
            catch { await enqueueUpdate(`users/${currentUser.uid}`, userUpdate as any); }
            // Subtelny feedback dotykowy
            try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch { try { Vibration.vibrate(10); } catch {} }
            showToast(isCompleting ? "Zadanie ukończone!" : "Cofnięto ukończenie zadania.", 'success');
        } catch (error) {
            // Log w konsoli wystarczy, unikamy wycieku szczegółów do UI
            console.error("Błąd zmiany statusu zadania");
        } finally {
            pendingToggleIdsRef.current.delete(task.id);
        }
    };

    const [confirmModalTask, setConfirmModalTask] = useState<Task | null>(null);
    const handleTaskAction = (task: Task) => setConfirmModalTask(task);

    const renderTask = ({ item }: { item: Task }) => {
        let swipeableRef: Swipeable | null = null;
        const rowVertical = density === 'compact' ? Spacing.xSmall : Spacing.small;
        const rowHorizontal = density === 'compact' ? Spacing.small : Spacing.medium;

        const renderLeftActions = () => (
            <View style={[styles.swipeAction, styles.swipeActionWidth, { backgroundColor: Colors.success }]}>
                <Feather name="check" size={22} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.swipeActionText}>Ukończ</Text>
            </View>
        );

        const renderRightActions = () => (
            <View style={[styles.swipeAction, styles.swipeActionWidth, { backgroundColor: item.completed ? Colors.warning : Colors.danger }]}>
                <Feather name={item.completed ? 'archive' : 'trash-2'} size={22} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.swipeActionText}>{item.completed ? 'Archiwizuj' : 'Usuń'}</Text>
            </View>
        );

        const category = categories.find((c: Category) => c.id === item.category);
        return (
            <Swipeable
                ref={(ref) => { swipeableRef = ref; }}
                renderLeftActions={renderLeftActions}
                renderRightActions={renderRightActions}
                onSwipeableOpen={(direction) => {
                    if (direction === 'left') {
                        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                        toggleComplete(item);
                        swipeableRef?.close();
                    } else if (direction === 'right') {
                        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
                        handleTaskAction(item);
                        swipeableRef?.close();
                    }
                }}
                friction={2}
                leftThreshold={72}
                rightThreshold={72}
                overshootLeft={false}
                overshootRight={false}
            >
                <TouchableOpacity onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })} style={GlobalStyles.rowPress}>
                    {/* Wrapper z animacją layoutu, bez zmian opacity */}
                    <Animated.View layout={Layout.springify()}>
                        {/* Wewnętrzny widok z animacją wejścia/wyjścia; przywrócony styl wiersza jak wcześniej */}
                        <Animated.View entering={FadeInUp.duration(250)} exiting={FadeOutUp.duration(200)} style={[
                            styles.taskContainer,
                            { paddingVertical: rowVertical, paddingHorizontal: rowHorizontal },
                            item.completed && styles.taskContainerCompleted,
                            item.priority >= 4 && { borderLeftWidth: 4, borderLeftColor: Colors.danger },
                            item.priority === 3 && { borderLeftWidth: 3, borderLeftColor: Colors.warning },
                            item.priority < 3 && { borderLeftWidth: 2, borderLeftColor: Colors.success },
                            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                        ]}>
                            <TouchableOpacity onPress={() => toggleComplete(item)} style={styles.checkboxTouchable}>
                                <View style={[styles.checkbox, item.completed && styles.checkboxCompleted]}>
                                    {item.completed && <Feather name="check" size={18} color="white" />}
                                </View>
                            </TouchableOpacity>
                            <View style={styles.taskContent}>
                                <Text style={[styles.taskText, { color: theme.colors.textPrimary }, item.completed && styles.taskTextCompleted]}>{item.text}</Text>
                                {!!item.description && <Text style={[styles.descriptionText, { color: theme.colors.textSecondary }]} numberOfLines={density==='compact' ? 2 : 3}>{item.description}</Text>}
                                <View style={styles.taskMetaContainer}>
                                    {category && <View style={[styles.categoryTag, {backgroundColor: category.color}]}><Text style={styles.categoryTagText}>{category.name}</Text></View>}
                                    {item.isShared && <Text style={[styles.creatorText, { color: theme.colors.textSecondary }]}>od: {item.creatorNickname}</Text>}
                                </View>
                                {item.completed && item.completedBy ? (
                                    <Text style={[styles.completedText, { color: Colors.success }]}>
                                        Wykonane przez: {item.completedBy} {item.completedAt?.toDate().toLocaleDateString('pl-PL')}
                                    </Text>
                                ) : (
                                    item.createdAt && <Text style={[styles.createdText, { color: theme.colors.textSecondary }]}>
                                        Dodano: {item.createdAt?.toDate().toLocaleDateString('pl-PL')}
                                    </Text>
                                )}
                                {item.deadline && !item.completed && <Text style={[styles.deadlineText, { color: Colors.danger }]}>
                                    Termin: {item.deadline.toDate().toLocaleDateString('pl-PL')}
                                </Text>}
                            </View>
                            <View style={styles.rightSection}>
                                <PriorityIndicator priority={item.priority} />
                                <AnimatedIconButton
                                  icon={item.completed ? 'archive' : 'trash-2'}
                                  size={20}
                                  color={item.completed ? Colors.textSecondary : Colors.danger}
                                  onPress={() => handleTaskAction(item)}
                                  accessibilityLabel={item.completed ? 'Archiwizuj' : 'Usuń'}
                                  style={styles.actionButton as any}
                                />
                            </View>
                        </Animated.View>
                    </Animated.View>
                </TouchableOpacity>
            </Swipeable>
        );
    };

    const filteredTemplates = templates.filter(t => activeCategory === 'all' || t.category === activeCategory);

    return (
        <View style={[GlobalStyles.container, { backgroundColor: theme.colors.background }]}>
            <AppHeader
              title="Twoje zadania"
              rightActions={[
                { icon: 'archive', onPress: () => navigation.navigate('Archive'), accessibilityLabel: 'Archiwum zadań' },
                { icon: 'file-text', onPress: () => navigation.navigate('ChoreTemplates', {}), accessibilityLabel: 'Szablony obowiązków' },
                { icon: 'calendar', onPress: () => navigation.navigate('WeekPlan'), accessibilityLabel: 'Plan tygodnia' },
                { icon: 'repeat', onPress: () => navigation.navigate('RecurringSeries'), accessibilityLabel: 'Zadania cykliczne' },
                { icon: 'bell', onPress: () => navigation.navigate('Notifications'), accessibilityLabel: 'Powiadomienia' },
              ]}
              avatarUrl={userProfile?.photoURL || null}
              onAvatarPress={() => navigation.navigate('Profile')}
            />
            <View style={[styles.tabContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <TouchableOpacity style={[styles.tab, taskType === 'personal' && styles.tabActive]} onPress={() => setTaskType('personal')} activeOpacity={0.8} accessibilityLabel="Zadania osobiste">
                    <Text style={[styles.tabText, taskType === 'personal' && styles.tabTextActive]}>Osobiste</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, taskType === 'shared' && styles.tabActive]} onPress={() => setTaskType('shared')} activeOpacity={0.8} accessibilityLabel="Zadania wspólne">
                    <Text style={[styles.tabText, taskType === 'shared' && styles.tabTextActive]}>Wspólne</Text>
                </TouchableOpacity>
            </View>
            {taskType === 'shared' && userProfile?.partnerNickname ? (
                <View style={[styles.partnerInfoBanner, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <Text style={[styles.partnerInfoText, { color: theme.colors.textSecondary }]}>Dzielone z: <Text style={{fontWeight: '700', color: theme.colors.textPrimary}}>{userProfile.partnerNickname}</Text></Text>
                </View>
            ) : null}

            <SearchBar
                placeholder="Szukaj po nazwie lub opisie..."
                value={searchQuery}
                onChangeText={setSearchQuery}
            />

            <FilterPresets
                storageKey="dailyflow_home_filter_presets"
                userId={currentUser?.uid}
                title="Presety filtrów (Home)"
                getCurrentFilters={() => ({
                    taskType,
                    activeCategory,
                    searchQuery,
                    filterFromDate: filterFromDate ? filterFromDate.toISOString() : null,
                    filterToDate: filterToDate ? filterToDate.toISOString() : null,
                })}
                applyFilters={(data: any) => {
                    setTaskType(data.taskType ?? 'personal');
                    setActiveCategory(data.activeCategory ?? 'all');
                    setSearchQuery(data.searchQuery ?? '');
                    setFilterFromDate(data.filterFromDate ? new Date(data.filterFromDate) : null);
                    setFilterToDate(data.filterToDate ? new Date(data.filterToDate) : null);
                }}
            />

            {todayTasks.length > 0 && (
                <LinearGradient
                  colors={theme.colorScheme === 'dark' ? ['#1e3c72', '#2a5298'] : ['#a1c4fd', '#c2e9fb']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[GlobalStyles.card, styles.todaySection, { borderWidth: 0, shadowOpacity: theme.colorScheme==='dark' ? 0.25 : 0.18 }]}
                >
                    <Text style={[styles.todayTitle, { color: 'white' }]}>Dzisiaj</Text>
                    {todayTasks.map(t => (
                        <TouchableOpacity key={t.id} onPress={async () => { try { await Haptics.selectionAsync(); } catch {}; navigation.navigate('TaskDetail', { taskId: t.id }); }} style={[styles.todayItem, GlobalStyles.rowPress]}>
                            <Feather name="clock" size={16} color={'#ffffffcc'} style={{ marginRight: 6 }} />
                            <Text style={[styles.todayText, { color: 'white' }]} numberOfLines={1}>{t.text}</Text>
                        </TouchableOpacity>
                    ))}
                </LinearGradient>
            )}

            <BottomQuickAdd
              value={quickTaskText}
              onChangeText={setQuickTaskText}
              placeholder={taskType === 'shared' && !userProfile?.pairId ? 'Dołącz do pary, aby dodać wspólne' : 'Szybko dodaj zadanie...'}
              onSubmit={handleQuickAdd}
              disabled={!quickTaskText.trim() || (taskType === 'shared' && !userProfile?.pairId)}
            />

            <CategoryFilter activeCategory={activeCategory} onSelectCategory={setActiveCategory} />

            <DateRangeFilter
                label="Filtruj datę dodania:"
                fromDate={filterFromDate}
                toDate={filterToDate}
                onFromDateChange={setFilterFromDate}
                onToDateChange={setFilterToDate}
                predefinedRanges={true}
            />

            {loading ? <ActivityIndicator size="large" color={theme.colors.primary} style={{flex: 1}} /> : (
                <Animated.FlatList
                    data={processedAndSortedTasks}
                    renderItem={(args) => (
                      <Animated.View entering={FadeInUp.duration(220)} layout={Layout.springify()}>
                        {renderTask(args)}
                      </Animated.View>
                    )}
                    keyExtractor={item => item.id}
                    style={styles.list}
                    initialNumToRender={12}
                    windowSize={10}
                    removeClippedSubviews
                    maxToRenderPerBatch={12}
                    contentContainerStyle={{ paddingBottom: Spacing.xLarge * 2 }}
                    ListEmptyComponent={
                        <EmptyState
                            icon={searchQuery || filterFromDate || filterToDate || activeCategory !== 'all' ? "search" : "inbox"}
                            title={searchQuery || filterFromDate || filterToDate || activeCategory !== 'all' ? "Brak wyników" : "Pusta skrzynka"}
                            subtitle={searchQuery ? `Nie znaleziono zadań dla frazy "${searchQuery}"` : "Brak zadań w tej kategorii. Czas dodać nowe!"}
                            actionTitle="Dodaj pierwsze zadanie"
                            onActionPress={() => setAddTaskModalVisible(true)}
                        />
                    }
                />
            )}

            <View style={styles.fabContainer}>
                <TouchableOpacity
                    style={styles.templateFab}
                    onPress={() => {
                        if (taskType === 'shared' && !userProfile?.pairId) { showToast('Musisz być w parze, \naby korzystać ze wspólnych szablonów.', 'info'); return; }
                        setTemplatesModalVisible(true);
                    }}
                >
                    <Feather name="file-text" size={24} color="white" />
                </TouchableOpacity>
                 <TouchableOpacity
                    style={styles.fab}
                    onPress={() => {
                        if (taskType === 'shared' && !userProfile?.pairId) { showToast('Musisz być w parze,\naby dodawać wspólne zadania.', 'info'); return; }
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
                initialCategory={activeCategory === 'all' ? (categories.find(c => c.name === 'Inne')?.id || 'default') : activeCategory}
            />

            <Modal visible={templatesModalVisible} transparent={true} animationType="slide" onRequestClose={() => setTemplatesModalVisible(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Wybierz z szablonu</Text>
                        <FlatList
                            data={filteredTemplates}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                 <TouchableOpacity style={styles.templateItem} onPress={() => handleAddTaskFromTemplate(item)}>
                                    <Text style={styles.templateName}>{item.name}</Text>
                                 </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={styles.emptyListText}>Brak szablonów dla tej kategorii.</Text>}
                        />
                        <TouchableOpacity style={styles.closeButton} onPress={() => setTemplatesModalVisible(false)}>
                            <Text style={styles.closeButtonText}>Anuluj</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <ActionModal
                visible={!!confirmModalTask}
                title={`Potwierdź ${confirmModalTask?.completed ? 'archiwizację' : 'usunięcie'}`}
                message={`Czy na pewno chcesz ${confirmModalTask?.completed ? 'zarchiwizować' : 'usunąć'} to zadanie?`}
                onRequestClose={() => setConfirmModalTask(null)}
                actions={[
                    { text: 'Anuluj', onPress: () => setConfirmModalTask(null), variant: 'secondary' },
                    { text: confirmModalTask?.completed ? 'Zarchiwizuj' : 'Usuń', onPress: async () => {
                        const task = confirmModalTask!;
                        try {
                            if (task.completed) {
                                try { await updateDoc(doc(db, 'tasks', task.id), { status: 'archived' }); }
                                catch { await enqueueUpdate(`tasks/${task.id}`, { status: 'archived' }); }
                                showToast('Zadanie zarchiwizowane.', 'success');
                            } else {
                                try { await deleteDoc(doc(db, 'tasks', task.id)); }
                                catch { await enqueueDelete(`tasks/${task.id}`); }
                                showToast('Zadanie usunięte.', 'success');
                            }
                        } catch (e) {
                            console.error('Błąd operacji na zadaniu', e);
                        } finally {
                            setConfirmModalTask(null);
                        }
                    } },
                ]}
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
        fontSize: Typography.small.fontSize + 1,
        color: Colors.textSecondary,
        marginTop: 2,
        fontStyle: 'italic',
        paddingRight: Spacing.small,
    },
    taskMetaContainer: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xSmall + 2, flexWrap: 'wrap' },
    categoryTag: { paddingHorizontal: Spacing.small, paddingVertical: 3, borderRadius: 10, marginRight: Spacing.small },
    categoryTagText: { color: 'white', fontSize: Typography.small.fontSize, fontWeight: '700' },
    creatorText: { fontSize: Typography.small.fontSize, color: Colors.textSecondary, fontStyle: 'italic' },
    completedText: {
        fontSize: Typography.small.fontSize,
        color: Colors.success,
        fontStyle: 'italic',
        marginTop: Spacing.xSmall,
    },
    createdText: {
        fontSize: Typography.small.fontSize,
        color: Colors.textSecondary,
        fontStyle: 'italic',
        marginTop: Spacing.xSmall,
    },
    deadlineText: {
        fontSize: Typography.small.fontSize,
        color: Colors.danger,
        marginTop: Spacing.xSmall,
        fontWeight: '600',
    },
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