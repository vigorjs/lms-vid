import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client.ts";

const globalForDb = globalThis;

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const dbTransactionOptions = Object.freeze({
  maxWait: positiveInteger(process.env.DATABASE_TRANSACTION_MAX_WAIT_MS, 10_000),
  timeout: positiveInteger(process.env.DATABASE_TRANSACTION_TIMEOUT_MS, 15_000),
});

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL belum dikonfigurasi.");
  const configuredPoolMax = Number(process.env.DATABASE_POOL_MAX || (process.env.VERCEL ? 1 : 5));
  const adapter = new PrismaPg({
    connectionString,
    max: Number.isInteger(configuredPoolMax) && configuredPoolMax > 0 ? configuredPoolMax : 1,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 10_000,
  });
  return new PrismaClient({
    adapter,
    transactionOptions: dbTransactionOptions,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const db = globalForDb.__pjokvidDb || createClient();

if (process.env.NODE_ENV !== "production") globalForDb.__pjokvidDb = db;
