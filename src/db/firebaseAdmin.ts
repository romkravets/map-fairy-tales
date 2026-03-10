// src/db/firebaseAdmin.ts
// Firebase Admin SDK — тільки для верифікації токенів (Auth).
// Дані зберігаються в MongoDB, тому adminDb більше не потрібен.

if (typeof window !== "undefined") {
  throw new Error(
    "[firebaseAdmin] This module must only be used on the server. " +
      "Do not import it in components, hooks, or client-side code.",
  );
}

// Lazy initialization — ініціалізується лише при першому запиті (не під час build).
let _admin: any = null;

function getFirebaseAdmin() {
  if (_admin) return _admin;

  const admin = require("firebase-admin");

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
          /\\n/g,
          "\n",
        ),
      }),
    });
  }

  _admin = admin;
  return admin;
}

export default getFirebaseAdmin;

export function getAdmin() {
  const admin = getFirebaseAdmin();
  return {
    admin,
    adminAuth: admin.auth(),
  };
}
