import { MockAuth } from './mockFirebase';

let authModule: any;

try {
    authModule = require('@react-native-firebase/auth').default;
} catch (e) {
    console.log('Native Auth not found, using Mock implementation.');
    authModule = (() => MockAuth) as any;
}

export const getAuth = () => {
    try {
        if (authModule === MockAuth) return MockAuth;
        return authModule();
    } catch {
        return MockAuth;
    }
};

// Export other auth functions safely
export const signInWithEmailAndPassword = (authInstance: any, email: string, val: string) => {
    if (authInstance === MockAuth) return MockAuth.signInWithEmailAndPassword(email, val);
    return authModule.signInWithEmailAndPassword(authInstance, email, val);
};

export const createUserWithEmailAndPassword = (authInstance: any, email: string, val: string) => {
    if (authInstance === MockAuth) return MockAuth.createUserWithEmailAndPassword(email, val);
    return authModule.createUserWithEmailAndPassword(authInstance, email, val);
};

export const onAuthStateChanged = (authInstance: any, callback: any) => {
    if (authInstance === MockAuth) return MockAuth.onAuthStateChanged(callback);
    return authModule.onAuthStateChanged(authInstance, callback);
};

export const sendPasswordResetEmail = (authInstance: any, email: string) => {
    if (authInstance === MockAuth) return Promise.resolve();
    return authModule.sendPasswordResetEmail(authInstance, email);
};

export const signInWithCredential = (authInstance: any, credential: any) => {
    if (authInstance === MockAuth) return Promise.resolve({ user: MockAuth.currentUser });
    return authModule.signInWithCredential(authInstance, credential);
};

export const GoogleAuthProvider = {
    credential: (token: string) => ({ token, providerId: 'google.com' })
};
export const EmailAuthProvider = {
    credential: (email: string, pass: string) => ({ email, pass, providerId: 'password' })
};

const defaultAuth = () => {
    return getAuth();
};
// Attach statics if native module has them, or mock them
Object.assign(defaultAuth, authModule || MockAuth);

// Basic mock types for FirebaseAuthTypes
export namespace FirebaseAuthTypes {
    export interface User {
        uid: string;
        email: string | null;
        [key: string]: any;
    }
}

export default defaultAuth;

