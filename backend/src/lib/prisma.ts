import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";

dotenv.config({
  path: fileURLToPath(new URL("../../.env", import.meta.url)),
});

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
