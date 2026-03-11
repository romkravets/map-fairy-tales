// src/db/mongodb.ts
// Singleton MongoDB connection — reuses connection across hot-reloads in dev
// and across serverless function invocations in Vercel.

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

// In development Next.js uses hot reload — store connection in global to avoid
// opening a new connection on every module re-evaluation.
declare global {
  // eslint-disable-next-line no-var
  var _mongooseConn: typeof mongoose | null;
}

let cached = global._mongooseConn ?? null;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached && mongoose.connection.readyState === 1) return cached;

  try {
    const conn = await mongoose.connect(MONGODB_URI!, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    cached = conn;
    global._mongooseConn = conn;
    return conn;
  } catch (err) {
    // Fail fast and surface the error to the caller so the route
    // can return a 5xx instead of causing upstream timeouts (504).
    // eslint-disable-next-line no-console
    console.error("MongoDB connection error:", err);
    throw err;
  }
}
