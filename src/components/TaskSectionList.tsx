import React, { useMemo, useState, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { View, Text, SectionList, StyleSheet, TouchableOpacity, LayoutAnimation } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../styles/AppStyles';
import { Task, Category } from '../types';
import SwipeableTaskItem from './SwipeableTaskItem';
import { useTheme } from '../contexts/ThemeContext';
import { useUI } from '../contexts/UIContext';
import * as Haptics from 'expo-haptics';
import Animated, { Layout } from 'react-native-reanimated';

type SectionKey = 'pinned' | 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'none' | 'completed';

type Props = {
  tasks: Task[];
  categories: Category[];
  onPressTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onConfirmAction: (task: Task) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (task: Task) => void;
  onOpenTaskMenu?: (task: Task) => void;
  onSelectAllSection?: (key: string, tasks: Task[]) => void;
  onQuickAdd?: (key: string) => void;
  pinnedIds?: Set<string>;
  onTogglePinned?: (task: Task) => void;
  highlightQuery?: string;
};

export type TaskSectionListHandle = { scrollToTaskId: (id: string) => void };

const TaskSectionListInner = ({ tasks, categories, onPressTask, onToggleComplete, onConfirmAction, selectionMode = false, selectedIds, onToggleSelect, onOpenTaskMenu, onSelectAllSection, onQuickAdd, pinnedIds, onTogglePinned, highlightQuery }: Props, ref: React.Ref<TaskSectionListHandle>) => {
  const theme = useTheme();
  const { density } = useUI();
  const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>({ pinned: false, overdue: false, today: false, tomorrow: false, week: false, later: true, none: false, completed: true });
  const sectionListRef = useRef<SectionList<any>>(null);
  const indexMapRef = useRef<Record<string, { sectionIndex: number; itemIndex: number }>>({});

  const categoryMap = useMemo(() => {
    const map: Record<string, Category> = {};
    for (const c of categories) map[c.id] = c as Category;
    return map;
  }, [categories]);

  // Separate heavy bucket calculation from section structure
  const { buckets, pinned } = useMemo(() => {
    const now = new Date();
    const startOf = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
    const endOf = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
    const todayStart = startOf(now).getTime();
    const todayEnd = endOf(now).getTime();
    const tomorrowStart = startOf(new Date(now.getTime() + 24 * 60 * 60 * 1000)).getTime();
    const tomorrowEnd = endOf(new Date(now.getTime() + 24 * 60 * 60 * 1000)).getTime();
    const weekEnd = endOf(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)).getTime();

    const buckets: Record<Exclude<SectionKey, 'pinned'>, Task[]> = { overdue: [], today: [], tomorrow: [], week: [], later: [], none: [], completed: [] };
    const pinned: Task[] = [];
    for (const t of tasks) {
      if (pinnedIds?.has(t.id)) { pinned.push(t); continue; }
      if (t.completed) { buckets.completed.push(t); continue; }
      const dl = (t.deadline as any)?.toDate?.()?.getTime?.() || (t.deadline as any)?.getTime?.() || null;
      if (!dl) { buckets.none.push(t); continue; }
      if (dl < todayStart) { buckets.overdue.push(t); continue; }
      if (dl >= todayStart && dl <= todayEnd) { buckets.today.push(t); continue; }
      if (dl >= tomorrowStart && dl <= tomorrowEnd) { buckets.tomorrow.push(t); continue; }
      if (dl > tomorrowEnd && dl <= weekEnd) { buckets.week.push(t); continue; }
      buckets.later.push(t);
    }
    return { buckets, pinned };
  }, [tasks, pinnedIds]);

  const sections = useMemo(() => {
    const order: { key: SectionKey; title: string }[] = [
      { key: 'overdue', title: 'Po terminie' },
      { key: 'today', title: 'Dzisiaj' },
      { key: 'tomorrow', title: 'Jutro' },
      { key: 'week', title: 'W tym tygodniu' },
      { key: 'later', title: 'Później' },
      { key: 'none', title: 'Bez terminu' },
      { key: 'completed', title: 'Ukończone' },
    ];

    const mappedSections = order.map(({ key, title }) => {
      const allData = (buckets as any)[key];
      return {
        key,
        title,
        data: collapsed[key] ? [] : allData,
        originalData: allData,
        count: allData.length
      };
    });

    if (pinned.length > 0) {
      mappedSections.unshift({
        key: 'pinned',
        title: 'Przypięte',
        data: collapsed['pinned'] ? [] : pinned,
        originalData: pinned,
        count: pinned.length
      });
    }

    // Build index map
    const map: Record<string, { sectionIndex: number; itemIndex: number }> = {};
    mappedSections.forEach((sec, si) => sec.data.forEach((t: Task, ii: number) => { map[t.id] = { sectionIndex: si, itemIndex: ii }; }));
    indexMapRef.current = map;
    return mappedSections;
  }, [buckets, pinned, collapsed]);

  useImperativeHandle(ref, () => ({
    scrollToTaskId: (id: string) => {
      const pos = indexMapRef.current[id];
      if (!pos) return;
      try { sectionListRef.current?.scrollToLocation({ sectionIndex: pos.sectionIndex, itemIndex: pos.itemIndex, viewOffset: 80, animated: true }); } catch { }
    }
  }));

  const toggleSection = useCallback((key: SectionKey) => {
    try { Haptics.selectionAsync(); } catch { }
    // Add simple LayoutAnimation for collapse/expand
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const getSectionAccent = useCallback((key: SectionKey) => {
    switch (key) {
      case 'pinned': return { color: theme.colors.warning, title: 'Przypięte' };
      case 'overdue': return { color: theme.colors.danger, title: 'Po terminie' };
      case 'today': return { color: theme.colors.primary, title: 'Dzisiaj' };
      case 'tomorrow': return { color: theme.colors.warning, title: 'Jutro' };
      case 'week': return { color: theme.colors.success, title: 'W tym tygodniu' };
      case 'later': return { color: theme.colors.textSecondary, title: 'Później' };
      case 'none': return { color: theme.colors.textSecondary, title: 'Bez terminu' };
      case 'completed': return { color: theme.colors.textSecondary, title: 'Ukończone' };
      default: return { color: theme.colors.textSecondary, title: '' };
    }
  }, [theme.colors]);

  return (
    <SectionList
      sections={sections as any}
      keyExtractor={(item: Task) => item.id}
      stickySectionHeadersEnabled
      ref={sectionListRef}
      renderSectionHeader={({ section }: any) => {
        const isCollapsed = collapsed[section.key as SectionKey];
        const count = section.count;
        if (count === 0) return null;
        const accent = getSectionAccent(section.key as SectionKey);
        return (
          <Animated.View layout={Layout.springify()} style={[styles.headerContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerDot, { backgroundColor: accent.color }]} />
              <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>{accent.title}</Text>
              <View style={[styles.countPill, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.countText, { color: theme.colors.textSecondary }]}>{count}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => onQuickAdd && onQuickAdd(section.key)} style={styles.collapseBtn} accessibilityLabel="Dodaj zadanie w tej sekcji">
                <Feather name="plus" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onSelectAllSection && onSelectAllSection(section.key, section.originalData)} style={styles.collapseBtn} accessibilityLabel="Zaznacz sekcję">
                <Feather name="check-square" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => toggleSection(section.key)} style={styles.collapseBtn}>
                <Feather name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        );
      }}
      renderItem={({ item, index, section }) => {
        // No longer needed check: if (collapsed[section.key as SectionKey]) return null;
        const cat = categoryMap[item.category];
        const selected = !!selectedIds?.has(item.id);
        const isPinned = !!pinnedIds?.has(item.id);
        const isCompact = density === 'compact' ? true : (section.key !== 'overdue' && section.key !== 'today' && section.key !== 'pinned');

        return (
          <SwipeableTaskItem
            task={item}
            category={cat}
            index={index}
            isCompact={isCompact}
            selectionMode={selectionMode}
            selected={selected}
            isPinned={isPinned}
            highlightQuery={highlightQuery}
            onPress={onPressTask}
            onToggleComplete={onToggleComplete}
            onConfirmAction={onConfirmAction}
            onToggleSelect={onToggleSelect!}
            onOpenMenu={onOpenTaskMenu}
            onTogglePinned={onTogglePinned}
          />
        );
      }}
      contentContainerStyle={{ paddingBottom: Spacing.xLarge * 2 }}
    />
  );
}

const TaskSectionList = forwardRef<TaskSectionListHandle, Props>(TaskSectionListInner);
export default TaskSectionList;

const styles = StyleSheet.create({
  headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.medium, paddingVertical: Spacing.small, borderTopWidth: 1, borderBottomWidth: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  headerTitle: { ...Typography.h3, fontSize: Typography.h3.fontSize, fontWeight: '700' },
  countPill: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  countText: { fontSize: Typography.small.fontSize, fontWeight: '700' },
  collapseBtn: { padding: 6 },
});
