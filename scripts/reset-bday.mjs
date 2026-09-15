import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

const db = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL,
    },
  },
});

async function run() {
  await db.user.update({
    where: { email: "bdaytj76@gmail.com" },
    data: { role: "STUDENT" },
  });
  console.log("✓ bdaytj76@gmail.com set to STUDENT");
}

run().catch(console.error).finally(() => db.$disconnect());
