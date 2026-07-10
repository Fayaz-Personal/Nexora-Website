const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:c$a$jnneJ,A5gxE@db.moolnigpzrcdgbuzrcrg.supabase.co:6543/postgres';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Migrating bookings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS room_bookings (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES student_profiles(id) ON DELETE CASCADE,
        accommodation_id INTEGER REFERENCES accommodations(id) ON DELETE CASCADE,
        check_in_date DATE NOT NULL,
        check_out_date DATE NOT NULL,
        guests_count INTEGER NOT NULL,
        total_cost NUMERIC(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Bookings table created successfully!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
