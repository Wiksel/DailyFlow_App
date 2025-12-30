import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

// Export a wrapper that checks if we are running in mock mode
export const getFirestore = () => {
  return firestore();
};

// Timestamp & FieldValue helpers
export const Timestamp = firestore.Timestamp;
export type Timestamp = FirebaseFirestoreTypes.Timestamp;
export const increment = (n: number) => firestore.FieldValue.increment(n);
export const deleteField = () => firestore.FieldValue.delete();

export const db = getFirestore();

// Compat types
export type CompatCollectionRef = FirebaseFirestoreTypes.CollectionReference;
export type CompatDocRef = FirebaseFirestoreTypes.DocumentReference;
export type CompatQuery = FirebaseFirestoreTypes.Query;
export type WhereFilterOp = FirebaseFirestoreTypes.WhereFilterOp;
export type OrderByDirection = 'asc' | 'desc';
export type QueryConstraint = (query: CompatQuery) => CompatQuery;

export function collection(_db: unknown, ...segments: string[]): CompatCollectionRef {
  const path = segments.join('/');
  return db.collection(path);
}

export function doc(source: unknown, ...segments: string[]): CompatDocRef {
  // Overloads supported similar to Web SDK
  if (source && typeof (source as any).doc === 'function') {
    const colRef = source as CompatCollectionRef;
    if (segments.length === 0) return colRef.doc();
    if (segments.length === 1) return colRef.doc(segments[0]);
  }
  if (segments.length === 1 && segments[0].includes('/')) {
    return getFirestore().doc(segments[0]);
  }
  const path = segments.join('/');
  // If called as doc(db, 'col', 'id', ...)
  return getFirestore().doc(path);
}

export async function addDoc(col: CompatCollectionRef, data: Record<string, unknown>) {
  const ref = await col.add(data as any);
  return ref;
}

export async function updateDoc(ref: CompatDocRef, data: Record<string, unknown>) {
  return ref.update(data as any);
}

export async function deleteDoc(ref: CompatDocRef) {
  return ref.delete();
}

export async function setDoc(ref: CompatDocRef, data: Record<string, unknown>, options?: { merge?: boolean }) {
  if (options && options.merge) {
    return ref.set(data as any, { merge: true });
  }
  return ref.set(data as any);
}

export function writeBatch(_db?: unknown) {
  const batch = getFirestore().batch();
  return {
    set(ref: CompatDocRef, data: Record<string, unknown>, options?: { merge?: boolean }) {
      return options && options.merge ? batch.set(ref, data as any, { merge: true }) : batch.set(ref, data as any);
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

export function where(fieldPath: string, opStr: WhereFilterOp, value: any): QueryConstraint {
  return (q: CompatQuery) => q.where(fieldPath, opStr as any, value);
}

export function orderBy(fieldPath: string, directionStr?: OrderByDirection): QueryConstraint {
  return (q: CompatQuery) => (directionStr ? q.orderBy(fieldPath, directionStr as any) : q.orderBy(fieldPath));
}

export function limit(n: number): QueryConstraint {
  return (q: CompatQuery) => q.limit(n);
}

export function query(col: CompatCollectionRef, ...constraints: QueryConstraint[]): CompatQuery {
  let q: CompatQuery = col;
  for (const c of constraints) q = c(q);
  return q;
}

export type DocSnapshotCompat = { exists: () => boolean; data: () => any };
export async function getDoc(ref: CompatDocRef): Promise<DocSnapshotCompat> {
  const snap = await ref.get();
  return { exists: () => snap.exists, data: () => (snap.data() as any) };
}

export type QueryDocCompat = { id: string; data: () => any; ref: CompatDocRef };
export type QuerySnapshotCompat = { empty: boolean; docs: QueryDocCompat[]; forEach: (cb: (d: QueryDocCompat) => void) => void };
export async function getDocs(q: CompatQuery): Promise<QuerySnapshotCompat> {
  const snap = await q.get();
  const docs: QueryDocCompat[] = snap.docs.map((d: any) => ({ id: d.id, data: () => (d.data() as any), ref: d.ref }));
  return { empty: snap.empty, docs, forEach: (cb) => docs.forEach(cb) };
}

export function onSnapshot(source: CompatDocRef, next: (snapshot: DocSnapshotCompat) => void, error?: (e: any) => void): () => void;
export function onSnapshot(source: CompatQuery | CompatCollectionRef, next: (snapshot: QuerySnapshotCompat) => void, error?: (e: any) => void): () => void;
export function onSnapshot(
  source: CompatQuery | CompatCollectionRef | CompatDocRef,
  next: ((snapshot: QuerySnapshotCompat) => void) | ((snapshot: DocSnapshotCompat) => void),
  error?: (e: any) => void,
): () => void {
  const isDocRef = (ref: any) => typeof ref?.id === 'string' && typeof ref?.path === 'string' && typeof ref?.parent !== 'undefined' && typeof (ref as any).get === 'function';
  if (isDocRef(source)) {
    const unsubscribe = (source as CompatDocRef).onSnapshot(
      (snap: any) => (next as any)({ exists: () => snap.exists, data: () => (snap.data() as any) }),
      error,
    );
    return unsubscribe;
  }
  const unsubscribe = (source as any).onSnapshot(
    (snap: FirebaseFirestoreTypes.QuerySnapshot) => {
      // Create a compatible snapshot object that matches what the context expects
      // but also includes the original docs mapped to our compat format.
      const compatSnapshot = {
        ...snap,
        docs: (snap.docs || []).map((d) => ({
          id: d.id,
          data: () => (d.data() as any),
          ref: d.ref
        })),
        empty: snap.empty,
        forEach: (cb: (d: QueryDocCompat) => void) => {
          snap.docs.forEach((d) => cb({
            id: d.id,
            data: () => (d.data() as any),
            ref: d.ref
          }));
        }
      };
      (next as any)(compatSnapshot);
    },
    error,
  );

  return unsubscribe;
}

