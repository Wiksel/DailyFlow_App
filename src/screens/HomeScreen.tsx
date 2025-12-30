import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Modal, TextInput, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from '@react-native-firebase/auth';
import { db } from '../../firebaseConfig';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, deleteDoc, increment, Timestamp, getDoc } from 'firebase/firestore';
import { Feather } from '@expo/vector-icons';
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
import { Colors, Spacing, GlobalStyles, Typography } from '../styles/AppStyles';
import SearchBar from '../components/SearchBar';
import TaskItem from '../components/TaskItem';

const CACHED_TASKS_KEY = 'dailyflow_cached_tasks';

type SerializableTask = Omit<Task, 'createdAt' | 'deadline' | 'completedAt'> & {
    createdAt: string | null;
    deadline: string | null;
    completedAt: string | null;
};

const HomeScreen = () => {
    const navigation = useNavigation<TaskStackNavigationProp>();
    const [rawTasks, setRawTasks] = useState<Task[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [taskType, setTaskType] = useState<'personal' | 'shared'>('personal');
    const [activeCategory, setActiveCategory] = useState<string | 'all'>('all');
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState<ChoreTemplate[]>([]);
    const [templatesModalVisible, setTemplatesModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [addTaskModalVisible, setAddTaskModalVisible] = useState(false);
    const [filterFromDate, setFilterFromDate] = useState<Date | null>(null);
    const [filterToDate, setFilterToDate] = useState<Date | null>(null);
    const auth = getAuth();
    const currentUser = auth.currentUser;
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
                    const partnerId = pairDoc.data().members.find((id: string) => id !== currentUser.uid);
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

    const handleAddTask = async (taskData: any) => {
        if (!currentUser) return;
        try {
            await addDoc(collection(db, 'tasks'), {
                ...taskData,
                completed: false, status: 'active', userId: currentUser.uid,
                creatorNickname: userProfile?.nickname || currentUser.email!.split('@')[0],
                isShared: taskType === 'shared',
                pairId: taskType === 'shared' ? userProfile?.pairId : null,
                createdAt: Timestamp.now(),
             });
            showToast("Zadanie dodane!", 'success');
        } catch (error) {
            console.error("Błąd dodawania zadania: ", error);
            showToast("Nie udało się dodać zadania.", 'error');
        }
    };

    const handleAddTaskFromTemplate = async (template: ChoreTemplate) => {
        if (!currentUser) return;
        try {
            const newDocRef = await addDoc(collection(db, 'tasks'), {
                text: template.name, description: '', category: template.category,
                basePriority: 3, difficulty: template.difficulty, deadline: null,
                completed: false, status: 'active', userId: currentUser.uid,
                creatorNickname: userProfile?.nickname || currentUser.email!.split('@')[0],
                isShared: taskType === 'shared',
                pairId: taskType === 'shared' ? userProfile?.pairId : null,
                createdAt: Timestamp.now(),
            });

            setTemplatesModalVisible(false);
            showToast("Zadanie z szablonu dodane!", 'success');
            navigation.navigate('TaskDetail', { taskId: newDocRef.id });
        } catch (error) {
            console.error("Błąd dodawania zadania z szablonu: ", error);
        }
    };

    const toggleComplete = React.useCallback(async (task: Task) => {
        if (!currentUser || !userProfile) return;
        try {
            const taskRef = doc(db, 'tasks', task.id);
            const userRef = doc(db, 'users', currentUser.uid);
            const isCompleting = !task.completed;
            await updateDoc(taskRef, {
                completed: isCompleting,
                completedAt: isCompleting ? Timestamp.now() : null,
                completedBy: isCompleting ? userProfile.nickname : null,
            });
            await updateDoc(userRef, {
                points: increment(isCompleting ? 10 : -10),
                completedTasksCount: increment(isCompleting ? 1 : -1)
            });
            showToast(isCompleting ? "Zadanie ukończone!" : "Cofnięto ukończenie zadania.", 'success');
        } catch (error) {
            console.error("Błąd zmiany statusu zadania: ", error);
        }
    }, [currentUser, userProfile, showToast]);

    const handleTaskAction = React.useCallback((task: Task) => {
        const action = task.completed ? "Zarchiwizuj" : "Usuń";
        const handler = async () => {
            try {
                if (task.completed) {
                    await updateDoc(doc(db, 'tasks', task.id), { status: 'archived' });
                    showToast("Zadanie zarchiwizowane.", 'success');
                } else {
                    await deleteDoc(doc(db, 'tasks', task.id));
                    showToast("Zadanie usunięte.", 'success');
                }
            } catch (error) {
                console.error(`Błąd ${action.toLowerCase()} zadania: `, error);
            }
        };
        Alert.alert(
            `Potwierdź ${action}`, 
            `Czy na pewno chcesz ${action.toLowerCase()}\nto zadanie?`,
            [{ text: "Anuluj" }, { text: action, style: "destructive", onPress: handler }]
        );
    }, [showToast]);

    const handleTaskPress = React.useCallback((taskId: string) => {
        navigation.navigate('TaskDetail', { taskId });
    }, [navigation]);

    const renderTask = React.useCallback(({ item }: { item: Task }) => {
        const category = categories.find((c: Category) => c.id === item.category);
        return (
            <TaskItem
                task={item}
                category={category}
                onPress={handleTaskPress}
                onToggleComplete={toggleComplete}
                onAction={handleTaskAction}
            />
        );
    }, [categories, handleTaskPress, toggleComplete, handleTaskAction]);

    const filteredTemplates = templates.filter(t => activeCategory === 'all' || t.category === activeCategory);

    return (
        <View style={GlobalStyles.container}>
             <View style={styles.headerContainer}>
                <View>
                    <Text style={styles.headerTitle}>Twoje Zadania</Text>
                </View>
                <View style={styles.headerIcons}>
                    <TouchableOpacity onPress={() => navigation.navigate('Archive')} style={{marginRight: Spacing.medium}}>
                        <Feather name="archive" size={26} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('ChoreTemplates', {})} style={{marginRight: Spacing.medium}}>
                        <Feather name="file-text" size={26} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                         {userProfile?.photoURL ? (
                            <Image source={{ uri: userProfile.photoURL }} style={styles.headerAvatar} />
                         ) : (
                            <View style={styles.headerAvatarPlaceholder}>
                                <Text style={styles.headerAvatarText}>
                                    {userProfile?.nickname ? userProfile.nickname.charAt(0).toUpperCase() : '?'}
                                </Text>
                            </View>
                         )}
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.tabContainer}>
                <TouchableOpacity style={[styles.tab, taskType === 'personal' && styles.tabActive]} onPress={() => setTaskType('personal')}><Text style={[styles.tabText, taskType === 'personal' && styles.tabTextActive]}>Osobiste</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.tab, taskType === 'shared' && styles.tabActive]} onPress={() => setTaskType('shared')}><Text style={[styles.tabText, taskType === 'shared' && styles.tabTextActive]}>Wspólne</Text></TouchableOpacity>
            </View>
            {taskType === 'shared' && userProfile?.partnerNickname ? (
                <View style={styles.partnerInfoBanner}>
                    <Text style={styles.partnerInfoText}>Dzielone z: <Text style={{fontWeight: '700'}}>{userProfile.partnerNickname}</Text></Text>
                </View>
            ) : null}

            <SearchBar
                placeholder="Szukaj po nazwie lub opisie..."
                value={searchQuery}
                onChangeText={setSearchQuery}
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

             {loading ? <ActivityIndicator size="large" color={Colors.primary} style={{flex: 1}} /> : (
                <FlatList
                    data={processedAndSortedTasks}
                    renderItem={renderTask}
                    keyExtractor={item => item.id}
                    initialNumToRender={10}
                    windowSize={5}
                    maxToRenderPerBatch={10}
                    removeClippedSubviews={true}
                    style={styles.list}
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
                    onPress={() => setTemplatesModalVisible(true)}
                >
                    <Feather name="file-text" size={24} color="white" />
                </TouchableOpacity>
                 <TouchableOpacity
                    style={styles.fab}
                    onPress={() => setAddTaskModalVisible(true)}
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
});

export default HomeScreen;