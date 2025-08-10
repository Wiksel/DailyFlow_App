import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection, doc, updateDoc, deleteDoc, Firestore } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { getAuth } from '@react-native-firebase/auth';

type QueueAction = 'add' | 'update' | 'delete';

interface BaseOp {
  id: string;
  action: QueueAction;
  createdAt: number;
  retryCount: number;
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

async function readQueue(uid: string): Promise<PendingOp[]> {
  try { const raw = await AsyncStorage.getItem(OUTBOX_KEY(uid)); return raw ? JSON.parse(raw) : []; } catch { return []; }
}

async function writeQueue(uid: string, ops: PendingOp[]) {
  try { await AsyncStorage.setItem(OUTBOX_KEY(uid), JSON.stringify(ops)); } catch {}
}

function genId() { return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

export async function enqueueAdd(collectionPath: string, data: any) {
  const uid = getAuth().currentUser?.uid; if (!uid) return;
  const op: AddOp = { id: genId(), action: 'add', collectionPath, data, createdAt: Date.now(), retryCount: 0 };
  const ops = await readQueue(uid); ops.push(op); await writeQueue(uid, ops);
}

export async function enqueueUpdate(docPath: string, data: any) {
  const uid = getAuth().currentUser?.uid; if (!uid) return;
  const op: UpdateOp = { id: genId(), action: 'update', docPath, data, createdAt: Date.now(), retryCount: 0 };
  const ops = await readQueue(uid); ops.push(op); await writeQueue(uid, ops);
}

export async function enqueueDelete(docPath: string) {
  const uid = getAuth().currentUser?.uid; if (!uid) return;
  const op: DeleteOp = { id: genId(), action: 'delete', docPath, createdAt: Date.now(), retryCount: 0 } as DeleteOp;
  const ops = await readQueue(uid); ops.push(op); await writeQueue(uid, ops);
}

export async function processOutbox(maxOps: number = 20) {
  const uid = getAuth().currentUser?.uid; if (!uid) return;
  let ops = await readQueue(uid);
  if (ops.length === 0) return;
  const remaining: PendingOp[] = [];
  for (const op of ops.slice(0, maxOps)) {
    try {
      if (op.action === 'add') {
        await addDoc(collection(db, op.collectionPath), op.data);
      } else if (op.action === 'update') {
        await updateDoc(doc(db, op.docPath), op.data);
      } else if (op.action === 'delete') {
        await deleteDoc(doc(db, op.docPath));
      }
      // success → drop
    } catch (e) {
      // backoff and keep
      const next: PendingOp = { ...op, retryCount: (op.retryCount || 0) + 1 } as any;
      remaining.push(next);
    }
  }
  // append untouched tail
  remaining.push(...ops.slice(maxOps));
  await writeQueue(uid, remaining);
}


