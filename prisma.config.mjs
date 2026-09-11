import "dotenv/config";
import { defineConfig, env } from "prisma/config";

function migrationUrl() {
  const value = process.env.DIRECT_URL || env("DATABASE_URL");
  if (value.includes("connect_timeout=")) return value;
  return `${value}${value.includes("?") ? "&" : "?"}connect_timeout=30`;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.js",
  },
  datasource: {
    url: migrationUrl(),
  },
});
