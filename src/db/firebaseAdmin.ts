// src/db/firebaseAdmin.ts
// ТІЛЬКИ серверний Firebase Admin SDK
// Використовується виключно в pages/api/* — ніколи в компонентах або hooks

if (typeof window !== "undefined") {
  throw new Error(
    "[firebaseAdmin] This module must only be used on the server. " +
      "Do not import it in components, hooks, or client-side code.",
  );
}

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

export const adminAuth = admin.auth();
export default admin;

export function getAdmin() {
  return {
    admin,
    adminAuth: admin.auth(),
    adminDb: admin.database(),
  };
}
