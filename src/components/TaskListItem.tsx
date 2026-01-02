import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Task, Category } from '../types';
import { Spacing, Typography, Colors } from '../styles/AppStyles';
import { useTheme } from '../contexts/ThemeContext';
import PriorityIndicator from './PriorityIndicator';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface Props {
    task: Task;
    category?: Category;
    onPress: (task: Task) => void;
    onLongPress: (task: Task) => void;
    onToggleComplete: (task: Task) => void;
    onConfirmAction: (task: Task) => void;
    isCompact: boolean;
    selectionMode: boolean;
    selected: boolean;
    onToggleSelect: (task: Task) => void;
    onOpenMenu?: (task: Task) => void;
    pinned: boolean;
    onTogglePinned?: (task: Task) => void;
    highlightQuery?: string;
}

const TaskListItem = React.memo(({
    task,
    category,
    onPress,
    onLongPress,
    onToggleComplete,
    isCompact,
    selectionMode,
    selected,
    onToggleSelect,
    onOpenMenu,
    pinned,
    onTogglePinned,
    highlightQuery
}: Props) => {
    const theme = useTheme();

    const deadlineText = useMemo(() => {
        if (!task.deadline) return null;
        const d = (task.deadline as any).toDate ? (task.deadline as any).toDate() : new Date(task.deadline as any);
        return format(d, 'EEE, d MMM', { locale: pl });
    }, [task.deadline]);

    const isOverdue = useMemo(() => {
        if (!task.deadline || task.completed) return false;
        const d = (task.deadline as any).toDate ? (task.deadline as any).toDate() : new Date(task.deadline as any);
        return d < new Date();
    }, [task.deadline, task.completed]);

    const difficultyColor = (diff: number) => {
        if (diff <= 3) return theme.colors.success;
        if (diff <= 7) return theme.colors.warning;
        return theme.colors.danger;
    };

    return (
        <TouchableOpacity
            onPress={() => selectionMode ? onToggleSelect(task) : onPress(task)}
            onLongPress={() => onLongPress(task)}
            activeOpacity={0.7}
            style={[
                styles.container,
                {
                    backgroundColor: selected ? `${theme.colors.primary}20` : 'transparent',
                }
            ]}
        >
            <TouchableOpacity onPress={() => onToggleComplete(task)} style={styles.checkContainer}>
                <View style={[
                    styles.checkbox,
                    { borderColor: task.completed ? theme.colors.success : theme.colors.textSecondary },
                    task.completed && { backgroundColor: theme.colors.success, borderColor: theme.colors.success }
                ]}>
                    {task.completed && <Feather name="check" size={14} color="white" />}
                </View>
            </TouchableOpacity>

            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <Text
                        numberOfLines={1}
                        style={[
                            styles.title,
                            { color: task.completed ? theme.colors.textSecondary : theme.colors.textPrimary },
                            task.completed && styles.completedText
                        ]}
                    >
                        {task.text}
                    </Text>
                    {pinned && <Feather name="map-pin" size={12} color={theme.colors.primary} style={{ marginLeft: 6 }} />}
                </View>

                <View style={styles.metaRow}>
                    {category && (
                        <View style={[styles.pill, { backgroundColor: `${category.color}20` }]}>
                            <View style={[styles.dot, { backgroundColor: category.color }]} />
                            <Text style={[styles.pillText, { color: category.color }]}>{category.name}</Text>
                        </View>
                    )}

                    {deadlineText && (
                        <View style={[styles.pill, { backgroundColor: isOverdue ? `${theme.colors.danger}15` : theme.colors.inputBackground }]}>
                            <Feather name="clock" size={10} color={isOverdue ? theme.colors.danger : theme.colors.textSecondary} style={{ marginRight: 4 }} />
                            <Text style={[styles.pillText, { color: isOverdue ? theme.colors.danger : theme.colors.textSecondary }]}>{deadlineText}</Text>
                        </View>
                    )}

                    {task.difficulty && (
                        <View style={[styles.pill, { backgroundColor: `${difficultyColor(task.difficulty)}15` }]}>
                            <Text style={[styles.pillText, { color: difficultyColor(task.difficulty) }]}>Lv {task.difficulty}</Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.actions}>
                {onOpenMenu && !selectionMode && (
                    <TouchableOpacity onPress={() => onOpenMenu(task)} style={{ padding: 4 }}>
                        <Feather name="more-vertical" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                )}
                {onTogglePinned && !selectionMode && !pinned && ( // Show pin option if not pinned (contextual) or just keep menu
                    null
                )}
                <PriorityIndicator priority={task.basePriority || 3} />
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center', // Center vertically
        paddingVertical: 2, // Spacing handled by parent wrapper mainly
    },
    checkContainer: {
        paddingRight: Spacing.medium,
        paddingVertical: Spacing.small,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    completedText: {
        textDecorationLine: 'line-through',
        opacity: 0.7,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 4,
    },
    pillText: {
        fontSize: 11,
        fontWeight: '600',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingLeft: Spacing.small,
    }
});

export default TaskListItem;
