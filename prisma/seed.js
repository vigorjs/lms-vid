import "dotenv/config";
import { hash } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const passwordHash = await hash(process.env.DEMO_PASSWORD || "Demo123!", {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
});

const users = [
  ["Administrator", process.env.SEED_ADMIN_EMAIL || "admin@local.test", "ADMIN"],
  ["Budi Santoso", "teacher@local.test", "TEACHER"],
  ["Siti Rahma", "student@local.test", "STUDENT"],
];

for (const [name, email, role] of users) {
  await db.user.upsert({
    where: { email },
    update: { name, role, status: "ACTIVE" },
    create: { name, email, role, passwordHash },
  });
}

await db.category.upsert({
  where: { slug: "renang" },
  update: {},
  create: {
    name: "Renang",
    slug: "renang",
    description: "Teknik dasar dan lanjutan olahraga renang.",
  },
});

await db.$disconnect();
console.log("Seed selesai. Password akun demo:", process.env.DEMO_PASSWORD || "Demo123!");
