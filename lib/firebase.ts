import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

/**
 * Firebase config — no secrets in code.
 *
 * Where to add your values:
 * 1. Create a file named .env in the project root (do not commit it).
 * 2. Copy .env.example to .env and fill in each EXPO_PUBLIC_FIREBASE_* variable.
 * 3. Get the values from Firebase Console → Project settings → Your apps → Web app config.
 *
 * Expo inlines EXPO_PUBLIC_* at build time; never commit .env.
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function getFirebase(): FirebaseApp {
  if (!app) {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      throw new Error(
        "Missing Firebase config. In the project root: copy .env.example to .env, fill in every EXPO_PUBLIC_FIREBASE_* value (from Firebase Console → Project settings → Your apps), then restart the dev server. Do not commit .env."
      );
    }
    app =
      getApps().length > 0
        ? (getApps()[0] as FirebaseApp)
        : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebase());
  }
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebase());
  }
  return db;
}
