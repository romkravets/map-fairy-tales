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

  const conn = await mongoose.connect(MONGODB_URI!, {
    bufferCommands: false,
  });

  cached = conn;
  global._mongooseConn = conn;
  return conn;
}
