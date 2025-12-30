
// Mock implementation for Firebase services to support Expo Go
import AsyncStorage from '@react-native-async-storage/async-storage';

export const MockAuth = {
    currentUser: {
        uid: 'mock-user-123',
        email: 'mock@dailyflow.app',
        displayName: 'Mock User',
        photoURL: null,
        emailVerified: true,
        isAnonymous: false,
        providerData: [],
        metadata: {
            creationTime: new Date().toISOString(),
            lastSignInTime: new Date().toISOString(),
        },
        // Mock methods
        getIdToken: async () => 'mock-token',
        reload: async () => { },
        sendEmailVerification: async () => { },
        updateProfile: async () => { },
        updateEmail: async () => { },
        updatePassword: async () => { },
        delete: async () => { },
    },
    onAuthStateChanged: (callback: (user: any) => void) => {
        callback(MockAuth.currentUser);
        return () => { }; // Unsubscribe function
    },
    signInWithEmailAndPassword: async (email?: string, password?: string) => ({ user: MockAuth.currentUser }),
    createUserWithEmailAndPassword: async (email?: string, password?: string) => ({ user: MockAuth.currentUser }),
    signOut: async () => { },
};

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
            const mockDocs = await this._getMockData() || [];
            const snapshot = {
                docs: (mockDocs || []).map(d => ({
                    id: d.id,
                    data: () => d,
                    ref: { id: d.id, path: `${this._collection}/${d.id}` }
                })),
                empty: (mockDocs || []).length === 0,
                forEach: (cb: any) => (mockDocs || []).forEach(d => cb({ id: d.id, data: () => d }))
            };
            next(snapshot);

        }, 100);
        return () => { };
    }

    async get() {
        const mockDocs = await this._getMockData() || [];
        return {
            docs: mockDocs.map(d => ({
                id: d.id,
                data: () => d,
                ref: { id: d.id, path: `${this._collection}/${d.id}` }
            })),
            empty: mockDocs.length === 0,
            forEach: (cb: any) => mockDocs.forEach(d => cb({ id: d.id, data: () => d }))
        };
    }

    async _getMockData() {
        // In a real mock, we would read from AsyncStorage
        // For now, return some static data for 'tasks'
        if (this._collection === 'tasks') {
            return [
                { id: '1', text: 'Przykładowe zadanie 1', completed: false, category: 'work', userId: 'mock-user-123', status: 'active', createdAt: MockTimestamp.now() },
                { id: '2', text: 'Zadanie ukończone', completed: true, category: 'personal', userId: 'mock-user-123', status: 'active', createdAt: MockTimestamp.now() },
            ];
        }
        if (this._collection === 'users') {
            return [{
                id: 'mock-user-123',
                nickname: 'Mock User',
                email: 'mock@dailyflow.app',
                points: 100
            }];
        }
        if (this._collection === 'categories') {
            return [
                { id: 'cat1', name: 'Praca', color: '#ff0000', icon: 'briefcase', userId: 'mock-user-123', isDefault: true },
                { id: 'cat2', name: 'Dom', color: '#00ff00', icon: 'home', userId: 'mock-user-123', isDefault: true },
            ];
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

