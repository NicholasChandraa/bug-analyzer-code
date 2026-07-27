import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbUrl = process.env.DATABASE_URL;
const sql = postgres(dbUrl, { max: 1 });

try {
  console.log('Updating PostgreSQL schema for repository_source_type...');
  
  try {
    await sql`CREATE TYPE repository_source_type AS ENUM ('remote', 'local');`;
    console.log('✔ Enum repository_source_type created');
  } catch (err) {
    if (err.code === '42710') {
      console.log('Enum repository_source_type already exists, skipping');
    } else {
      console.warn('Enum warning:', err.message);
    }
  }

  try {
    await sql`ALTER TABLE repositories ADD COLUMN IF NOT EXISTS source_type repository_source_type DEFAULT 'remote' NOT NULL;`;
    console.log('✔ Column source_type added to repositories table');
  } catch (err) {
    console.warn('Column add warning:', err.message);
  }

  await sql.end();
  console.log('✔ Schema update finished successfully!');
  process.exit(0);
} catch (err) {
  console.error('Schema update failed:', err);
  await sql.end();
  process.exit(1);
}
