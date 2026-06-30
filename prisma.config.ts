import { config } from "dotenv";
config({ path: ".env.local" });
import { defineConfig, env } from "prisma/config";
import { createClient } from "@libsql/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const libsql = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export default defineConfig({
  schema: "prisma/schema.prisma",
  // @ts-ignore
  adapter: new PrismaLibSql(libsql),
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    path: "prisma/migrations",
  },
});
