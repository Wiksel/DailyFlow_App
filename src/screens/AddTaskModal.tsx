import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal, ScrollView } from 'react-native';
import { Timestamp } from '../utils/firestoreCompat';
import { useToast } from '../contexts/ToastContext';
import { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useCategories } from '../contexts/CategoryContext';
import TaskForm, { TaskFormData } from '../components/TaskForm';
import AppHeader from '../components/AppHeader';
import ActionModal from '../components/ActionModal';
import { useTheme } from '../contexts/ThemeContext';

interface AddTaskModalProps {
    visible: boolean;
    onClose: () => void;
    onAddTask: (taskData: any) => void;
    initialCategory: string;
    initialDeadline?: Timestamp | null;
}

const AddTaskModal = ({ visible, onClose, onAddTask, initialCategory, initialDeadline = null }: AddTaskModalProps) => {
    const { categories, loading } = useCategories();
    const { showToast } = useToast();
    const theme = useTheme();

    const [taskData, setTaskData] = useState<TaskFormData>({
        text: '',
        description: '',
        category: initialCategory,
        basePriority: 3,
        difficulty: 1,
        deadline: initialDeadline ?? null,
    });

    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        if (!visible) return;
        if (categories.find(c => c.id === initialCategory)) {
            setTaskData(prev => ({ ...prev, category: initialCategory, deadline: initialDeadline ?? prev.deadline }));
        } else if (categories.length > 0) {
            setTaskData(prev => ({ ...prev, category: categories[0].id, deadline: initialDeadline ?? prev.deadline }));
        }
    }, [initialCategory, initialDeadline, categories, visible]);

    const resetForm = () => {
        setTaskData({
            text: '',
            description: '',
            category: initialCategory,
            basePriority: 3,
            difficulty: 1,
            deadline: initialDeadline ?? null,
        });
    };

    const handleSave = () => {
        if (!taskData.text.trim()) {
            showToast('Nazwa zadania nie może być pusta.', 'error');
            return;
        }
        onAddTask(taskData);
        resetForm();
        onClose();
    };

    const handleDataChange = <K extends keyof TaskFormData>(key: K, value: TaskFormData[K]) => {
        setTaskData(prev => ({ ...prev, [key]: value }));
    };

    const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate && event.type === 'set') {
            handleDataChange('deadline', Timestamp.fromDate(selectedDate));
        }
    };

    return (
        <ActionModal
            visible={visible}
            title="Nowe zadanie"
            onRequestClose={() => { resetForm(); onClose(); }}
            actions={[
                { text: 'Anuluj', variant: 'secondary', onPress: () => { resetForm(); onClose(); } },
                { text: 'Dodaj zadanie', variant: 'primary', onPress: handleSave },
            ]}
        >
            <View style={[styles.form, { backgroundColor: theme.colors.card }]}>
                {loading && <Text style={{ color: theme.colors.textSecondary, padding: 8 }}>Ładowanie kategorii…</Text>}
                {!loading && (
                    <TaskForm
                        taskData={taskData}
                        onDataChange={handleDataChange}
                        showDatePicker={showDatePicker}
                        onShowDatePicker={() => setShowDatePicker(true)}
                        onDatePickerChange={onDateChange}
                    />
                )}
            </View>
        </ActionModal>
    );
};

const styles = StyleSheet.create({
    form: {
        paddingHorizontal: 0,
        width: '100%',
        minHeight: 400, // Force height to prevent collapse
        paddingBottom: 12
    },
});

export default AddTaskModal;
