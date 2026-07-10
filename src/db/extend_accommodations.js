const { Client } = require('pg');
const fs = require('fs');

let connectionString = process.env.DATABASE_URL || 'postgresql://postgres:c$a$jnneJ,A5gxE@db.moolnigpzrcdgbuzrcrg.supabase.co:6543/postgres';
if (fs.existsSync('.env.local')) {
  const env = fs.readFileSync('.env.local', 'utf8');
  const match = env.match(/DATABASE_URL=(.+)/);
  if (match) {
    connectionString = match[1].trim().replace(/\\/g, '');
  }
}

async function run() {
  const client = new Client({ connectionString });
  console.log('Connecting to database...');
  await client.connect();
  console.log('Connected successfully!');

  try {
    console.log('Altering accommodations table check constraint...');
    // Drop constraint if it exists so we can insert any custom property type
    await client.query(`
      ALTER TABLE accommodations DROP CONSTRAINT IF EXISTS accommodations_type_check;
    `);

    console.log('Altering type column type...');
    await client.query(`
      ALTER TABLE accommodations ALTER COLUMN type TYPE VARCHAR(100);
    `);

    console.log('Adding new columns for property verification and details...');
    await client.query(`
      ALTER TABLE accommodations 
      ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(100),
      ADD COLUMN IF NOT EXISTS website VARCHAR(255),
      ADD COLUMN IF NOT EXISTS total_rooms INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS room_info_json JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS videos TEXT[] DEFAULT '{}';
    `);

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
