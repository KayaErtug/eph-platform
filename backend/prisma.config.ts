import "dotenv/config";
import { defineConfig } from "prisma/config";

const datasourceUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/eph";

export default defineConfig({
  schema: "prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: datasourceUrl,
  },
});
