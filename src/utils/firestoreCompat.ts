import {
  getFirestore,
  collection as fsCollection,
  doc as fsDoc,
  addDoc as fsAddDoc,
  updateDoc as fsUpdateDoc,
  deleteDoc as fsDeleteDoc,
  setDoc as fsSetDoc,
  getDoc as fsGetDoc,
  getDocs as fsGetDocs,
  onSnapshot as fsOnSnapshot,
  query as fsQuery,
  where as fsWhere,
  orderBy as fsOrderBy,
  limit as fsLimit,
  writeBatch as fsWriteBatch,
  Timestamp as FsTimestamp,
  increment as fsIncrement,
  deleteField as fsDeleteField,
  Query,
  CollectionReference,
  DocumentReference,
  QueryConstraint as FsQueryConstraint,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export type Timestamp = FsTimestamp;
export const Timestamp = FsTimestamp;
export const increment = fsIncrement;
export const deleteField = fsDeleteField;

export type CompatCollectionRef = CollectionReference;
export type CompatDocRef = DocumentReference;
export type CompatQuery = Query;

export function collection(_db: unknown, ...segments: string[]): CompatCollectionRef {
  if (segments.length === 1 && segments[0].includes('/')) {
    return fsCollection(getFirestore(), segments[0]);
  }
  const [first, ...rest] = segments;
  return fsCollection(getFirestore(), first, ...rest);
}

export function doc(source: unknown, ...segments: string[]): CompatDocRef {
  // Overloads supported:
  // - doc(db, 'col', 'id', ...)
  // - doc(db, 'col/id[/sub/id]')
  // - doc(collectionRef)
  // - doc(collectionRef, 'id')
  if (typeof source === 'object' && source !== null && ('path' in (source as any))) {
    const colRef = source as unknown as CompatCollectionRef;
    if (segments.length === 0) return fsDoc(colRef);
    if (segments.length === 1) return fsDoc(colRef, segments[0]);
  }
  if (segments.length === 1 && segments[0].includes('/')) {
    return fsDoc(getFirestore(), segments[0]);
  }
  const [first, ...rest] = segments;
  return fsDoc(getFirestore(), first, ...rest);
}

export async function addDoc(col: CompatCollectionRef, data: Record<string, unknown>) {
  return fsAddDoc(col, data);
}

export async function updateDoc(ref: CompatDocRef, data: Record<string, unknown>) {
  return fsUpdateDoc(ref, data as any);
}

export async function deleteDoc(ref: CompatDocRef) {
  return fsDeleteDoc(ref);
}

export async function setDoc(ref: CompatDocRef, data: Record<string, unknown>, options?: { merge?: boolean }) {
  if (options) {
    return fsSetDoc(ref, data as any, options as any);
  }
  return fsSetDoc(ref, data as any);
}

export function writeBatch(_db?: unknown) {
  const batch = fsWriteBatch(getFirestore());
  return {
    set(ref: CompatDocRef, data: Record<string, unknown>, options?: { merge?: boolean }) {
      return options ? batch.set(ref, data as any, options as any) : batch.set(ref, data as any);
    },
    update(ref: CompatDocRef, data: Record<string, unknown>) {
      return batch.update(ref, data as any);
    },
    delete(ref: CompatDocRef) {
      return batch.delete(ref);
    },
    commit() {
      return batch.commit();
    },
  };
}

export type WhereFilterOp = Parameters<typeof fsWhere>[1];
export type OrderByDirection = Parameters<typeof fsOrderBy>[1];
export type QueryConstraint = FsQueryConstraint;

export function where(fieldPath: string, opStr: WhereFilterOp, value: any): QueryConstraint {
  return fsWhere(fieldPath, opStr as any, value);
}

export function orderBy(fieldPath: string, directionStr?: OrderByDirection): QueryConstraint {
  return directionStr ? (fsOrderBy(fieldPath, directionStr as any) as any) : (fsOrderBy(fieldPath) as any);
}

export function limit(n: number): QueryConstraint {
  return fsLimit(n);
}

export function query(col: CompatCollectionRef, ...constraints: QueryConstraint[]): CompatQuery {
  return fsQuery(col, ...(constraints as any));
}

export type DocSnapshotCompat = { exists: () => boolean; data: () => any };
export async function getDoc(ref: CompatDocRef): Promise<DocSnapshotCompat> {
  const snap = await fsGetDoc(ref);
  return { exists: () => snap.exists(), data: () => snap.data() as any };
}

export type QueryDocCompat = { id: string; data: () => any; ref: CompatDocRef };
export type QuerySnapshotCompat = { empty: boolean; docs: QueryDocCompat[]; forEach: (cb: (d: QueryDocCompat) => void) => void };
export async function getDocs(q: CompatQuery): Promise<QuerySnapshotCompat> {
  const snap = await fsGetDocs(q);
  const docs: QueryDocCompat[] = snap.docs.map((d) => ({ id: d.id, data: () => d.data() as any, ref: d.ref }));
  return { empty: snap.empty, docs, forEach: (cb) => docs.forEach(cb) };
}

export function onSnapshot(source: CompatDocRef, next: (snapshot: DocSnapshotCompat) => void, error?: (e: any) => void): () => void;
export function onSnapshot(source: CompatQuery | CompatCollectionRef, next: (snapshot: QuerySnapshotCompat) => void, error?: (e: any) => void): () => void;
export function onSnapshot(
  source: CompatQuery | CompatCollectionRef | CompatDocRef,
  next: ((snapshot: QuerySnapshotCompat) => void) | ((snapshot: DocSnapshotCompat) => void),
  error?: (e: any) => void,
): () => void {
  const isDocRef = (ref: any) => typeof ref?.id === 'string' && typeof ref?.path === 'string' && typeof ref?.parent !== 'undefined';
  if (isDocRef(source)) {
    return fsOnSnapshot(source as CompatDocRef, (snap) => (next as any)({ exists: () => snap.exists(), data: () => snap.data() as any }), error);
  }
  return fsOnSnapshot(source as any, (snap) => {
    const docs: QueryDocCompat[] = (snap as any).docs.map((d: any) => ({ id: d.id, data: () => d.data() as any, ref: d.ref }));
    (next as any)({ empty: (snap as any).empty, docs, forEach: (cb: (d: QueryDocCompat) => void) => docs.forEach(cb) });
  }, error);
}


