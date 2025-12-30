import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Task, Category } from '../types';
import PriorityIndicator from './PriorityIndicator';
import { Colors, Spacing, Typography } from '../styles/AppStyles';

interface TaskItemProps {
    task: Task;
    category?: Category;
    onPress: (taskId: string) => void;
    onToggleComplete: (task: Task) => void;
    onAction: (task: Task) => void;
}

const TaskItem = ({ task, category, onPress, onToggleComplete, onAction }: TaskItemProps) => {
    return (
        <TouchableOpacity onPress={() => onPress(task.id)}>
            <View style={[
                styles.taskContainer,
                task.completed && styles.taskContainerCompleted,
                task.priority >= 4 && { borderLeftWidth: 4, borderLeftColor: Colors.danger },
                task.priority === 3 && { borderLeftWidth: 3, borderLeftColor: Colors.warning },
                task.priority < 3 && { borderLeftWidth: 2, borderLeftColor: Colors.success },
            ]}>
                <TouchableOpacity onPress={() => onToggleComplete(task)} style={styles.checkboxTouchable}>
                    <View style={[styles.checkbox, task.completed && styles.checkboxCompleted]}>
                        {task.completed && <Feather name="check" size={18} color="white" />}
                    </View>
                </TouchableOpacity>
                <View style={styles.taskContent}>
                    <Text style={[styles.taskText, task.completed && styles.taskTextCompleted]}>{task.text}</Text>
                    {!!task.description && <Text style={styles.descriptionText} numberOfLines={3}>{task.description}</Text>}
                    <View style={styles.taskMetaContainer}>
                        {category && <View style={[styles.categoryTag, {backgroundColor: category.color}]}><Text style={styles.categoryTagText}>{category.name}</Text></View>}
                        {task.isShared && <Text style={styles.creatorText}>od: {task.creatorNickname}</Text>}
                    </View>
                    {task.completed && task.completedBy ? (
                        <Text style={styles.completedText}>
                            Wykonane przez: {task.completedBy} {task.completedAt?.toDate().toLocaleDateString('pl-PL')}
                        </Text>
                    ) : (
                        task.createdAt && <Text style={styles.createdText}>
                            Dodano: {task.createdAt?.toDate().toLocaleDateString('pl-PL')}
                        </Text>
                    )}
                    {task.deadline && !task.completed && <Text style={styles.deadlineText}>Termin: {task.deadline.toDate().toLocaleDateString('pl-PL')}</Text>}
                </View>
                <View style={styles.rightSection}>
                    <PriorityIndicator priority={task.priority} />
                    <TouchableOpacity onPress={() => onAction(task)} style={styles.actionButton}>
                        <Feather name={task.completed ? "archive" : "trash-2"} size={20} color={task.completed ? Colors.textSecondary : Colors.danger} />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
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
});

export default memo(TaskItem);
