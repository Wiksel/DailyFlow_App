import React, { useMemo, forwardRef, useImperativeHandle } from 'react';
import { View, Text, SectionList, StyleSheet, TouchableOpacity } from 'react-native';
import { Task, Category } from '../types';
import SwipeableTaskItem from './SwipeableTaskItem';
import { useTheme } from '../contexts/ThemeContext';
import { Typography, Spacing, GlobalStyles } from '../styles/AppStyles';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

export interface TaskSectionListHandle {
    scrollToTaskId: (taskId: string) => void;
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
        scrollToTaskId: (taskId: string) => {
            // Implementation specific to SectionList finding index...
            // Simplified for now or requires complex index lookup
        }
    }));

    const sections = useMemo(() => {
        const pinned: Task[] = [];
        const overdue: Task[] = [];
        const today: Task[] = [];
        const tomorrow: Task[] = [];
        const upcoming: Task[] = []; // Next 7 days
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
            if (t.completed) {
                completed.push(t);
                return;
            }
            if (pinnedIds.has(t.id)) {
                pinned.push(t);
                return; // Pinned tasks only appear in Pinned section? Or duplicate? Let's say exclusive for now.
            }

            if (!t.deadline) {
                noDate.push(t);
                return;
            }

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

    const renderSectionHeader = ({ section: { title, key, data, icon, color } }: any) => (
        <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                {icon && <Feather name={icon as any} size={16} color={color || theme.colors.textSecondary} />}
                <Text style={{ ...Typography.h3, fontSize: 13, color: color || theme.colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>{title} ({data.length})</Text>
            </View>
            {onQuickAdd && (key === 'today' || key === 'tomorrow' || key === 'nodate') && (
                <TouchableOpacity onPress={() => onQuickAdd(key)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Feather name="plus" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <SectionList
            sections={sections}
            keyExtractor={item => item.id}
            renderItem={({ item, index }) => (
                <SwipeableTaskItem
                    task={item}
                    category={categories.find(c => c.id === item.category)}
                    index={index}
                    isCompact={false} // Force standard for modern look
                    selectionMode={selectionMode}
                    selected={selectedIds.has(item.id)}
                    isPinned={pinnedIds.has(item.id)}
                    onPress={onPressTask}
                    onToggleComplete={onToggleComplete}
                    onConfirmAction={onConfirmAction}
                    onToggleSelect={onToggleSelect}
                    onOpenMenu={onOpenTaskMenu}
                    onTogglePinned={onTogglePinned}
                    highlightQuery={highlightQuery}
                />
            )}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={{ paddingBottom: 100 }}
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
        />
    );
});

const styles = StyleSheet.create({
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.medium,
        paddingTop: Spacing.large,
        paddingBottom: Spacing.small,
    },
});

export default React.memo(SectionedTaskList);
