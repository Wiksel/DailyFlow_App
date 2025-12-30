import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal, ScrollView } from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useCategories } from '../contexts/CategoryContext';
import TaskForm, { TaskFormData } from '../components/TaskForm';

interface AddTaskModalProps {
    visible: boolean;
    onClose: () => void;
    onAddTask: (taskData: any) => void;
    initialCategory: string;
}

const AddTaskModal = ({ visible, onClose, onAddTask, initialCategory }: AddTaskModalProps) => {
    const { categories } = useCategories();

    const [taskData, setTaskData] = useState<TaskFormData>({
        text: '',
        description: '',
        category: initialCategory,
        basePriority: 3,
        difficulty: 1,
        deadline: null,
    });
    
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        if (categories.find(c => c.id === initialCategory)) {
            setTaskData(prev => ({ ...prev, category: initialCategory }));
        } else if (categories.length > 0) {
            setTaskData(prev => ({ ...prev, category: categories[0].id }));
        }
    }, [initialCategory, categories, visible]); // Dodajemy 'visible', by resetować kategorię przy każdym otwarciu

    const resetForm = () => {
         setTaskData({
            text: '',
            description: '',
            category: initialCategory,
            basePriority: 3,
            difficulty: 1,
            deadline: null,
        });
    };

    const handleSave = () => {
        if (!taskData.text.trim()) {
            alert("Nazwa zadania nie może być pusta.");
            return;
        }
        onAddTask(taskData);
        resetForm();
        onClose(); // Zamykamy modal po zapisaniu
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
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
            accessibilityViewIsModal={true}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle} accessibilityRole="header">Nowe zadanie</Text>
                    <TouchableOpacity
                        onPress={onClose}
                        accessibilityRole="button"
                        accessibilityLabel="Anuluj dodawanie zadania"
                    >
                        <Text style={styles.closeButtonText}>Anuluj</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.form}>
                    <TaskForm 
                        taskData={taskData}
                        onDataChange={handleDataChange}
                        showDatePicker={showDatePicker}
                        onShowDatePicker={() => setShowDatePicker(true)}
                        onDatePickerChange={onDateChange}
                    />
                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleSave}
                        accessibilityRole="button"
                        accessibilityLabel="Zapisz zadanie"
                    >
                        <Text style={styles.saveButtonText}>Dodaj zadanie</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderColor: '#eee' },
    headerTitle: { fontSize: 22, fontWeight: 'bold' },
    closeButtonText: { fontSize: 16, color: '#0782F9' },
    form: { paddingHorizontal: 20, flex: 1, paddingBottom: 20 },
    saveButton: { backgroundColor: '#28a745', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
    saveButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});

export default AddTaskModal;