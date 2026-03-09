// src/db/firebaseAdmin.ts
// ТІЛЬКИ серверний Firebase Admin SDK
// Використовується виключно в api routes — ніколи в компонентах або hooks

if (typeof window !== "undefined") {
  throw new Error(
    "[firebaseAdmin] This module must only be used on the server. " +
      "Do not import it in components, hooks, or client-side code.",
  );
}

// Lazy initialization — Firebase Admin ініціалізується лише при першому запиті,
// а не під час build (запобігає помилці build коли env vars відсутні).
let _admin: any = null;

function getFirebaseAdmin() {
  if (_admin) return _admin;

  // require замість import — не потрапляє в клієнтський бандл при статичному аналізі
  const admin = require("firebase-admin");

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
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
    adminDb: admin.database(),
  };
}
