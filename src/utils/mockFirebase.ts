
// Mock implementation for Firebase services to support Expo Go
import AsyncStorage from '@react-native-async-storage/async-storage';

class MockAuthClass {
    _currentUser: any;
    _listeners: Function[] = [];

    constructor() {
        // Start with a default user for convenience, or null if strictly testing flow
        this._currentUser = {
            uid: 'mock-user-123',
            email: 'mock@dailyflow.app',
            emailVerified: true,
            isAnonymous: false,
            providerData: [],
            updateProfile: () => Promise.resolve(),
            updateEmail: () => Promise.resolve(),
            updatePassword: () => Promise.resolve(),
            sendEmailVerification: () => Promise.resolve(),
        };
    }

    get currentUser() {
        return this._currentUser;
    }

    onAuthStateChanged(listener: any) {
        this._listeners.push(listener);
        listener(this._currentUser);
        return () => {
            this._listeners = this._listeners.filter(l => l !== listener);
        };
    }

    async signInWithEmailAndPassword(email: string, pass: string) {
        if (email === 'fail@test.com') throw new Error('User not found');
        this._currentUser = {
            uid: 'mock-user-123',
            email: email,
            emailVerified: true,
            isAnonymous: false,
            providerData: [],
            updateProfile: () => Promise.resolve(),
            updateEmail: () => Promise.resolve(),
            updatePassword: () => Promise.resolve(),
            sendEmailVerification: () => Promise.resolve(),
        };
        this._notifyListeners();
        return { user: this._currentUser };
    }

    async createUserWithEmailAndPassword(email: string, pass: string) {
        const newUid = 'mock-user-' + Math.floor(Math.random() * 10000);
        this._currentUser = {
            uid: newUid,
            email: email,
            emailVerified: false,
            isAnonymous: false,
            providerData: [],
            updateProfile: () => Promise.resolve(),
            updateEmail: () => Promise.resolve(),
            updatePassword: () => Promise.resolve(),
            sendEmailVerification: () => Promise.resolve(),
        };
        this._notifyListeners();
        return { user: this._currentUser };
    }

    async signOut() {
        this._currentUser = null;
        this._notifyListeners();
    }

    async sendPasswordResetEmail(email: string) {
        return Promise.resolve();
    }

    _notifyListeners() {
        this._listeners.forEach(l => l(this._currentUser));
    }
}

export const MockAuth = new MockAuthClass();

class MockFirestoreQuery {
    protected _collection: string;
    protected _constraints: any[];

    constructor(collection: string, constraints: any[] = []) {
        this._collection = collection;
        this._constraints = constraints;
    }

    where(field: string, op: string, value: any) {
        return new MockFirestoreQuery(this._collection, [...this._constraints, { type: 'where', field, op, value }]);
    }

    orderBy(field: string, direction = 'asc') {
        return new MockFirestoreQuery(this._collection, [...this._constraints, { type: 'orderBy', field, direction }]);
    }

    limit(n: number) {
        return new MockFirestoreQuery(this._collection, [...this._constraints, { type: 'limit', value: n }]);
    }

    onSnapshot(next: any, error: any) {
        console.log(`MockFirestoreQuery.onSnapshot called for ${this._collection} with ${this._constraints.length} constraints`);
        // Simulate async data return
        setTimeout(async () => {
            // Return empty or mock data
            let mockDocs = await this._getMockData() || [];
            mockDocs = this._applyConstraints(mockDocs);

            const snapshot = {
                docs: (mockDocs || []).map(d => ({
                    id: d.id,
                    data: () => d,
                    ref: { id: d.id, path: `${this._collection}/${d.id}`, parent: { id: this._collection } }
                })),
                empty: (mockDocs || []).length === 0,
                forEach: (cb: any) => (mockDocs || []).forEach(d => cb({ id: d.id, data: () => d, ref: { id: d.id, path: `${this._collection}/${d.id}` } }))
            };
            next(snapshot);

        }, 100);
        return () => { };
    }

    async get() {
        let mockDocs = await this._getMockData() || [];
        mockDocs = this._applyConstraints(mockDocs);
        return {
            docs: mockDocs.map(d => ({
                id: d.id,
                data: () => d,
                ref: { id: d.id, path: `${this._collection}/${d.id}`, parent: { id: this._collection } }
            })),
            empty: mockDocs.length === 0,
            forEach: (cb: any) => mockDocs.forEach(d => cb({ id: d.id, data: () => d, ref: { id: d.id, path: `${this._collection}/${d.id}` } }))
        };
    }

    _applyConstraints(docs: any[]) {
        let filtered = [...docs];
        for (const c of this._constraints) {
            if (c.type === 'where') {
                filtered = filtered.filter(d => {
                    const val = d[c.field];
                    if (c.op === '==') return val === c.value;
                    if (c.op === 'array-contains') return Array.isArray(val) && val.includes(c.value);
                    return true; // Other ops ignored for mock simplicity
                });
            }
            if (c.type === 'orderBy') {
                // Simple sort
                filtered.sort((a, b) => {
                    const va = a[c.field];
                    const vb = b[c.field];
                    // Handle Timestamp objects if present
                    const valA = va?.toMillis ? va.toMillis() : va;
                    const valB = vb?.toMillis ? vb.toMillis() : vb;
                    if (valA < valB) return c.direction === 'desc' ? 1 : -1;
                    if (valA > valB) return c.direction === 'desc' ? -1 : 1;
                    return 0;
                });
            }
            if (c.type === 'limit') {
                filtered = filtered.slice(0, c.value);
            }
        }
        return filtered;
    }

    async _getMockData() {
        // In a real mock, we would read from AsyncStorage
        // For now, return some static data for 'tasks'
        if (this._collection === 'tasks') {
            const now = MockTimestamp.now();
            return [
                { id: '1', text: 'Przykładowe zadanie 1', completed: false, category: 'work', userId: 'mock-user-123', status: 'active', createdAt: now, priority: 3, deadline: now },
                { id: '2', text: 'Zadanie ukończone', completed: true, category: 'personal', userId: 'mock-user-123', status: 'active', createdAt: now, priority: 1 },
                // Add some archived tasks for testing ArchiveScreen
                { id: '3', text: 'Stare zadanie archiwalne', completed: true, category: 'work', userId: 'mock-user-123', status: 'archived', createdAt: now, completedAt: now, priority: 2, completedBy: 'Mock User', creatorNickname: 'Mock User' },
                { id: '4', text: 'Inne zadanie archiwalne', completed: true, category: 'personal', userId: 'mock-user-123', status: 'archived', createdAt: now, completedAt: now, priority: 1, completedBy: 'Mock User', creatorNickname: 'Mock User' },
            ];
        }
        if (this._collection === 'users') {
            return [{
                id: 'mock-user-123',
                nickname: 'Mock User',
                email: 'mock@dailyflow.app',
                points: 100,
                pairId: null, // Allow testing pairing later
                completedTasksCount: 2
            }];
        }
        if (this._collection === 'categories') {
            return [
                { id: 'cat1', name: 'Praca', color: '#ff0000', icon: 'briefcase', userId: 'mock-user-123', isDefault: true },
                { id: 'cat2', name: 'Dom', color: '#00ff00', icon: 'home', userId: 'mock-user-123', isDefault: true },
                { id: 'cat3', name: 'Zakupy', color: '#e67e22', icon: 'shopping-cart', userId: 'mock-user-123', isDefault: true },
                { id: 'cat4', name: 'Zdrowie', color: '#2ecc71', icon: 'activity', userId: 'mock-user-123', isDefault: true },
                { id: 'cat5', name: 'Finanse', color: '#f1c40f', icon: 'dollar-sign', userId: 'mock-user-123', isDefault: true },
                { id: 'cat6', name: 'Rozrywka', color: '#9b59b6', icon: 'film', userId: 'mock-user-123', isDefault: true },
                { id: 'cat7', name: 'Nauka', color: '#3498db', icon: 'book', userId: 'mock-user-123', isDefault: true },
                { id: 'cat8', name: 'Inne', color: '#95a5a6', icon: 'box', userId: 'mock-user-123', isDefault: true },
            ];
        }
        // Return publicUsers for invite lookup
        if (this._collection === 'publicUsers') {
            return [
                { id: 'mock-partner-456', nickname: 'Partner', emailLower: 'partner@example.com', photoURL: null }
            ];
        }
        if (this._collection === 'pairs') {
            return [];
        }
        return [];
    }
}

class MockCollectionReference extends MockFirestoreQuery {
    constructor(path: string) {
        super(path);
    }

    doc(path?: string) {
        return new MockDocumentReference(path ? `${this._collection}/${path}` : `${this._collection}/new-id-${Date.now()}`);
    }

    async add(data: any) {
        console.log('Mock Firestore Add:', this._collection, data);
        return { id: `mock-id-${Date.now()}` };
    }
}

class MockDocumentReference {
    path: string;
    id: string;
    parent: any = { id: 'mock-collection' }; // Added to satisfy isDocRef check

    constructor(path: string) {
        this.path = path;
        this.id = path.split('/').pop() || '';
    }

    async set(data: any, options?: any) {
        console.log('Mock Firestore Set:', this.path, data);
    }

    async update(data: any) {
        console.log('Mock Firestore Update:', this.path, data);
    }

    async delete() {
        console.log('Mock Firestore Delete:', this.path);
    }

    async get() {
        // Return dummy data
        return {
            exists: true,
            data: () => ({ id: this.id, mock: true })
        };
    }

    onSnapshot(next: any) {
        console.log(`MockDocumentReference.onSnapshot called for ${this.path}`);
        next({
            exists: true,
            data: () => ({ id: this.id, mock: true })
        });
        return () => { };
    }
}

export class MockTimestamp {
    seconds: number;
    nanoseconds: number;

    constructor(seconds: number, nanoseconds: number) {
        this.seconds = seconds;
        this.nanoseconds = nanoseconds;
    }

    toDate() {
        return new Date(this.seconds * 1000 + this.nanoseconds / 1000000);
    }

    toMillis() {
        return this.seconds * 1000 + this.nanoseconds / 1000000;
    }

    static now() {
        const now = new Date();
        return new MockTimestamp(Math.floor(now.getTime() / 1000), (now.getTime() % 1000) * 1000000);
    }

    static fromDate(date: Date) {
        return new MockTimestamp(Math.floor(date.getTime() / 1000), (date.getTime() % 1000) * 1000000);
    }
}

export const MockFirestore = {
    collection: (path: string) => new MockCollectionReference(path),
    doc: (path: string) => new MockDocumentReference(path),
    batch: () => ({
        set: () => { },
        update: () => { },
        delete: () => { },
        commit: async () => { }
    }),
    Timestamp: MockTimestamp,
    FieldValue: {
        increment: (n: number) => n,
        delete: () => 'deleted'
    }
};

