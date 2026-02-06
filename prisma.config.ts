import "dotenv/config";
import { defineConfig } from "prisma/config";

// → PRISMA CONFIGURATION: Schema and migration paths
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
