import React, { useMemo, forwardRef, useImperativeHandle, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Task, Category } from '../types';
import SwipeableTaskItem from './SwipeableTaskItem';
import { useTheme } from '../contexts/ThemeContext';
import { Typography, Spacing } from '../styles/AppStyles';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInUp, Layout, FadeOut } from 'react-native-reanimated';

export interface TaskSectionListHandle {
    scrollToTaskId: (taskId: string) => void; // Placeholder
}

interface Props {
    tasks: Task[];
    categories: Category[];
    onPressTask: (task: Task) => void;
    onToggleComplete: (task: Task) => void;
    onConfirmAction: (task: Task) => void;
    selectionMode: boolean;
    selectedIds: Set<string>;
    onToggleSelect: (task: Task) => void;
    onOpenTaskMenu: (task: Task) => void;
    onSelectAllSection?: (sectionKey: string, items: Task[]) => void;
    onQuickAdd?: (sectionKey: string) => void;
    pinnedIds: Set<string>;
    onTogglePinned: (task: Task) => void;
    highlightQuery?: string;
}

type ListItem =
    | { type: 'header', key: string, title: string, icon?: string, color?: string, data: Task[] }
    | { type: 'task', id: string, data: Task, index: number }; // index relative to list or section? Global index is better for animation delay

const SectionedTaskList = forwardRef<TaskSectionListHandle, Props>(({
    tasks,
    categories,
    onPressTask,
    onToggleComplete,
    onConfirmAction,
    selectionMode,
    selectedIds,
    onToggleSelect,
    onOpenTaskMenu,
    onSelectAllSection,
    onQuickAdd,
    pinnedIds,
    onTogglePinned,
    highlightQuery
}, ref) => {
    const theme = useTheme();

    useImperativeHandle(ref, () => ({
        scrollToTaskId: () => { }
    }));

    // 1. Group Data
    const sections = useMemo(() => {
        const pinned: Task[] = [];
        const overdue: Task[] = [];
        const today: Task[] = [];
        const tomorrow: Task[] = [];
        const upcoming: Task[] = [];
        const later: Task[] = [];
        const noDate: Task[] = [];
        const completed: Task[] = [];

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const tomorrowDate = new Date(now);
        tomorrowDate.setDate(now.getDate() + 1);
        const nextWeekDate = new Date(now);
        nextWeekDate.setDate(now.getDate() + 7);

        tasks.forEach(t => {
            if (t.completed) { completed.push(t); return; }
            if (pinnedIds.has(t.id)) { pinned.push(t); return; }

            if (!t.deadline) { noDate.push(t); return; }

            const d = (t.deadline as any)?.toDate ? (t.deadline as any).toDate() : new Date(t.deadline as any);
            d.setHours(0, 0, 0, 0);

            if (d.getTime() < now.getTime()) overdue.push(t);
            else if (d.getTime() === now.getTime()) today.push(t);
            else if (d.getTime() === tomorrowDate.getTime()) tomorrow.push(t);
            else if (d.getTime() <= nextWeekDate.getTime()) upcoming.push(t);
            else later.push(t);
        });

        const res = [];
        if (pinned.length > 0) res.push({ title: 'Przypięte', key: 'pinned', data: pinned, icon: 'map-pin' });
        if (overdue.length > 0) res.push({ title: 'Zaległe', key: 'overdue', data: overdue, icon: 'alert-circle', color: theme.colors.danger });
        if (today.length > 0) res.push({ title: 'Dzisiaj', key: 'today', data: today, icon: 'sun', color: theme.colors.primary });
        if (tomorrow.length > 0) res.push({ title: 'Jutro', key: 'tomorrow', data: tomorrow, icon: 'coffee' });
        if (upcoming.length > 0) res.push({ title: 'Nadchodzące', key: 'upcoming', data: upcoming, icon: 'calendar' });
        if (noDate.length > 0) res.push({ title: 'Bez terminu', key: 'nodate', data: noDate, icon: 'layers' });
        if (later.length > 0) res.push({ title: 'Później', key: 'later', data: later, icon: 'chevrons-right' });
        if (completed.length > 0) res.push({ title: 'Ukończone', key: 'completed', data: completed, icon: 'check-circle' });
        return res;
    }, [tasks, pinnedIds, theme.colors]);

    // 2. Flatten Data
    const flattenedData: ListItem[] = useMemo(() => {
        const flat: ListItem[] = [];
        sections.forEach(sec => {
            flat.push({ type: 'header', key: sec.key, title: sec.title, icon: sec.icon, color: sec.color, data: sec.data });
            sec.data.forEach((t, i) => {
                flat.push({ type: 'task', id: t.id, data: t, index: i });
            });
        });
        return flat;
    }, [sections]);

    // 3. Render Item
    const renderItem = useCallback(({ item, index }: { item: ListItem, index: number }) => {
        if (item.type === 'header') {
            return (
                <View style={styles.sectionHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minHeight: 28 }}>
                        {item.icon && <Feather name={item.icon as any} size={18} color={item.color || theme.colors.textSecondary} />}
                        <Text style={{ ...Typography.h3, fontSize: 15, color: item.color || theme.colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {item.title} ({item.data.length})
                        </Text>
                    </View>
                    {onQuickAdd && (item.key === 'today' || item.key === 'tomorrow' || item.key === 'nodate') && (
                        <TouchableOpacity onPress={() => onQuickAdd(item.key)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                            <Feather name="plus" size={24} color={theme.colors.primary} />
                        </TouchableOpacity>
                    )}
                </View>
            );
        } else {
            return (
                <View style={{ marginBottom: 0 }}>
                    <SwipeableTaskItem
                        task={item.data}
                        category={categories.find(c => c.id === item.data.category)}
                        index={index}
                        isCompact={false}
                        selectionMode={selectionMode}
                        selected={selectedIds.has(item.data.id)}
                        isPinned={pinnedIds.has(item.data.id)}
                        onPress={onPressTask}
                        onToggleComplete={onToggleComplete}
                        onConfirmAction={onConfirmAction}
                        onToggleSelect={onToggleSelect}
                        // Menu Logic could be passed here if needed
                        onOpenMenu={onOpenTaskMenu}
                        onTogglePinned={onTogglePinned}
                        highlightQuery={highlightQuery}
                    />
                </View>
            );
        }
    }, [categories, selectionMode, selectedIds, pinnedIds, highlightQuery, onPressTask, onToggleComplete, onConfirmAction, onToggleSelect, onOpenTaskMenu, onTogglePinned, onQuickAdd, theme]);

    return (
        <Animated.FlatList
            itemLayoutAnimation={Layout.springify().damping(20).mass(0.8)}
            data={flattenedData}
            keyExtractor={(item) => item.type === 'header' ? `header-${item.key}` : item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 0 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        />
    );
});

const styles = StyleSheet.create({
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.medium,
        paddingTop: 6,
        paddingBottom: 2,
        backgroundColor: 'transparent',
    },
});

export default React.memo(SectionedTaskList);
