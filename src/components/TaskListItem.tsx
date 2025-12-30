import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../styles/AppStyles';
import { Task, Category } from '../types';
import PriorityIndicator from './PriorityIndicator';
import { useTheme } from '../contexts/ThemeContext';
import AnimatedIconButton from './AnimatedIconButton';
import Animated, { Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

type Props = {
  task: Task;
  category: Category | undefined;
  onPress: () => void;
  onToggleComplete: () => void;
  onConfirmAction: () => void; // archive/delete depending on state
  creatorAvatarUrl?: string | null;
  onLongPress?: () => void;
  isCompact?: boolean;
  onOpenMenu?: () => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  pinned?: boolean;
  onTogglePinned?: () => void;
  highlightQuery?: string;
};

export default function TaskListItem({ task, category, onPress, onToggleComplete, onConfirmAction, creatorAvatarUrl, onLongPress, isCompact = false, onOpenMenu, selectionMode = false, selected = false, onToggleSelect, pinned = false, onTogglePinned, highlightQuery }: Props) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(!isCompact);
  const toggleExpanded = useCallback(() => {
    try { Haptics.selectionAsync(); } catch { }
    setExpanded(v => !v);
  }, []);

  const createdAt = useMemo(() => task.createdAt?.toDate?.(), [task.createdAt]);
  const deadline = useMemo(() => task.deadline?.toDate?.(), [task.deadline]);
  const overdue = !!deadline && deadline.getTime() < Date.now() && !task.completed;
  const accentColor = task.priority >= 4 ? theme.colors.danger : task.priority === 3 ? theme.colors.warning : theme.colors.success;
  const deadlineSeverity = useMemo(() => {
    if (!deadline) return 'none' as const;
    const now = new Date();
    const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'critical' as const;
    if (diffDays <= 1) return 'critical' as const;
    if (diffDays <= 3) return 'urgent' as const;
    if (diffDays <= 7) return 'soon' as const;
    return 'later' as const;
  }, [deadline]);
  const deadlineColor = deadlineSeverity === 'critical' ? theme.colors.danger : deadlineSeverity === 'urgent' ? theme.colors.warning : deadlineSeverity === 'soon' ? theme.colors.primary : theme.colors.textSecondary;

  const accentGradient = useMemo(() => {
    if (task.priority >= 4) return ['#ff6b6b', '#ff8e53'];
    if (task.priority === 3) return ['#f6d365', '#fda085'];
    return ['#84fab0', '#8fd3f4'];
  }, [task.priority]);

  const weekdayPl = (d: Date) => ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'][d.getDay()];

  const renderDifficultyDots = (level: number | undefined) => {
    const n = Math.max(0, Math.min(5, Number(level ?? 0)));
    return (
      <View style={styles.diffDotsRow}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={[styles.diffDot, i < n ? { backgroundColor: theme.colors.textSecondary, opacity: 0.9 } : { backgroundColor: theme.colors.textSecondary, opacity: 0.25 }]} />
        ))}
      </View>
    );
  };

  return (
    <Animated.View layout={Layout.springify()} style={[styles.root, { backgroundColor: theme.colors.card, borderColor: selected ? theme.colors.primary : theme.colors.border, shadowColor: Colors.shadow, opacity: task.completed ? 0.7 : 1, padding: isCompact ? Spacing.xSmall : Spacing.small }]}>
      <LinearGradient colors={accentGradient as any} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.accent, { width: isCompact ? 2 : 3 }]} />
      {/* Checkbox */}
      <TouchableOpacity
        onPress={selectionMode ? onToggleSelect : onToggleComplete}
        style={styles.checkboxTouchable}
        accessibilityLabel={selectionMode ? (selected ? 'Odznacz' : 'Zaznacz') : (task.completed ? 'Cofnij ukończenie' : 'Oznacz jako ukończone')}>
        <View style={[
          styles.checkbox,
          { borderColor: theme.colors.primary },
          (task.completed && !selectionMode) && { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
          (selectionMode && selected) && { backgroundColor: theme.colors.primary }
        ]}>
          {((task.completed && !selectionMode) || (selectionMode && selected)) && <Feather name="check" size={18} color="#fff" />}
        </View>
      </TouchableOpacity>

      {/* Main */}
      <TouchableOpacity style={styles.main} onPress={selectionMode ? onToggleSelect : onPress} onLongPress={onLongPress} delayLongPress={300} activeOpacity={0.7}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }, task.completed && styles.titleCompleted]} numberOfLines={isCompact ? 1 : 2}>
            {highlightText(task.text, highlightQuery, theme.colors.primary)}
          </Text>
          {category && (
            <View style={[styles.categoryChipFilled, { backgroundColor: category.color, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.9)' }} />
              <Text style={styles.categoryChipFilledText} numberOfLines={1}>{category.name}</Text>
            </View>
          )}
          <View style={[styles.iconPill, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, marginLeft: 6, paddingHorizontal: isCompact ? 6 : 6, paddingVertical: isCompact ? 3 : 4 }]}>
            <AnimatedIconButton
              icon={expanded ? 'chevron-up' : 'chevron-down'}
              size={isCompact ? 14 : 16}
              color={theme.colors.textSecondary}
              onPress={toggleExpanded}
              accessibilityLabel={expanded ? 'Zwiń opis' : 'Rozwiń opis'}
            />
          </View>
          {task.isShared && (
            <View style={[styles.shareChip, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
              <Feather name="users" size={11} color={theme.colors.textSecondary} />
              <Text style={[styles.shareChipText, { color: theme.colors.textSecondary }]}>Wspólne</Text>
            </View>
          )}
          {task.isShared && (
            creatorAvatarUrl ? (
              <Image source={{ uri: creatorAvatarUrl }} style={styles.avatar} />
            ) : (
              <Feather name="users" size={14} color={theme.colors.textSecondary} style={{ marginLeft: 6 }} />
            )
          )}
        </View>

        {!!task.description && expanded && (
          <Animated.View layout={Layout.springify()}>
            <Text style={[styles.description, { color: theme.colors.textSecondary, fontSize: isCompact ? Typography.small.fontSize : Typography.small.fontSize + 1 }]}>
              {highlightText(task.description, highlightQuery, theme.colors.primary)}
            </Text>
          </Animated.View>
        )}

        <View style={styles.metaColumn}>
          {createdAt && (
            <View style={styles.metaInline}>
              <Text style={[styles.metaLabel, { color: theme.colors.textSecondary }]}>Dodano</Text>
              <Text style={[styles.metaText, { color: theme.colors.textSecondary, fontSize: isCompact ? Typography.small.fontSize - 1 : Typography.small.fontSize }]} numberOfLines={1}>
                {createdAt.toLocaleDateString('pl-PL')} ({formatRelativePl(createdAt)})
              </Text>
            </View>
          )}
          {deadline && !task.completed && (
            <View style={styles.metaInline}>
              <Text style={[styles.metaLabel, { color: deadlineColor }]}>Termin</Text>
              <Text style={[styles.metaText, { color: deadlineColor, fontWeight: '700' }]} numberOfLines={1}>
                {weekdayPl(deadline)} · {deadline.toLocaleDateString('pl-PL')} ({formatRelativePl(deadline)})
              </Text>
              {overdue && (
                <View style={[styles.badge, { backgroundColor: theme.colors.danger, marginLeft: 8 }]}>
                  <Text style={[styles.badgeText, { color: 'white' }]}>PO TERMINIE</Text>
                </View>
              )}
            </View>
          )}
          {/* Difficulty */}
          <View style={[styles.difficultyChip, { borderColor: theme.colors.border, paddingVertical: isCompact ? 3 : 4, paddingHorizontal: isCompact ? 8 : 10, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
            <Text style={[styles.metaLabel, { color: theme.colors.textSecondary }]}>Trudność</Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: Typography.small.fontSize }}>{Math.max(1, Math.min(10, Number(task.difficulty ?? 1)))}/10</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Trailing actions */}
      <View style={styles.trailing}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.iconPill, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, paddingHorizontal: isCompact ? 6 : 6, paddingVertical: isCompact ? 3 : 4 }]}>
            <AnimatedIconButton
              icon={'trash-2'}
              size={isCompact ? 14 : 16}
              color={theme.colors.danger}
              onPress={onConfirmAction}
              accessibilityLabel={'Usuń'}
            />
          </View>
          <View style={[styles.iconPill, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, paddingHorizontal: isCompact ? 6 : 6, paddingVertical: isCompact ? 3 : 4 }]}>
            <AnimatedIconButton
              icon={'star'}
              size={isCompact ? 14 : 16}
              color={pinned ? '#f1c40f' : theme.colors.textSecondary}
              onPress={() => onTogglePinned && onTogglePinned()}
              accessibilityLabel={pinned ? 'Odepnij' : 'Przypnij'}
            />
          </View>
          <View style={[styles.iconPill, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, paddingHorizontal: isCompact ? 6 : 6, paddingVertical: isCompact ? 3 : 4 }]}>
            <AnimatedIconButton
              icon={'more-vertical'}
              size={isCompact ? 14 : 16}
              color={theme.colors.textSecondary}
              onPress={() => onOpenMenu && onOpenMenu()}
              accessibilityLabel={'Więcej akcji'}
            />
          </View>
        </View>
        <View style={{ marginTop: 6 }}>
          <PriorityIndicator priority={task.priority} />
        </View>
      </View>
    </Animated.View>
  );
}

function formatRelativePl(date: Date): string {
  const now = new Date();
  const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const d = startOfDay(date).getTime();
  const n = startOfDay(now).getTime();
  const diffDays = Math.round((d - n) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'dzisiaj';
  if (diffDays === 1) return 'jutro';
  if (diffDays === -1) return 'wczoraj';
  if (diffDays > 1 && diffDays <= 7) return `za ${diffDays} dni`;
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} dni temu`;
  if (diffDays > 7) return `za ${Math.ceil(diffDays / 7)} tyg.`;
  return `${Math.ceil(Math.abs(diffDays) / 7)} tyg. temu`;
}

function highlightText(text: string, query?: string, color?: string) {
  if (!query || !query.trim()) return text;
  try {
    const q = query.trim();
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((p, i) => p.toLowerCase() === q.toLowerCase() ? <Text key={i} style={{ color, fontWeight: '700' }}>{p}</Text> : <Text key={i}>{p}</Text>);
  } catch { return text; }
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'stretch', borderWidth: 1, borderRadius: 12, padding: Spacing.small, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 1 },
  accent: { width: 3, alignSelf: 'stretch', borderRadius: 2, marginRight: 8 },
  checkboxTouchable: { padding: Spacing.small, alignSelf: 'center' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  main: { flex: 1, marginLeft: Spacing.xSmall },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: Typography.body.fontSize, fontWeight: '700', flexShrink: 1 },
  titleCompleted: { textDecorationLine: 'line-through', color: Colors.textSecondary, fontWeight: 'normal' },
  description: { marginTop: 6, fontSize: Typography.small.fontSize + 1, lineHeight: Typography.small.fontSize + 8 },
  metaColumn: { marginTop: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap' },
  metaInline: { flexDirection: 'row', alignItems: 'center' },
  metaText: { marginLeft: 6, fontSize: Typography.small.fontSize },
  metaLabel: { fontWeight: '700', marginRight: 6, fontSize: Typography.small.fontSize },
  deadlineRow: { flexDirection: 'row', alignItems: 'center' },
  deadlineText: { marginLeft: 6, fontSize: Typography.small.fontSize + 1, fontWeight: '700' },
  deadlinePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999, alignSelf: 'flex-start' },
  deadlinePillText: { color: 'white', fontSize: Typography.small.fontSize, fontWeight: '700' },
  badge: { marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { color: 'white', fontSize: Typography.small.fontSize - 1, fontWeight: '700' },
  trailing: { alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch', minWidth: 88, paddingTop: 2, paddingBottom: 2, marginLeft: Spacing.small },
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, marginLeft: 8 },
  categoryChipFilled: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginLeft: 8 },
  categoryChipFilledText: { color: 'white', fontSize: Typography.small.fontSize, fontWeight: '700' },
  categoryDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  categoryChipText: { fontSize: Typography.small.fontSize, fontWeight: '600' },
  difficultyChip: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  diffDotsRow: { flexDirection: 'row', gap: 4 },
  diffDot: { width: 6, height: 6, borderRadius: 3 },
  avatar: { width: 18, height: 18, borderRadius: 9, marginLeft: 6 },
  iconPill: { borderWidth: 1, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 10 },
  shareChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, marginLeft: 8 },
  shareChipText: { fontSize: Typography.small.fontSize - 1, fontWeight: '600' },
});


