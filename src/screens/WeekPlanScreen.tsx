import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { updateDoc, doc as fsDoc, Timestamp } from '../utils/firestoreCompat';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { doc, onSnapshot, collection, query, where, getDocs, QuerySnapshotCompat } from '../utils/firestoreCompat';
import { getAuth } from '../utils/authCompat';
import { db } from '../utils/firestoreCompat';
import { Colors, GlobalStyles, Spacing, Typography } from '../styles/AppStyles';
import AppHeader from '../components/AppHeader';
import { FadeInUp, Layout } from 'react-native-reanimated';
import { Task, UserProfile, RecurringSeries } from '../types';
import { ensureInstancesForRange } from '../utils/recurrence';

type DayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

const dayOrder: DayKey[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dayLabels: Record<DayKey, string> = { Mon: 'Pon', Tue: 'Wt', Wed: 'Śr', Thu: 'Czw', Fri: 'Pt', Sat: 'Sob', Sun: 'Nd' };

const WeekPlanScreen = () => {
  const currentUser = getAuth().currentUser;
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const { showToast } = useToast();
  const [lastMove, setLastMove] = useState<{ taskId: string; from: DayKey; to: DayKey; prevDeadline: Date | null } | null>(null);

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    const unsubUser = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
      setUserProfile((snap.data() as UserProfile) || null);
    });
    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, where('userId', '==', currentUser.uid), where('status', '==', 'active'));
    const unsubTasks = onSnapshot(q, (snapshot: QuerySnapshotCompat) => {
      setRawTasks(snapshot.docs.map(d => ({ ...(d.data() as any), id: d.id })) as Task[]);
      setLoading(false);
    }, () => setLoading(false));

    // JIT generate recurring instances in current week range
    (async () => {
      try {
        const seriesSnap = await getDocs(query(collection(db, 'recurringSeries'), where('userId', '==', currentUser.uid)));
        const allSeries = seriesSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as RecurringSeries[];
        const start = new Date();
        const day = (start.getDay() + 6) % 7; start.setDate(start.getDate() - day); start.setHours(0, 0, 0, 0);
        const end = new Date(start); end.setDate(end.getDate() + 7); end.setMilliseconds(-1);
        await Promise.all(allSeries.map(s => ensureInstancesForRange(s, start, end)));
      } catch { }
    })();
    return () => { unsubUser(); unsubTasks(); };
  }, [currentUser]);

  const grouped = useMemo(() => {
    const startOfWeek = (() => {
      const now = new Date();
      const day = (now.getDay() + 6) % 7; // 0..6, gdzie 0=pon
      const d = new Date(now);
      d.setDate(now.getDate() - day);
      d.setHours(0, 0, 0, 0);
      return d;
    })();
    const toKey = (date: Date | null | undefined): DayKey | null => {
      if (!date) return null;
      const idx = (date.getDay() + 6) % 7; // 0..6 Mon..Sun
      return dayOrder[idx];
    };
    const withinWeek = (date: Date | null | undefined) => {
      if (!date) return false;
      const end = new Date(startOfWeek); end.setDate(end.getDate() + 7); end.setMilliseconds(-1);
      return date >= startOfWeek && date <= end;
    };

    const buckets: Record<DayKey, Task[]> = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] };
    for (const t of rawTasks) {
      const deadline = t.deadline?.toDate() ?? null;
      if (withinWeek(deadline)) {
        const key = toKey(deadline)!;
        buckets[key].push(t);
      }
    }
    // sort w obrębie dnia: najpierw priorytet, potem czas
    for (const k of dayOrder) {
      buckets[k].sort((a, b) => {
        const pa = a.priority ?? a.basePriority ?? 3;
        const pb = b.priority ?? b.basePriority ?? 3;
        if (pa !== pb) return pb - pa;
        const da = a.deadline?.toMillis() ?? 0;
        const db = b.deadline?.toMillis() ?? 0;
        return da - db;
      });
    }
    return buckets;
  }, [rawTasks]);

  // Obciążenie dnia - suma trudności zadań bieżącego dnia
  const dayLoad: Record<DayKey, number> = useMemo(() => {
    const out: Record<DayKey, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    for (const k of dayOrder) {
      out[k] = grouped[k].reduce((sum, t) => sum + (t.difficulty ?? 2), 0);
    }
    return out;
  }, [grouped]);

  if (loading) {
    return (
      <View style={[GlobalStyles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[GlobalStyles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Plan na tydzień" />
      <Animated.FlatList
        data={dayOrder}
        keyExtractor={(k) => k}
        renderItem={({ item: dayKey, index }) => {
          const tasks = grouped[dayKey];
          return (
            <Animated.View layout={Layout.springify()} style={[styles.dayCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.dayLabel, { color: theme.colors.textPrimary }]}>{dayLabels[dayKey]}</Text>
                <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>Obciążenie: {dayLoad[dayKey]}</Text>
              </View>
              {tasks.length === 0 ? (
                <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>Brak zadań</Text>
              ) : (
                tasks.map(t => (
                  <DraggableTaskRow
                    key={t.id}
                    task={t}
                    dayKey={dayKey}
                    onMoved={(payload) => setLastMove(payload)}
                    onNotify={(msg) => showToast(msg, 'info')}
                  />
                ))
              )}
            </Animated.View>
          );
        }}
      />
    </View>
  );
};

const DraggableTaskRow = ({ task, dayKey, onMoved, onNotify }: { task: Task; dayKey: DayKey; onMoved: (p: { taskId: string; from: DayKey; to: DayKey; prevDeadline: Date | null }) => void; onNotify: (msg: string) => void; }) => {
  const theme = useTheme();
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const gesture = Gesture.Pan()
    .onBegin(() => { isDragging.value = true; })
    .onUpdate((e) => { translateY.value = e.translationY; })
    .onEnd(async (e) => {
      // Prosty heurystyczny drop: przesunięcie o > 60px w górę/dół przenosi do poprzedniego/następnego dnia
      const delta = e.translationY;
      let targetOffset = 0;
      if (Math.abs(delta) > 60) targetOffset = delta > 0 ? 1 : -1;
      const idx = dayOrder.indexOf(dayKey);
      const targetIdx = Math.max(0, Math.min(dayOrder.length - 1, idx + targetOffset));
      const targetDay = dayOrder[targetIdx];
      if (targetDay !== dayKey) {
        const current = task.deadline?.toDate() ?? new Date();
        const now = new Date(current);
        const curIdx = (now.getDay() + 6) % 7; // 0..6
        const desiredIdx = dayOrder.indexOf(targetDay);
        const deltaDays = desiredIdx - curIdx;
        now.setDate(now.getDate() + deltaDays);
        now.setHours(12, 0, 0, 0);
        try {
          await updateDoc(fsDoc(db, 'tasks', task.id), { deadline: Timestamp.fromDate(now) });
          runOnJS(onMoved)({ taskId: task.id, from: dayKey, to: targetDay, prevDeadline: task.deadline?.toDate() ?? null });
          runOnJS(onNotify)('Przeniesiono zadanie. Cofnij?');
        } catch { }
      }
      translateY.value = withTiming(0, { duration: 150 });
      isDragging.value = false;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: isDragging.value ? 0.9 : 1,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.taskRow, animatedStyle]}>
        <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
        <Text style={[styles.taskText, { color: theme.colors.textPrimary }]} numberOfLines={2}>{task.text}</Text>
        {!!task.deadline && (
          <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>{task.deadline.toDate().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</Text>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: 'transparent',
    paddingTop: Spacing.xxLarge,
    paddingBottom: Spacing.medium,
    paddingHorizontal: Spacing.large,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    ...Typography.h1,
  },
  dayCard: {
    backgroundColor: 'transparent',
    marginHorizontal: Spacing.medium,
    marginTop: Spacing.medium,
    borderRadius: 10,
    padding: Spacing.medium,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayLabel: {
    ...Typography.h3,
    marginBottom: Spacing.small,
  },
  empty: {
    ...Typography.small,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.small,
  },
  taskText: {
    ...Typography.body,
    flex: 1,
  },
  timeText: {
    ...Typography.small,
    marginLeft: Spacing.small,
  }
});

export default WeekPlanScreen;



