import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, withTiming, withSpring, useSharedValue, Layout } from 'react-native-reanimated';
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
    onExpandedChange,
    noContainer = false,
}: Props & { onExpandedChange?: (expanded: boolean) => void, noContainer?: boolean }) => {
    const theme = useTheme();
    const isDark = theme.colorScheme === 'dark';
    const glassStyle = isDark ? Glass.dark : Glass.light;
    const [isExpanded, setIsExpanded] = React.useState(false);
    const rotate = useSharedValue(0);

    React.useEffect(() => {
        rotate.value = withSpring(isExpanded ? 180 : 0, { damping: 20, mass: 1 });
    }, [isExpanded]);

    const animatedChevron = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotate.value}deg` }]
    }));

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
        const style: any = {};

        if (task.completed && !noContainer) {
            style.opacity = 0.6;
        }

        if (task.description) {
            // Zmniejszamy padding dla zadań z opisem, zeby były bardziej kompaktowe
            style.paddingVertical = 10;
        }

        return style;
    }, [task.completed, task.description]);

    return (
        <TouchableOpacity
            onPress={() => selectionMode ? onToggleSelect(task) : onPress(task)}
            onLongPress={() => onLongPress(task)}
            activeOpacity={0.7}
            style={[
                styles.container,
                {
                    backgroundColor: noContainer ? 'transparent' : (selected ? `${Colors.primary}30` : glassStyle.background),
                    borderColor: noContainer ? 'transparent' : (selected ? Colors.primary : glassStyle.border),
                    borderWidth: noContainer ? 0 : 1,
                    marginHorizontal: noContainer ? 0 : Spacing.medium,
                    marginBottom: noContainer ? 0 : 2,
                    borderRadius: noContainer ? 0 : 16,
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
                                    textDecorationLine: task.completed ? 'line-through' : 'none',
                                    flex: 1
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

                        {task.difficulty && (
                            <View style={[styles.pill, { backgroundColor: glassStyle.inputBackground }]}>
                                <Text style={[styles.pillText, { color: glassStyle.textSecondary }]}>Lvl {task.difficulty}</Text>
                            </View>
                        )}

                        {/* Priority Indicator in the same row, pushed to right */}
                        <View style={{ marginLeft: 'auto', paddingLeft: 8, justifyContent: 'center' }}>
                            <PriorityIndicator priority={task.basePriority || 3} />
                        </View>
                    </View>

                    {/* Description Section with Inline Chevron */}
                    {task.description && (
                        <Animated.View
                            layout={Layout.springify().damping(20).mass(1)}
                            style={{ overflow: 'hidden' }}
                        >
                            <TouchableOpacity
                                onPress={() => {
                                    const newState = !isExpanded;
                                    setIsExpanded(newState);
                                    onExpandedChange?.(newState);
                                }}
                                activeOpacity={1}
                                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                                style={{
                                    marginTop: 0,
                                    paddingTop: 8,
                                    paddingBottom: 0,
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <Text
                                    numberOfLines={isExpanded ? undefined : 1}
                                    style={{
                                        fontSize: 13,
                                        color: glassStyle.textSecondary,
                                        opacity: 0.8,
                                        lineHeight: 20,
                                        flex: 1,
                                        paddingRight: 8
                                    }}
                                >
                                    {task.description.trim()}
                                </Text>

                                {/* Chevron aligned with first line */}
                                <Animated.View style={[{ marginTop: 2, opacity: 0.7, marginRight: 4 }, animatedChevron]}>
                                    <Feather
                                        name="chevron-down"
                                        size={16}
                                        color={glassStyle.textSecondary}
                                    />
                                </Animated.View>
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                </View>
            </View>
        </TouchableOpacity >
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
