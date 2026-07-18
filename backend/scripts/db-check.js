import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('\x1b[31m[ERROR] DATABASE_URL is not set in backend/.env\x1b[0m');
  process.exit(1);
}

console.log('\x1b[36mChecking database connection...\x1b[0m');

// Configure with 1 max connection and a low timeout for quick check response
const sql = postgres(dbUrl, { max: 1, connect_timeout: 5 });

try {
  await sql`SELECT 1`;
  console.log('\x1b[32m✔ Database connection successful!\x1b[0m');
  await sql.end();
  process.exit(0);
} catch (err) {
  console.error('\x1b[31m[ERROR] Database connection failed! Please check your credentials in backend/.env\x1b[0m');
  console.error(`\x1b[33mError Details:\x1b[0m ${err.message}\n`);
  await sql.end();
  process.exit(1);
}
