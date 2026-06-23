const { Client } = require('pg');

async function main() {
  const dbUrl = 'postgresql://postgres:c$a$jnneJ,A5gxE@db.moolnigpzrcdgbuzrcrg.supabase.co:6543/postgres';

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('=== TABLES ===');
    console.log(res.rows.map(r => r.table_name));
    
    const countRes = await client.query('SELECT COUNT(*) FROM users');
    console.log('Users count:', countRes.rows[0].count);
  } catch (err) {
    console.error('Connection failed:', err.message);
  } finally {
    await client.end();
  }
}

main();
