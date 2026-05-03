import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL or NEON_DATABASE_URL must be set. Ensure the database is provisioned.");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: { url },
});
