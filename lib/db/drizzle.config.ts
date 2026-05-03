import { defineConfig } from "drizzle-kit";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL or NEON_DATABASE_URL must be set. Ensure the database is provisioned.");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: { url },
});
