import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

const envUAT = dotenv.parse(fs.readFileSync('.env.uat'));

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: envUAT.DATABASE_URL,
  },
});
