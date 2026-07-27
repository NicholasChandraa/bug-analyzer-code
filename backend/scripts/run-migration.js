import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbUrl = process.env.DATABASE_URL;
const sql = postgres(dbUrl, { max: 1 });

try {
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
  console.log('Existing tables:', tables.map((t) => t.table_name));

  // Ensure chat_sessions, messages, bug_reports exist
  await sql`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id serial PRIMARY KEY NOT NULL,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      repositoryId integer,
      title text NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL
    );
  `;
  console.log('✔ chat_sessions table verified/created');

  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id serial PRIMARY KEY NOT NULL,
      chat_session_id integer NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role message_role NOT NULL,
      content text NOT NULL,
      image_url text,
      created_at timestamp DEFAULT now() NOT NULL
    );
  `;
  console.log('✔ messages table verified/created');

  await sql`
    CREATE TABLE IF NOT EXISTS bug_reports (
      id serial PRIMARY KEY NOT NULL,
      chat_session_id integer NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      repository_id integer NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      file_path text NOT NULL,
      line_estimate text,
      reason text NOT NULL,
      suggested_fix text NOT NULL,
      status bug_report_status DEFAULT 'open' NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL
    );
  `;
  console.log('✔ bug_reports table verified/created');

  await sql.end();
  process.exit(0);
} catch (err) {
  console.error('Error:', err);
  await sql.end();
  process.exit(1);
}
