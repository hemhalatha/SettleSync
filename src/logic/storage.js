/**
 * Authentication & Storage Layer
 * Uses Firebase Auth + Firestore when configured, falls back to localStorage
 */
import {
    auth,
    db,
    isFirebaseConfigured
} from '../firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { seedInitialData } from './firestoreService';

const USERS_KEY = 'settlesync_users';
const CURRENT_USER_KEY = 'settlesync_current_user';

// ─── Auth Functions ─────────────────────────────────────────

/**
 * Login User
 */
export const loginUser = async (identifier, password) => {
    if (isFirebaseConfigured()) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, identifier, password);
            const user = userCredential.user;
            const session = {
                uid: user.uid,
                email: user.email,
                username: user.email.split('@')[0],
                onboarded: true // Assume onboarded if they have a firebase account for now
            };
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(session));
            await seedInitialData(user.uid); // Ensure data is present
            return session;
        } catch (error) {
            console.error('Firebase Auth Error:', error.message);
            throw error;
        }
    }

    // Local Storage Mock Auth
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const user = users.find(
        (u) => (u.username === identifier || u.email === identifier) && u.password === password
    );
    if (user) {
        const session = { ...user };
        delete session.password;
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(session));
        return session;
    }
    throw new Error('Invalid credentials');
};

/**
 * Signup User
 */
export const signupUser = async (username, email, password) => {
    if (isFirebaseConfigured()) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const session = {
                uid: user.uid,
                email: user.email,
                username: username,
                onboarded: false
            };
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(session));
            await seedInitialData(user.uid);
            return session;
        } catch (error) {
            throw error;
        }
    }

    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    if (users.find((u) => u.username === username || u.email === email)) {
        throw new Error('User already exists');
    }
    const newUser = { username, email, password, onboarded: false, bankDetails: null };
    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    const session = { ...newUser };
    delete session.password;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(session));
    return session;
};

export const logoutUser = async () => {
    if (isFirebaseConfigured()) {
        await signOut(auth);
    }
    localStorage.removeItem(CURRENT_USER_KEY);
};

export const getCurrentUser = () => {
    const userJson = localStorage.getItem(CURRENT_USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
};

export const updateOnboarding = async (bankDetails) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return null;

    if (isFirebaseConfigured()) {
        // Here you would update Firestore profile
        // For now we just update local session
    }

    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const userIndex = users.findIndex((u) => u.username === currentUser.username || u.uid === currentUser.uid);

    if (userIndex !== -1) {
        users[userIndex].onboarded = true;
        users[userIndex].bankDetails = bankDetails;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        const session = { ...users[userIndex] };
        delete session.password;
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(session));
        return session;
    }
    return null;
};

// Initial state listener
export const initAuthState = (callback) => {
    if (isFirebaseConfigured()) {
        return onAuthStateChanged(auth, (user) => {
            if (user) {
                const session = {
                    uid: user.uid,
                    email: user.email,
                    username: user.email.split('@')[0],
                    onboarded: true
                };
                localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(session));
                callback(session);
            } else {
                callback(null);
            }
        });
    }
    callback(getCurrentUser());
    return () => { };
};
export const updateUserSettings = async (settings) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return null;

    if (isFirebaseConfigured()) {
        // Here you would normally update the Firestore merchants collection
        // For now, we update the local session state
    }

    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const userIndex = users.findIndex((u) => u.username === currentUser.username || u.uid === currentUser.uid);

    if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...settings };
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        const session = { ...users[userIndex] };
        delete session.password;
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(session));
        return session;
    }
    return null;
};
