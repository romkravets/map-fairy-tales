// src/db/firebase.ts
// ТІЛЬКИ клієнтський Firebase SDK
// Серверний код → імпортуй з @/db/firebaseAdmin

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";

let clientApp: FirebaseApp;

if (!getApps().length) {
  clientApp = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  });
} else {
  clientApp = getApps()[0];
}

export const auth = getAuth(clientApp);
export const db = getDatabase(clientApp);
export const GoogleProvider = new GoogleAuthProvider();

export default { auth, db, GoogleProvider };
