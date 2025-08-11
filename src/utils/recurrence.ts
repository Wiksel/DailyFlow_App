import { Timestamp, addDoc, collection, query, where, getDocs } from './firestoreCompat';
import { db } from '../../firebaseConfig';
import { RecurringSeries, Task } from '../types';

export function toDateOnlyIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function nextOccurrence(from: Date, series: RecurringSeries): Date | null {
  const start = series.startDate.toDate();
  const end = series.endDate?.toDate() || null;
  let cur = new Date(from);
  cur.setHours(12, 0, 0, 0);
  if (cur < start) cur = new Date(start);

  const interval = Math.max(1, series.interval || 1);

  const isSkipped = (d: Date) => series.skips?.includes(toDateOnlyIso(d));

  // Simple rules: daily, weekly (byWeekday), monthly (byMonthDay)
  for (let i = 0; i < 366; i++) {
    if (end && cur > end) return null;
    if (series.frequency === 'daily') {
      if (!isSkipped(cur)) return cur;
      cur.setDate(cur.getDate() + interval);
    } else if (series.frequency === 'weekly') {
      if (typeof series.byWeekday === 'number') {
        // go to next desired weekday
        while (cur.getDay() !== series.byWeekday) cur.setDate(cur.getDate() + 1);
        if (!isSkipped(cur)) return cur;
        cur.setDate(cur.getDate() + 7 * interval);
      } else {
        if (!isSkipped(cur)) return cur; // fallback
        cur.setDate(cur.getDate() + 7 * interval);
      }
    } else if (series.frequency === 'monthly') {
      const by = series.byMonthDay || start.getDate();
      const candidate = new Date(cur);
      candidate.setDate(1);
      candidate.setMonth(candidate.getMonth());
      candidate.setDate(Math.min(by, 28));
      if (!isSkipped(candidate)) return candidate;
      candidate.setMonth(candidate.getMonth() + interval);
      cur = candidate;
    } else {
      return null;
    }
  }
  return null;
}

export async function ensureInstancesForRange(series: RecurringSeries, rangeStart: Date, rangeEnd: Date) {
  // JIT generate up to first occurrence in range
  const first = nextOccurrence(rangeStart, series);
  if (!first || first > rangeEnd) return;
  // Check if instance already exists for this date
  const occTs = Timestamp.fromDate(first);
  const existing = await getDocs(query(
    collection(db, 'tasks'),
    where('seriesId', '==', series.id),
    where('occurrenceDate', '==', occTs)
  ));
  if (!existing.empty) return;

  const payload: Partial<Task> = {
    text: series.name,
    description: series.description || '',
    category: series.category,
    basePriority: series.basePriority,
    difficulty: series.difficulty,
    deadline: Timestamp.fromDate(first),
    completed: false,
    status: 'active',
    isShared: series.isShared,
    pairId: series.pairId,
    userId: series.userId,
    creatorNickname: 'System',
    createdAt: Timestamp.now(),
    seriesId: series.id,
    occurrenceDate: occTs,
  } as any;
  await addDoc(collection(db, 'tasks'), payload);
}


