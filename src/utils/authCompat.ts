import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

const authModule = auth;

export const getAuth = () => {
    return auth();
};

export const signInWithEmailAndPassword = (authInstance: FirebaseAuthTypes.Module, email: string, val: string) => {
    return authInstance.signInWithEmailAndPassword(email, val);
};

export const createUserWithEmailAndPassword = (authInstance: FirebaseAuthTypes.Module, email: string, val: string) => {
    return authInstance.createUserWithEmailAndPassword(email, val);
};

export const onAuthStateChanged = (authInstance: FirebaseAuthTypes.Module, callback: any) => {
    return authInstance.onAuthStateChanged(callback);
};

export const sendPasswordResetEmail = (authInstance: FirebaseAuthTypes.Module, email: string) => {
    return authInstance.sendPasswordResetEmail(email);
};

export const signInWithCredential = (authInstance: FirebaseAuthTypes.Module, credential: any) => {
    return authInstance.signInWithCredential(credential);
};

export const GoogleAuthProvider = auth.GoogleAuthProvider;
export const EmailAuthProvider = auth.EmailAuthProvider;

const defaultAuth = () => {
    return getAuth();
};
// Attach statics safely
Object.assign(defaultAuth, auth);

export { FirebaseAuthTypes };
export default defaultAuth;

