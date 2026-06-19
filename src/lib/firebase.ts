import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string,
};

const requiredKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
] as const;

for (const key of requiredKeys) {
  if (!firebaseConfig[key]) {
    throw new Error(
      `Missing Firebase configuration (${key}). Set VITE_FIREBASE_* variables in .env — see .env.example.`,
    );
  }
}

export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

let analytics: Analytics | null = null;

export async function initFirebaseAnalytics(): Promise<Analytics | null> {
  if (analytics) return analytics;
  if (typeof window === 'undefined') return null;

  const supported = await isSupported();
  if (!supported) return null;

  analytics = getAnalytics(app);
  return analytics;
}

export function getFirebaseAnalytics(): Analytics | null {
  return analytics;
}
