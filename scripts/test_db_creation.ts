import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    await db.execute(sql`CREATE DATABASE uat_neondb`);
    console.log('Database created successfully!');
  } catch (e: any) {
    console.error('Failed to create database:', e.message);
  }
}
run().catch(console.error);
