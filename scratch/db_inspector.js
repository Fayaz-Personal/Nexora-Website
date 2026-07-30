const { Client } = require('pg');

async function main() {
  const dbUrl = 'postgresql://postgres.moolnigpzrcdgbuzrcrg:c\$a\$jnneJ,A5gxE@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    console.log('=== USERS ===');
    const usersRes = await client.query('SELECT id, email, role, is_verified FROM users');
    console.log(usersRes.rows);

    console.log('\n=== STUDENT PROFILES ===');
    const profilesRes = await client.query('SELECT id, user_id, name, xp, level, ep, preferred_currency, preferred_countries FROM student_profiles');
    console.log(profilesRes.rows);
    
  } catch (err) {
    console.error('Failed:', err.message);
  } finally {
    await client.end();
  }
}

main();
