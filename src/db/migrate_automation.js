const { Client } = require('pg');
const fs = require('fs');

let connectionString = 'postgresql://postgres.moolnigpzrcdgbuzrcrg:c$a$jnneJ,A5gxE@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';
if (fs.existsSync('.env.local')) {
  const env = fs.readFileSync('.env.local', 'utf8');
  const match = env.match(/DATABASE_URL=(.+)/);
  if (match) {
    connectionString = match[1].trim().replace(/\\/g, '');
  }
}

async function runMigration() {
  const client = new Client({ connectionString });
  console.log('Connecting to database for automation tables migration...');
  await client.connect();
  console.log('Connected successfully!');

  try {
    console.log('Creating pending_updates table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS pending_updates (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(100) NOT NULL,
        record_id INTEGER,
        old_data JSONB,
        new_data JSONB NOT NULL,
        confidence_score DECIMAL(5,2),
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Creating ai_activity_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_activity_logs (
        id SERIAL PRIMARY KEY,
        agent_name VARCHAR(100) NOT NULL,
        website VARCHAR(255) NOT NULL,
        records_collected INTEGER DEFAULT 0,
        records_updated INTEGER DEFAULT 0,
        success BOOLEAN DEFAULT TRUE,
        failure_reason TEXT,
        processing_time DECIMAL(10,2),
        status VARCHAR(50) DEFAULT 'completed',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Creating security_audit_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS security_audit_logs (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        description TEXT NOT NULL,
        ip_address VARCHAR(45),
        event_metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

runMigration();
