import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client.ts";

const globalForDb = globalThis;

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
  return new PrismaClient({ adapter, log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] });
}

export const db = globalForDb.__pjokvidDb || createClient();

if (process.env.NODE_ENV !== "production") globalForDb.__pjokvidDb = db;
