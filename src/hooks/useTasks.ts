import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from '../utils/authCompat';
import { collection, query, where, onSnapshot, Timestamp, db } from '../utils/firestoreCompat';
import { Task, UserProfile } from '../types';
import { scheduleTaskNotifications } from '../utils/notifications';

const CACHED_TASKS_KEY = 'dailyflow_cached_tasks';

type SerializableTask = Omit<Task, 'createdAt' | 'deadline' | 'completedAt'> & {
    createdAt: string | null;
    deadline: string | null;
    completedAt: string | null;
};

export const useTasks = (
    taskType: 'personal' | 'shared',
    userProfile: UserProfile | null
) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const currentUser = getAuth().currentUser;

    // Load from cache initially
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
                    setTasks(tasksWithDates);
                }
            } catch (e) {
                console.error("Failed to load tasks from cache.", e);
            }
        };
        if (currentUser) {
            loadTasksFromCache();
        }
    }, [currentUser]);

    // Firestore Subscription
    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }

        // For shared tasks, we need a pairId. If not present, we can't fetch.
        if (taskType === 'shared' && !userProfile?.pairId) {
            setTasks([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const tasksCollection = collection(db, 'tasks');
        let q;

        if (taskType === 'personal') {
            q = query(tasksCollection, where("userId", "==", currentUser.uid), where("status", "==", "active"));
        } else {
            // Safe to assert pairId here because of check above
            q = query(tasksCollection, where("pairId", "==", userProfile!.pairId), where("status", "==", "active"));
        }

        console.log(`Subscribing to ${taskType} tasks...`); // Debug log

        const unsubscribe = onSnapshot(q, async (snapshot: any) => {
            const tasksData = snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as Task));
            setTasks(tasksData);

            // Cache updates
            try {
                const serializableTasks = tasksData.map((t: Task) => ({
                    ...t,
                    createdAt: t.createdAt?.toDate().toISOString(),
                    deadline: t.deadline?.toDate().toISOString(),
                    completedAt: t.completedAt?.toDate().toISOString(),
                }));
                await AsyncStorage.setItem(`${CACHED_TASKS_KEY}_${currentUser?.uid}`, JSON.stringify(serializableTasks));
            } catch (e) {
                console.error("Failed to cache tasks.", e);
            }

            // Schedule notifications
            try {
                await scheduleTaskNotifications(tasksData, userProfile);
            } catch { }

            setLoading(false);
        }, (error) => {
            console.error("Firestore subscription error: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser, taskType, userProfile?.pairId]);

    return { tasks, loading };
};
