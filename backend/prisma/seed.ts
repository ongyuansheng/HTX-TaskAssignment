import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const frontend = await prisma.skill.upsert({
    where: { name: "Frontend" },
    update: {},
    create: { name: "Frontend" },
  });

  const backend = await prisma.skill.upsert({
    where: { name: "Backend" },
    update: {},
    create: { name: "Backend" },
  });

  const alice = await prisma.developer.upsert({
    where: { name: "Alice" },
    update: {},
    create: { name: "Alice" },
  });

  const bob = await prisma.developer.upsert({
    where: { name: "Bob" },
    update: {},
    create: { name: "Bob" },
  });

  const carol = await prisma.developer.upsert({
    where: { name: "Carol" },
    update: {},
    create: { name: "Carol" },
  });

  const dave = await prisma.developer.upsert({
    where: { name: "Dave" },
    update: {},
    create: { name: "Dave" },
  });

  await prisma.developerSkill.createMany({
    data: [
      { developerId: alice.id, skillId: frontend.id },
      { developerId: bob.id, skillId: backend.id },
      { developerId: carol.id, skillId: frontend.id },
      { developerId: carol.id, skillId: backend.id },
      { developerId: dave.id, skillId: backend.id },
    ],
    skipDuplicates: true,
  });

  console.log("Database seeded successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
