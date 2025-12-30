import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Timestamp } from 'firebase/firestore';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import PrioritySelector from './PrioritySelector';
import { useCategories } from '../contexts/CategoryContext';
import { Feather } from '@expo/vector-icons'; // <-- Dodaj ten import
import { Colors, Spacing, Typography, GlobalStyles, isColorLight } from '../styles/AppStyles'; // <-- Dodaj ten import

// Definiujemy typ danych, którymi będzie zarządzał formularz
export interface TaskFormData {
    text: string;
    description: string;
    category: string;
    basePriority: number;
    difficulty: number;
    deadline: Timestamp | null;
}

interface TaskFormProps {
    taskData: TaskFormData;
    onDataChange: <K extends keyof TaskFormData>(key: K, value: TaskFormData[K]) => void;
    showDatePicker: boolean;
    onDatePickerChange: (event: DateTimePickerEvent, selectedDate?: Date) => void;
    onShowDatePicker: () => void;
}

const TaskForm = ({ taskData, onDataChange, showDatePicker, onDatePickerChange, onShowDatePicker }: TaskFormProps) => {
    const { categories } = useCategories();

    return (
        <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Nazwa zadania</Text>
            <TextInput
                style={styles.input}
                value={taskData.text}
                onChangeText={(text) => onDataChange('text', text)}
                placeholderTextColor={Colors.placeholder}
                accessibilityLabel="Wpisz nazwę zadania"
            />

            <Text style={styles.label}>Opis (opcjonalnie)</Text>
            <TextInput
                style={[styles.input, styles.multilineInput]}
                value={taskData.description}
                onChangeText={(text) => onDataChange('description', text)}
                multiline
                placeholderTextColor={Colors.placeholder}
                accessibilityLabel="Wpisz opis zadania"
            />

            <Text style={styles.label}>Kategoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryContainer}>
                {categories.map(cat => (
                    <TouchableOpacity
                        key={cat.id}
                        style={[
                            styles.categoryButton,
                            { backgroundColor: cat.color },
                            taskData.category === cat.id && styles.categorySelected
                        ]}
                        onPress={() => onDataChange('category', cat.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Kategoria ${cat.name}`}
                        accessibilityState={{ selected: taskData.category === cat.id }}
                    >
                        <Text
                            style={[
                                styles.categoryText,
                                isColorLight(cat.color) ? { color: Colors.textPrimary } : { color: 'white' }
                            ]}
                        >
                            {cat.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <Text style={styles.label}>Skala trudności ({taskData.difficulty})</Text>
            <Slider
                style={GlobalStyles.slider}
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={taskData.difficulty}
                onValueChange={(value) => onDataChange('difficulty', value)}
                minimumTrackTintColor={Colors.primary}
                maximumTrackTintColor={Colors.border}
                thumbTintColor={Colors.primary}
                accessibilityLabel="Suwak trudności zadania"
                accessibilityValue={{ min: 1, max: 10, now: taskData.difficulty }}
            />

            <Text style={styles.label}>Priorytet bazowy</Text>
            <PrioritySelector
                value={taskData.basePriority}
                onSelect={(p) => onDataChange('basePriority', p)}
            />

            <Text style={styles.label}>Termin wykonania</Text>
            <TouchableOpacity
                onPress={onShowDatePicker}
                style={styles.datePickerButton}
                accessibilityRole="button"
                accessibilityLabel={taskData.deadline ? `Termin wykonania: ${taskData.deadline.toDate().toLocaleDateString('pl-PL')}` : "Wybierz termin wykonania"}
            >
                <Text style={styles.datePickerText}>{taskData.deadline ? taskData.deadline.toDate().toLocaleDateString('pl-PL') : 'Ustaw termin'}</Text>
            </TouchableOpacity>
            {taskData.deadline && (
                <TouchableOpacity
                    onPress={() => onDataChange('deadline', null)}
                    style={styles.removeDateButton}
                    accessibilityRole="button"
                    accessibilityLabel="Usuń termin wykonania"
                >
                    <Feather name="x-circle" size={24} color={Colors.danger} />
                </TouchableOpacity>
            )}
            {showDatePicker && <DateTimePicker value={taskData.deadline ? taskData.deadline.toDate() : new Date()} mode="date" display="default" onChange={onDatePickerChange} />}

        </ScrollView>
    );
};

const styles = StyleSheet.create({
    formContainer: {
        flex: 1,
        paddingTop: Spacing.small,
    },
    label: {
        fontSize: Typography.body.fontSize,
        fontWeight: Typography.semiBold.fontWeight,
        color: Colors.textSecondary,
        marginTop: Spacing.large,
        marginBottom: Spacing.small,
    },
    input: {
        ...GlobalStyles.input,
    },
    multilineInput: {
        height: 100,
        textAlignVertical: 'top',
    },
    categoryContainer: {
        flexDirection: 'row',
        paddingVertical: Spacing.xSmall,
    },
    categoryButton: {
        paddingVertical: Spacing.xSmall,
        paddingHorizontal: Spacing.medium,
        borderRadius: 20,
        marginRight: Spacing.small,
        opacity: 0.7,
    },
    categorySelected: {
        opacity: 1,
        transform: [{ scale: 1.05 }],
        elevation: 2,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
    },
    categoryText: {
        fontWeight: Typography.bold.fontWeight,
    },
    datePickerButton: {
        backgroundColor: Colors.inputBackground,
        borderRadius: 8,
        padding: Spacing.medium,
    },
    datePickerText: {
        fontSize: Typography.body.fontSize,
        color: Colors.textPrimary,
    },
    removeDateButton: {
        alignSelf: 'center',
        marginTop: Spacing.small,
        padding: Spacing.small,
    },
});

export default TaskForm;