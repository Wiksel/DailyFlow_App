import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Alert, FlatList, TextInput } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { doc, getDoc, updateDoc, Timestamp, collection, query, where, getDocs, addDoc, onSnapshot, orderBy } from '../utils/firestoreCompat';
import auth, { getAuth } from '@react-native-firebase/auth';
import { db } from '../../firebaseConfig';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { TaskStackParamList, TaskStackNavigationProp } from '../types/navigation';
import TaskForm, { TaskFormData } from '../components/TaskForm';
import { UserProfile, Comment } from '../types';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useToast } from '../contexts/ToastContext';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import AppHeader from '../components/AppHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

type TaskDetailScreenProps = NativeStackScreenProps<TaskStackParamList, 'TaskDetail'>;

const TaskDetailScreen = () => {
    const route = useRoute<TaskDetailScreenProps['route']>();
    const navigation = useNavigation<TaskStackNavigationProp>();
    const { taskId } = route.params;

    const [task, setTask] = useState<TaskFormData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const currentUser = getAuth().currentUser;

    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [isSavingTask, setIsSavingTask] = useState(false);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const { showToast } = useToast();
    const insets = useSafeAreaInsets();
    const theme = useTheme();

    const commentsFlatListRef = useRef<FlatList<Comment>>(null);

    useEffect(() => {
        const taskUnsubscribe = onSnapshot(doc(db, 'tasks', taskId), (taskSnap) => {
            if (taskSnap.exists()) {
                const data = taskSnap.data();
                setTask({
                    text: data.text || '',
                    description: data.description || '',
                    category: data.category || '',
                    basePriority: data.basePriority || 3,
                    difficulty: data.difficulty || 1,
                    deadline: data.deadline || null,
                });
            } else {
                showToast("Nie znaleziono zadania lub zostało ono usunięte.", 'error');
                navigation.goBack();
            }
            if (loading) setLoading(false);
        }, (error) => {
            console.error("Błąd nasłuchiwania zadania:", error);
            showToast("Błąd pobierania danych zadania.", 'error');
            navigation.goBack();
        });

        const fetchUserProfile = async () => {
            if (currentUser) {
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (userDoc.exists()) {
                    setUserProfile(userDoc.data() as UserProfile);
                }
            }
        };

        fetchUserProfile();

        const commentsRef = collection(db, 'tasks', taskId, 'comments');
        const q = query(commentsRef, orderBy('createdAt', 'asc'));

        const commentsUnsubscribe = onSnapshot(q, (snapshot) => {
            const commentsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Comment));
            setComments(commentsData);
            setTimeout(() => commentsFlatListRef.current?.scrollToEnd({ animated: true }), 100);
        });

        return () => {
            taskUnsubscribe();
            commentsUnsubscribe();
        };
    }, [taskId, navigation, currentUser]);

    const handleAddComment = async () => {
        if (!newComment.trim() || !currentUser || !userProfile) return;

        setIsSubmittingComment(true);
        try {
            await addDoc(collection(db, 'tasks', taskId, 'comments'), {
                text: newComment.trim(),
                authorId: currentUser.uid,
                authorNickname: userProfile.nickname || 'Anonim',
                createdAt: Timestamp.now(),
            });
            setNewComment('');
            showToast("Komentarz dodany!", 'success');
        } catch (error) {
            console.error("Błąd dodawania komentarza: ", error);
            showToast("Nie udało się dodać komentarza.", 'error');
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleUpdate = async () => {
        if (!task) return;
        setIsSavingTask(true);
        try {
            try {
                await updateDoc(doc(db, 'tasks', taskId), { ...task });
            } catch {
                try { const { enqueueUpdate } = await import('../utils/offlineQueue'); await enqueueUpdate(`tasks/${taskId}`, { ...task }); } catch {}
            }
            showToast("Zadanie zaktualizowane.", 'success');
            navigation.goBack();
        } catch (error) {
            console.error("Błąd aktualizacji zadania: ", error);
            showToast("Nie udało się zaktualizować zadania.", 'error');
        } finally {
            setIsSavingTask(false);
        }
    };

    const handleSaveAsTemplate = async () => {
        if (!task || !currentUser) return;
        setIsSavingTemplate(true);
        try {
            const templatesRef = collection(db, 'choreTemplates');
            const q = query(templatesRef, where("userId", "==", currentUser.uid), where("name", "==", task.text));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                showToast("Szablon o tej nazwie już istnieje.", 'error');
                setIsSavingTemplate(false); // ZMIANA: Zakończ ładowanie w przypadku błędu
                return;
            }

            const newTemplateRef = await addDoc(templatesRef, {
                name: task.text,
                difficulty: task.difficulty,
                category: task.category,
                userId: currentUser.uid,
            });
            showToast(`Zadanie "${task.text}" zostało zapisane \njako nowy szablon.`, 'success');
            navigation.navigate('ChoreTemplates', { templateId: newTemplateRef.id });
        } catch (error: any) {
            console.error("Błąd zapisu szablonu: ", error);
            showToast(`Nie udało się zapisać szablonu: ${error.message}`, 'error');
        } finally {
            setIsSavingTemplate(false);
        }
    };

    const handleDataChange = <K extends keyof TaskFormData>(key: K, value: TaskFormData[K]) => {
        setTask(prev => prev ? { ...prev, [key]: value } : null);
    };

    const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (event.type === 'set' && selectedDate) {
            const today = new Date();
            today.setHours(0,0,0,0);
            const picked = new Date(selectedDate);
            picked.setHours(0,0,0,0);
            // prosta walidacja: nie pozwalaj na daty w przeszłości bez potwierdzenia; ustaw dzisiaj jeśli przeszłość
            const finalDate = picked.getTime() < today.getTime() ? today : picked;
            handleDataChange('deadline', Timestamp.fromDate(finalDate));
        }
    };

    if (loading || !task) {
        return <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
    }

    const renderComment = ({ item }: { item: Comment }) => (
        <View style={[styles.commentContainer, { backgroundColor: theme.colors.inputBackground }]}>
            <View style={styles.commentHeader}>
                <Text style={[styles.commentAuthor, { color: theme.colors.textPrimary }]}>{item.authorNickname}</Text>
                <Text style={[styles.commentDate, { color: theme.colors.textSecondary }]}>{item.createdAt.toDate().toLocaleString('pl-PL')}</Text>
            </View>
            <Text style={[styles.commentText, { color: theme.colors.textPrimary }]}>{item.text}</Text>
        </View>
    );

    const ACTION_BAR_HEIGHT = 96;

    return (
        <View style={[GlobalStyles.container, styles.screenPadding, { backgroundColor: theme.colors.background }]}>
            <AppHeader title="Szczegóły zadania" leftAction={{ icon: 'arrow-left', onPress: () => navigation.goBack(), accessibilityLabel: 'Wstecz' }} />
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: ACTION_BAR_HEIGHT + insets.bottom + Spacing.medium }}
                keyboardShouldPersistTaps="handled"
            >
                <TaskForm
                    taskData={task}
                    onDataChange={handleDataChange}
                    showDatePicker={showDatePicker}
                    onShowDatePicker={() => setShowDatePicker(true)}
                    onDatePickerChange={onDateChange}
                />

                <View style={styles.commentsSection}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Komentarze</Text>
                    <FlatList
                        ref={commentsFlatListRef}
                        data={comments}
                        renderItem={renderComment}
                        keyExtractor={item => item.id}
                        ListEmptyComponent={<Text style={styles.emptyCommentText}>Brak komentarzy. Bądź pierwszy!</Text>}
                        scrollEnabled={false}
                    />
                    <View style={styles.addCommentContainer}>
                        <TextInput
                            style={[styles.commentInput, { backgroundColor: theme.colors.inputBackground, color: theme.colors.textPrimary }]}
                            placeholder="Dodaj komentarz..."
                            value={newComment}
                            onChangeText={setNewComment}
                            multiline
                            placeholderTextColor={theme.colors.placeholder}
                        />
                        <TouchableOpacity style={[styles.commentButton, { backgroundColor: theme.colors.primary }, isSubmittingComment && styles.commentButtonDisabled]} onPress={handleAddComment} disabled={isSubmittingComment} accessibilityLabel="Wyślij komentarz">
                            {isSubmittingComment ? <ActivityIndicator color="white" /> : <Feather name="send" size={22} color="white" />}
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            <View style={[styles.actionBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, paddingBottom: insets.bottom + Spacing.xSmall }]}> 
                <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.colors.success }]} onPress={async () => { try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}; await handleUpdate(); }} disabled={isSavingTask}>
                    {isSavingTask ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Zapisz zmiany</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.templateButton, { backgroundColor: theme.colors.info }]} onPress={async () => { try { await Haptics.selectionAsync(); } catch {}; await handleSaveAsTemplate(); }} disabled={isSavingTemplate}>
                    {isSavingTemplate ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Zapisz jako szablon</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    screenPadding: {
        paddingHorizontal: Spacing.medium,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    actionsContainer: {
        paddingVertical: Spacing.large
    },
    actionBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
        borderTopWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: Spacing.medium,
        paddingTop: Spacing.small,
        // cień
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        elevation: 10,
    },
    saveButton: {
        ...GlobalStyles.button,
        backgroundColor: Colors.success,
    },
    buttonText: {
        color: 'white',
        fontSize: Typography.h3.fontSize,
        fontWeight: Typography.bold.fontWeight
    },
    templateButton: {
        ...GlobalStyles.button,
        backgroundColor: Colors.info,
        marginTop: Spacing.small
    },
    commentsSection: {
        marginTop: Spacing.large,
        paddingTop: Spacing.large,
        borderTopWidth: 1,
        borderColor: Colors.border,
        paddingBottom: Spacing.xLarge,
    },
    sectionTitle: {
        fontSize: Typography.h3.fontSize,
        fontWeight: Typography.bold.fontWeight,
        marginBottom: Spacing.medium,
    },
    commentContainer: {
        backgroundColor: Colors.light,
        borderRadius: 8,
        padding: Spacing.small,
        marginBottom: Spacing.small,
    },
    commentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.xSmall,
    },
    commentAuthor: {
        fontWeight: Typography.bold.fontWeight,
        color: Colors.dark,
    },
    commentDate: {
        fontSize: Typography.small.fontSize,
        color: Colors.textSecondary,
    },
    commentText: {
        fontSize: Typography.body.fontSize,
        color: Colors.textPrimary,
    },
    emptyCommentText: {
        textAlign: 'center',
        color: Colors.textSecondary,
        fontStyle: 'italic',
    },
    addCommentContainer: {
        flexDirection: 'row',
        marginTop: Spacing.medium,
        alignItems: 'center',
    },
    commentInput: {
        flex: 1,
        backgroundColor: Colors.inputBackground,
        borderRadius: 20,
        paddingHorizontal: Spacing.medium,
        paddingVertical: Spacing.small,
        minHeight: 44,
        maxHeight: 120,
        marginRight: Spacing.small,
        fontSize: Typography.body.fontSize,
        color: Colors.textPrimary,
    },
    commentButton: {
        backgroundColor: Colors.primary,
        borderRadius: 22,
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    commentButtonDisabled: {
        backgroundColor: Colors.disabled,
    },
});

export default TaskDetailScreen;