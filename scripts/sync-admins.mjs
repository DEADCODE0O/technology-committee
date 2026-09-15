import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

const dbUrl = process.env.DIRECT_URL || "postgresql://postgres.smtoufcupufupbfpwnuk:TechCommittee%242026SecureDbPass@aws-0-eu-central-1.pooler.supabase.com:5432/postgres";

const db = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

const admins = [
  { id: "72a1ae44-401b-4f54-bcde-f041904bec14", email: "admin@tech-committee.com" },
  { id: "63f5f2ca-674e-4eb4-bbe1-32f343430c4a", email: "ananymousgh255@gmail.com" },
  { id: "0f54af8f-c2ab-404f-b6d2-cb6d32915d70", email: "admin@tech-committee.local" },
  { id: "4029b45f-4f3b-42da-94b9-c696baaa8c44", email: "bdaytj76@gmail.com" },
];

async function syncPrismaAdmins() {
  for (const a of admins) {
    console.log(`Setting SUPER_ADMIN for ${a.email}...`);
    const existing = await db.user.findUnique({ where: { email: a.email } });
    if (existing) {
      await db.user.update({
        where: { email: a.email },
        data: {
          role: "SUPER_ADMIN",
          status: "ACTIVE",
        },
      });
      console.log(`✓ Updated ${a.email} to SUPER_ADMIN`);
    } else {
      await db.user.create({
        data: {
          id: a.id,
          email: a.email,
          role: "SUPER_ADMIN",
          status: "ACTIVE",
          provider: "EMAIL",
        },
      });
      console.log(`✓ Created ${a.email} as SUPER_ADMIN`);
    }
  }
}

syncPrismaAdmins()
  .catch(console.error)
  .finally(() => db.$disconnect());
