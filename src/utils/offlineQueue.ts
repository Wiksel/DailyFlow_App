import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection, doc, updateDoc, deleteDoc, increment } from './firestoreCompat';
import { db } from './firestoreCompat';
import { getAuth } from '../utils/authCompat';

type QueueAction = 'add' | 'update' | 'delete';

interface BaseOp {
  id: string;
  action: QueueAction;
  createdAt: number;
  retryCount: number;
  nextAttemptAt?: number; // epoch ms for backoff
}

interface AddOp extends BaseOp {
  action: 'add';
  collectionPath: string; // e.g., 'tasks'
  data: any;
}

interface UpdateOp extends BaseOp {
  action: 'update';
  docPath: string; // e.g., 'tasks/abc'
  data: any;
}

interface DeleteOp extends BaseOp {
  action: 'delete';
  docPath: string;
}

export type PendingOp = AddOp | UpdateOp | DeleteOp;

const OUTBOX_KEY = (uid: string) => `dailyflow_outbox_${uid}`;
let processing = false;
const MAX_QUEUE = 500; // hard safety cap to prevent unbounded growth

async function readQueue(uid: string): Promise<PendingOp[]> {
  try { const raw = await AsyncStorage.getItem(OUTBOX_KEY(uid)); return raw ? JSON.parse(raw) : []; } catch { return []; }
}

async function writeQueue(uid: string, ops: PendingOp[]) {
  try {
    const tmpKey = OUTBOX_KEY(uid) + '_tmp';
    const payload = JSON.stringify(ops);
    await AsyncStorage.setItem(tmpKey, payload);
    await AsyncStorage.setItem(OUTBOX_KEY(uid), payload);
    await AsyncStorage.removeItem(tmpKey);
  } catch { }
}

function genId() { return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

export async function enqueueAdd(collectionPath: string, data: any) {
  const uid = getAuth().currentUser?.uid; if (!uid) return;
  const op: AddOp = { id: genId(), action: 'add', collectionPath, data, createdAt: Date.now(), retryCount: 0, nextAttemptAt: Date.now() } as any;
  const ops = await readQueue(uid);
  if (ops.length >= MAX_QUEUE) { ops.shift(); }
  ops.push(op);
  await writeQueue(uid, ops);
}

export async function enqueueUpdate(docPath: string, data: any) {
  const uid = getAuth().currentUser?.uid; if (!uid) return;
  const op: UpdateOp = { id: genId(), action: 'update', docPath, data, createdAt: Date.now(), retryCount: 0, nextAttemptAt: Date.now() } as any;
  const ops = await readQueue(uid);
  if (ops.length >= MAX_QUEUE) { ops.shift(); }
  ops.push(op);
  await writeQueue(uid, ops);
}

export async function enqueueDelete(docPath: string) {
  const uid = getAuth().currentUser?.uid; if (!uid) return;
  const op: DeleteOp = { id: genId(), action: 'delete', docPath, createdAt: Date.now(), retryCount: 0, nextAttemptAt: Date.now() } as any;
  const ops = await readQueue(uid);
  if (ops.length >= MAX_QUEUE) { ops.shift(); }
  ops.push(op);
  await writeQueue(uid, ops);
}

export async function processOutbox(maxOps: number = 20) {
  // Acquire lock only when we know there is a user context
  const uid = getAuth().currentUser?.uid;
  if (!uid) return;
  if (processing) return;
  processing = true;
  try {
    let ops = await readQueue(uid);
    if (ops.length === 0) return;
    const now = Date.now();
    const remaining: PendingOp[] = [];
    // pick only those eligible by backoff window
    const [eligible, delayed] = ops.reduce<[PendingOp[], PendingOp[]]>((acc, op) => {
      if (op.nextAttemptAt && op.nextAttemptAt > now) acc[1].push(op); else acc[0].push(op);
      return acc;
    }, [[], []]);
    // keep delayed ops untouched
    remaining.push(...delayed);
    for (const op of eligible.slice(0, maxOps)) {
      try {
        if (op.action === 'add') {
          await addDoc(collection(db, op.collectionPath), op.data);
        } else if (op.action === 'update') {
          const raw: any = (op as any).data;
          if (raw && (raw.__inc || raw.__set)) {
            const payload: any = {};
            if (raw.__inc) {
              for (const [k, v] of Object.entries(raw.__inc)) {
                payload[k] = increment(Number(v));
              }
            }
            if (raw.__set) {
              Object.assign(payload, raw.__set);
            }
            await updateDoc(doc(db, (op as any).docPath), payload);
          } else {
            await updateDoc(doc(db, (op as any).docPath), (op as any).data);
          }
        } else if (op.action === 'delete') {
          await deleteDoc(doc(db, op.docPath));
        }
        // success → drop, no push to remaining
      } catch (e) {
        // exponential backoff and keep
        const retry = (op.retryCount || 0) + 1;
        const baseMs = 15000; // 15s base
        const maxMs = 15 * 60 * 1000; // 15 min
        const delay = Math.min(maxMs, baseMs * Math.pow(2, Math.min(6, retry - 1)));
        const next: PendingOp = { ...op, retryCount: retry, nextAttemptAt: now + delay } as any;
        remaining.push(next);
      }
    }
    // append untouched tail
    // Note: we already split eligible/delayed; also append any leftover eligible beyond maxOps
    if (eligible.length > maxOps) {
      remaining.push(...eligible.slice(maxOps));
    }
    await writeQueue(uid, remaining);
  } finally {
    processing = false;
  }
}

// Utilities for UI
export async function listOutbox(): Promise<PendingOp[]> {
  const uid = getAuth().currentUser?.uid; if (!uid) return [];
  return await readQueue(uid);
}

export async function clearOutbox(): Promise<void> {
  const uid = getAuth().currentUser?.uid; if (!uid) return;
  await writeQueue(uid, []);
}

export async function removeOpFromOutbox(opId: string): Promise<void> {
  const uid = getAuth().currentUser?.uid; if (!uid) return;
  const ops = await readQueue(uid);
  const next = ops.filter(o => o.id !== opId);
  await writeQueue(uid, next);
}

export async function processOpNow(opId: string): Promise<boolean> {
  const uid = getAuth().currentUser?.uid; if (!uid) return false;
  const ops = await readQueue(uid);
  const idx = ops.findIndex(o => o.id === opId);
  if (idx === -1) return false;
  const op = ops[idx];
  try {
    if (op.action === 'add') {
      await addDoc(collection(db, (op as any).collectionPath), (op as any).data);
    } else if (op.action === 'update') {
      const raw: any = (op as any).data;
      if (raw && (raw.__inc || raw.__set)) {
        const payload: any = {};
        if (raw.__inc) {
          for (const [k, v] of Object.entries(raw.__inc)) {
            payload[k] = increment(Number(v));
          }
        }
        if (raw.__set) {
          Object.assign(payload, raw.__set);
        }
        await updateDoc(doc(db, (op as any).docPath), payload);
      } else {
        await updateDoc(doc(db, (op as any).docPath), (op as any).data);
      }
    } else if (op.action === 'delete') {
      await deleteDoc(doc(db, (op as any).docPath));
    }
    ops.splice(idx, 1);
    await writeQueue(uid, ops);
    return true;
  } catch {
    // schedule next attempt
    const retry = (op.retryCount || 0) + 1;
    const baseMs = 15000; const maxMs = 15 * 60 * 1000;
    const delay = Math.min(maxMs, baseMs * Math.pow(2, Math.min(6, retry - 1)));
    ops[idx] = { ...(op as any), retryCount: retry, nextAttemptAt: Date.now() + delay };
    await writeQueue(uid, ops);
    return false;
  }
}



