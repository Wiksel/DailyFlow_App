import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Task, Category } from '../types';
import { Spacing, Typography, Colors, Glass, Effects } from '../styles/AppStyles';
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
    isCompact?: boolean;
    selectionMode: boolean;
    selected: boolean;
    onToggleSelect: (task: Task) => void;
    onOpenMenu?: (task: Task) => void;
    pinned: boolean;
    highlightQuery?: string;
}

const ModernTaskItem = React.memo(({
    task,
    category,
    onPress,
    onLongPress,
    onToggleComplete,
    isCompact = false,
    selectionMode,
    selected,
    onToggleSelect,
    onOpenMenu,
    pinned,
}: Props) => {
    const theme = useTheme();
    const isDark = theme.colorScheme === 'dark';
    const glassStyle = isDark ? Glass.dark : Glass.light;
    const [isExpanded, setIsExpanded] = React.useState(false);

    const deadlineText = useMemo(() => {
        if (!task.deadline) return null;
        const d = (task.deadline as any).toDate ? (task.deadline as any).toDate() : new Date(task.deadline as any);
        return format(d, 'EEE, d MMM', { locale: pl });
    }, [task.deadline]);

    const isOverdue = useMemo(() => {
        if (!task.deadline || task.completed) return false;
        const d = (task.deadline as any).toDate ? (task.deadline as any).toDate() : new Date(task.deadline as any);
        const now = new Date(); now.setHours(0, 0, 0, 0);
        return d < now;
    }, [task.deadline, task.completed]);

    const containerStyle = useMemo(() => {
        // Different style for completed tasks?
        if (task.completed) return { opacity: 0.6 };
        return {};
    }, [task.completed]);

    return (
        <TouchableOpacity
            onPress={() => selectionMode ? onToggleSelect(task) : onPress(task)}
            onLongPress={() => onLongPress(task)}
            activeOpacity={0.7}
            style={[
                styles.container,
                {
                    backgroundColor: selected ? `${Colors.primary}30` : glassStyle.background,
                    borderColor: selected ? Colors.primary : glassStyle.border,
                    borderWidth: 1,
                },
                containerStyle
            ]}
        >
            <View style={styles.mainRow}>
                <TouchableOpacity onPress={() => onToggleComplete(task)} style={styles.checkContainer}>
                    <View style={[
                        styles.checkbox,
                        {
                            borderColor: task.completed ? Colors.success : glassStyle.textSecondary,
                            backgroundColor: task.completed ? Colors.success : 'transparent'
                        }
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
                                {
                                    color: task.completed ? glassStyle.textSecondary : glassStyle.textPrimary,
                                    textDecorationLine: task.completed ? 'line-through' : 'none'
                                }
                            ]}
                        >
                            {task.text}
                        </Text>
                        {pinned && <Feather name="map-pin" size={12} color={Colors.primary} style={{ marginLeft: 6 }} />}
                    </View>

                    <View style={styles.metaRow}>
                        {category && (
                            <View style={[styles.pill, { backgroundColor: category.color }]}>
                                <Text style={[styles.pillText, { color: 'white' }]}>{category.name}</Text>
                            </View>
                        )}

                        {deadlineText && (
                            <View style={[styles.pill, { backgroundColor: isOverdue ? `${Colors.danger}20` : glassStyle.inputBackground }]}>
                                <Feather name="clock" size={10} color={isOverdue ? Colors.danger : glassStyle.textSecondary} style={{ marginRight: 4 }} />
                                <Text style={[styles.pillText, { color: isOverdue ? Colors.danger : glassStyle.textSecondary }]}>{deadlineText}</Text>
                            </View>
                        )}

                        {/* Priority Dots? Or just Difficulty */}
                        {task.difficulty && (
                            <View style={[styles.pill, { backgroundColor: glassStyle.inputBackground }]}>
                                <Text style={[styles.pillText, { color: glassStyle.textSecondary }]}>Lvl {task.difficulty}</Text>
                            </View>
                        )}
                    </View>

                    {/* Description Preview (Ghost when expanded) */}
                    {task.description ? (
                        <View style={{ marginTop: 6, opacity: isExpanded ? 0 : 1 }}>
                            <Text
                                numberOfLines={1}
                                style={{ fontSize: 13, color: glassStyle.textSecondary, opacity: 0.8 }}
                            >
                                {task.description}
                            </Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.actions}>
                    <PriorityIndicator priority={task.basePriority || 3} />
                    {task.description && (
                        <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} style={{ marginTop: 8, padding: 4 }} hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}>
                            <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={glassStyle.textSecondary} style={{ opacity: 0.7 }} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {task.description && isExpanded && (
                <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} activeOpacity={0.8} style={{ marginTop: -21.99, marginLeft: 39, paddingRight: 50, zIndex: 10 }}>
                    <Text
                        style={[styles.description, { color: glassStyle.textSecondary, marginTop: 0, marginLeft: 0 }]}
                    >
                        {task.description}
                    </Text>
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
        alignItems: 'stretch',
        padding: Spacing.medium,
        marginHorizontal: Spacing.medium,
        marginBottom: 2,
        borderRadius: 16,
        overflow: 'hidden',
    },
    mainRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    checkContainer: {
        paddingRight: Spacing.medium,
        marginTop: 12,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.2,
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
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    pillText: {
        fontSize: 10,
        fontWeight: '700',
    },
    description: {
        fontSize: 13,
        opacity: 0.8,
        lineHeight: 20
    },
    actions: {
        paddingLeft: Spacing.medium,
        alignItems: 'center',
        paddingTop: 17,
    }
});

export default ModernTaskItem;
