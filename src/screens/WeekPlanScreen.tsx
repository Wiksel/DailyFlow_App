import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { db } from '../../firebaseConfig';
import { Colors, GlobalStyles, Spacing, Typography } from '../styles/AppStyles';
import { Task, UserProfile } from '../types';

type DayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

const dayOrder: DayKey[] = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const dayLabels: Record<DayKey, string> = { Mon: 'Pon', Tue: 'Wt', Wed: 'Śr', Thu: 'Czw', Fri: 'Pt', Sat: 'Sob', Sun: 'Nd' };

const WeekPlanScreen = () => {
  const currentUser = getAuth().currentUser;
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    const unsubUser = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
      setUserProfile((snap.data() as UserProfile) || null);
    });
    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, where('userId', '==', currentUser.uid), where('status', '==', 'active'));
    const unsubTasks = onSnapshot(q, (snapshot) => {
      setRawTasks(snapshot.docs.map(d => ({ ...(d.data() as any), id: d.id })) as Task[]);
      setLoading(false);
    }, () => setLoading(false));
    return () => { unsubUser(); unsubTasks(); };
  }, [currentUser]);

  const grouped = useMemo(() => {
    const startOfWeek = (() => {
      const now = new Date();
      const day = (now.getDay() + 6) % 7; // 0..6, gdzie 0=pon
      const d = new Date(now);
      d.setDate(now.getDate() - day);
      d.setHours(0,0,0,0);
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

  if (loading) {
    return <View style={GlobalStyles.container}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <View style={GlobalStyles.container}>
      <View style={styles.header}> 
        <Text style={styles.title}>Plan na tydzień</Text>
      </View>
      <FlatList
        data={dayOrder}
        keyExtractor={(k) => k}
        renderItem={({ item: dayKey }) => {
          const tasks = grouped[dayKey];
          return (
            <View style={styles.dayCard}>
              <Text style={styles.dayLabel}>{dayLabels[dayKey]}</Text>
              {tasks.length === 0 ? (
                <Text style={styles.empty}>Brak zadań</Text>
              ) : (
                tasks.map(t => (
                  <View key={t.id} style={styles.taskRow}>
                    <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
                    <Text style={styles.taskText} numberOfLines={2}>{t.text}</Text>
                    {!!t.deadline && (
                      <Text style={styles.timeText}>{t.deadline.toDate().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</Text>
                    )}
                  </View>
                ))
              )}
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: 'white',
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
    backgroundColor: 'white',
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
    color: Colors.textSecondary,
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
    color: Colors.textSecondary,
    marginLeft: Spacing.small,
  }
});

export default WeekPlanScreen;


