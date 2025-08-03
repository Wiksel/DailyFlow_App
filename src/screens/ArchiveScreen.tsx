// src/screens/ArchiveScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, TextInput, ScrollView, Platform, Dimensions } from 'react-native';
import auth from '@react-native-firebase/auth';
import { db } from '../../firebaseConfig'; // <--- TEN IMPORT ZOSTAJE
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { Task, Category, UserProfile, Pair } from '../types';
import { useCategories } from '../contexts/CategoryContext';
import { Feather } from '@expo/vector-icons';
import EmptyState from '../components/EmptyState';
import CategoryFilter from '../components/CategoryFilter';
import DateRangeFilter from '../components/DateRangeFilter';
import ActionButton from '../components/ActionButton';
import { Picker } from '@react-native-picker/picker';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles'; // Import globalnych stylów
import SearchBar from '../components/SearchBar'; // <-- Import SearchBar

const ArchiveScreen = () => {
    const [rawArchivedTasks, setRawArchivedTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [filterCompletedFromDate, setFilterCompletedFromDate] = useState<Date | null>(null);
    const [filterCompletedToDate, setFilterCompletedToDate] = useState<Date | null>(null);

    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [activeCategoryArchive, setActiveCategoryArchive] = useState<string | 'all'>('all');

    const [archivedTaskType, setArchivedTaskType] = useState<'personal' | 'shared' | 'all'>('all');
    const [partnerNicknames, setPartnerNicknames] = useState<{ id: string; nickname: string }[]>([]);
    const [selectedPartnerId, setSelectedPartnerId] = useState<string | 'all'>('all');

    const { categories } = useCategories();
    const currentUser = auth().currentUser;

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
                    const pairMembers = pairDoc.data().members as string[];
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
        ), (snapshot) => {
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
                ), (snapshot) => {
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

            const taskCompletedAt = task.completedAt?.toDate();
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

        return filtered.sort((a, b) => {
            const dateA = a.completedAt?.toMillis() || 0;
            const dateB = b.completedAt?.toMillis() || 0;
            return dateB - dateA;
        });

    }, [rawArchivedTasks, searchQuery, filterCompletedFromDate, filterCompletedToDate, activeCategoryArchive, archivedTaskType, selectedPartnerId, partnerNicknames, userProfile, currentUser]);

    const handleRestoreTask = async (taskId: string) => {
        await updateDoc(doc(db, 'tasks', taskId), {
            status: 'active',
            completed: false,
            completedAt: null,
            completedBy: null,
        });
    };

    const handlePermanentDelete = (taskId: string) => {
        Alert.alert(
            "Trwałe usunięcie",
            "Czy na pewno chcesz trwale usunąć to zadanie? Tej operacji nie można cofnąć.",
            [
                { text: "Anuluj", style: "cancel" },
                { text: "Usuń", style: "destructive", onPress: async () => {
                    await deleteDoc(doc(db, 'tasks', taskId));
                }}
            ]
        );
    };

    const renderArchivedTask = ({ item }: { item: Task }) => {
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

        return (
            <View style={styles.taskContainer}>
                <View style={styles.taskContent}>
                    <Text style={styles.taskTitle}>{item.text}</Text>
                    {!!item.description && <Text style={styles.taskDescription}>{item.description}</Text>}

                    <View style={styles.taskMetaContainer}>
                        {category && <View style={[styles.categoryTag, {backgroundColor: category.color}]}><Text style={styles.categoryTagText}>{category.name}</Text></View>}
                        {item.isShared && <Text style={styles.creatorText}>od: {item.creatorNickname}</Text>}

                        {sharedWithInfo ? <Text style={styles.sharedInfoText}>{sharedWithInfo}</Text> : null}
                    </View>
                    {item.completedBy && item.completedAt && (
                        <Text style={styles.completedText}>
                            Wykonane przez: {item.completedBy} dnia {item.completedAt.toDate().toLocaleDateString('pl-PL')}
                        </Text>
                    )}
                </View>
                <View style={styles.actionsContainer}>
                    <TouchableOpacity onPress={() => handleRestoreTask(item.id)} style={styles.actionButton}>
                        <Feather name="refresh-ccw" size={22} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handlePermanentDelete(item.id)} style={[styles.actionButton, { marginLeft: Spacing.medium }]}>
                        <Feather name="trash-2" size={22} color={Colors.danger} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={GlobalStyles.container}>
            {/* Przełącznik typu zadań (osobiste/wspólne/wszystkie) */}
            <View style={styles.taskTypeSwitchContainer}>
                <ActionButton
                    title="Osobiste"
                    onPress={() => { setArchivedTaskType('personal'); setSelectedPartnerId('all'); }}
                    style={[
                        styles.taskTypeButton,
                        archivedTaskType === 'personal' ? styles.taskTypeButtonActive : {}
                    ]}
                    textStyle={[
                        styles.taskTypeButtonText,
                        archivedTaskType === 'personal' ? styles.taskTypeButtonTextActive : {}
                    ]}
                />
                <ActionButton
                    title="Wspólne"
                    onPress={() => { setArchivedTaskType('shared'); setSelectedPartnerId('all'); }}
                    style={[
                        styles.taskTypeButton,
                        archivedTaskType === 'shared' ? styles.taskTypeButtonActive : {}
                    ]}
                    textStyle={[
                        styles.taskTypeButtonText,
                        archivedTaskType === 'shared' ? styles.taskTypeButtonTextActive : {}
                    ]}
                />
                 <ActionButton
                    title="Wszystkie"
                    onPress={() => { setArchivedTaskType('all'); setSelectedPartnerId('all'); }}
                    style={[
                        styles.taskTypeButton,
                        archivedTaskType === 'all' ? styles.taskTypeButtonActive : {}
                    ]}
                    textStyle={[
                        styles.taskTypeButtonText,
                        archivedTaskType === 'all' ? styles.taskTypeButtonTextActive : {}
                    ]}
                />
            </View>

            {/* Filtr po osobach, tylko jeśli wybrano "Wspólne" i użytkownik jest w parze */}
            {archivedTaskType === 'shared' && userProfile?.pairId && partnerNicknames.length > 0 && (
                <View style={styles.partnerFilterContainer}>
                    <Text style={styles.partnerFilterLabel}>Filtruj wg partnera:</Text>
                    <View style={styles.pickerWrapper}>
                        <Picker
                            selectedValue={selectedPartnerId}
                            onValueChange={(itemValue: string | 'all') => setSelectedPartnerId(itemValue)}
                            style={styles.picker}
                            dropdownIconColor={Colors.textPrimary} // Ustawienie stałego koloru dla ikony dropdown
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
                </View>
            )}

            <SearchBar
                placeholder="Szukaj po nazwie lub opisie..."
                value={searchQuery}
                onChangeText={setSearchQuery}
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

            <FlatList
                style={styles.list}
                data={processedAndSortedArchivedTasks}
                renderItem={renderArchivedTask}
                keyExtractor={item => item.id}
                ListEmptyComponent={
                    <EmptyState
                        icon={searchQuery || filterCompletedFromDate || filterCompletedToDate || activeCategoryArchive !== 'all' || archivedTaskType !== 'all' || selectedPartnerId !== 'all' ? "search" : "archive"}
                        title={searchQuery || filterCompletedFromDate || filterCompletedToDate || activeCategoryArchive !== 'all' || archivedTaskType !== 'all' || selectedPartnerId !== 'all' ? "Brak wyników" : "Archiwum jest puste"}
                        subtitle={searchQuery ? `Nie znaleziono zarchiwizowanych zadań dla frazy "${searchQuery}"` : "Ukończone zadania, które zarchiwizujesz, pojawią się tutaj."}
                    />
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    list: {
        flex: 1,
    },
    taskContainer: {
        backgroundColor: 'white',
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
        color: Colors.textPrimary,
    },
    taskDescription: {
        fontSize: Typography.small.fontSize + 2, // 14
        color: Colors.textSecondary,
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
        color: Colors.textSecondary,
        fontStyle: 'italic',
        marginRight: Spacing.small, // 8
    },
    sharedInfoText: {
        fontSize: Typography.small.fontSize, // 12
        color: Colors.primary,
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
        color: Colors.textSecondary,
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
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderColor: Colors.border,
    },
    taskTypeButton: {
        flex: 1,
        marginHorizontal: Spacing.xSmall, // 5
        backgroundColor: Colors.light,
    },
    taskTypeButtonActive: {
        backgroundColor: Colors.primary,
    },
    taskTypeButtonTextActive: {
        color: 'white',
    },
    taskTypeButtonText: {
        color: Colors.textSecondary,
        fontWeight: Typography.bold.fontWeight,
        fontSize: Typography.body.fontSize,
    },
    partnerFilterContainer: {
        backgroundColor: 'white',
        paddingHorizontal: Spacing.medium,
        paddingTop: Spacing.small,
        paddingBottom: Spacing.xSmall, // 5
        borderBottomWidth: 1,
        borderColor: Colors.border,
    },
    partnerFilterLabel: {
        fontSize: Typography.body.fontSize,
        fontWeight: Typography.semiBold.fontWeight,
        color: Colors.textSecondary,
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