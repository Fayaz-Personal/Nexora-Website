const { predictAdmissionChance } = require('../src/app/actions/recommendations');

// Set up process.env from .env.local manually since running standalone node script
const fs = require('fs');
if (fs.existsSync('.env.local')) {
  const env = fs.readFileSync('.env.local', 'utf8');
  env.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/\\/g, '').replace(/"/g, '');
    }
  });
}

async function run() {
  console.log('Running test predictAdmissionChance...');
  console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY ? 'Present' : 'Missing');
  
  // We need to pass a targetUnivId. Let's fetch one from database first
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const res = await pool.query('SELECT id, name FROM universities LIMIT 1');
  const targetUnivId = res.rows[0].id;
  console.log('Target School:', res.rows[0].name, 'ID:', targetUnivId);
  await pool.end();

  const input = {
    degree: 'BTech',
    department: 'Computer Science',
    cgpa: 9.01,
    ielts: 7.5,
    toefl: 100,
    greScore: '320',
    projects: 3,
    researchPapers: 1,
    workExperience: 12,
    targetUnivId: targetUnivId,
    targetCourse: 'MS in botany'
  };

  const result = await predictAdmissionChance(input);
  console.log('Result:', JSON.stringify(result, null, 2));
}

run().catch(console.error);
