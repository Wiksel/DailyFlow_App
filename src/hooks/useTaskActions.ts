import { useCallback } from 'react';
import { getAuth } from '@react-native-firebase/auth';
import { collection, addDoc, updateDoc, deleteDoc, doc, increment, Timestamp } from '../utils/firestoreCompat';
import { db } from '../../firebaseConfig';
import { enqueueAdd, enqueueUpdate, enqueueDelete } from '../utils/offlineQueue';
import { Task, UserProfile } from '../types';
import { useToast } from '../contexts/ToastContext';
import * as Haptics from 'expo-haptics';
import { Vibration } from 'react-native';

export const useTaskActions = () => {
    const { showToast } = useToast();
    const currentUser = getAuth().currentUser;

    const addTask = useCallback(async (
        taskData: Partial<Task>,
        userProfile: UserProfile | null,
        taskType: 'personal' | 'shared'
    ) => {
        if (!currentUser) return;

        try {
            if (taskType === 'shared' && !userProfile?.pairId) {
                showToast('Musisz być w parze, \naby dodawać wspólne zadania.', 'info');
                return null;
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

            let newId = null;
            try {
                const ref = await addDoc(collection(db, 'tasks'), payload);
                newId = ref.id;
            } catch {
                await enqueueAdd('tasks', payload);
            }

            showToast("Zadanie dodane!", 'success');
            return newId;
        } catch (error) {
            console.error("Błąd dodawania zadania: ", error);
            showToast("Nie udało się dodać zadania.", 'error');
            return null;
        }
    }, [currentUser, showToast]);

    const toggleCompleteTask = useCallback(async (task: Task, userProfile: UserProfile | null) => {
        if (!currentUser || !userProfile) return;

        try {
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

            try {
                await updateDoc(userRef, {
                    points: increment(isCompleting ? 10 : -10),
                    completedTasksCount: increment(isCompleting ? 1 : -1)
                });
            } catch {
                await enqueueUpdate(`users/${currentUser.uid}`, userUpdate as any);
            }

            // Haptic Feedback
            try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }
            catch { try { Vibration.vibrate(10); } catch { } }

            showToast(isCompleting ? "Zadanie ukończone!" : "Cofnięto ukończenie zadania.", 'success');
        } catch (error) {
            console.error("Błąd zmiany statusu zadania", error);
            showToast("Wystąpił błąd podczas zmiany statusu.", 'error');
        }
    }, [currentUser, showToast]);

    const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
        try {
            const taskRef = doc(db, 'tasks', taskId);
            try { await updateDoc(taskRef, updates); }
            catch { await enqueueUpdate(`tasks/${taskId}`, updates); }
            showToast("Zaktualizowano zadanie.", 'success');
        } catch (error) {
            console.error("Błąd aktualizacji zadania:", error);
            showToast("Nie udało się zaktualizować.", 'error');
        }
    }, [showToast]);

    const deleteTask = useCallback(async (taskId: string) => {
        try {
            const taskRef = doc(db, 'tasks', taskId);
            try {
                await deleteDoc(taskRef);
            } catch {
                await enqueueDelete(`tasks/${taskId}`);
            }
            showToast("Zadanie usunięte.", 'success');
        } catch (error) {
            console.error("Błąd usuwania zadania:", error);
            showToast("Nie udało się usunąć zadania.", 'error');
        }
    }, [showToast]);

    // Archive task (soft delete / status change) - inferred from "Archiwizuj" action
    const archiveTask = useCallback(async (taskId: string) => {
        try {
            const taskRef = doc(db, 'tasks', taskId);
            const updates = { status: 'archived' };
            try { await updateDoc(taskRef, updates); }
            catch { await enqueueUpdate(`tasks/${taskId}`, updates); }
            showToast("Zadanie zarchiwizowane.", 'success');
        } catch (error) {
            console.error("Błąd archiwizacji:", error);
            showToast("Nie udało się zarchiwizować.", 'error');
        }
    }, [showToast]);

    return { addTask, toggleCompleteTask, updateTask, deleteTask, archiveTask };
};
