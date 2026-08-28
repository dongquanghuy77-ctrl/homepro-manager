import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
const sql = neon(process.env.DATABASE_URL);
const res = await sql`SELECT r.id, r.task_id, r.estimated_hours, t.title, t.status, t.tags FROM pwr_task_resources r JOIN pwr_tasks t ON r.task_id = t.id`;
console.log(JSON.stringify(res, null, 2));
