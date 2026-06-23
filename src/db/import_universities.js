const fs = require('fs');
const { Pool } = require('pg');

let connectionString = 'postgresql://postgres.moolnigpzrcdgbuzrcrg:c$a$jnneJ,A5gxE@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';
if (fs.existsSync('.env.local')) {
  const env = fs.readFileSync('.env.local', 'utf8');
  const match = env.match(/DATABASE_URL=(.+)/);
  if (match) {
    connectionString = match[1].trim().replace(/\\/g, '').replace(/"/g, '');
  }
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function run() {
  const rawData = fs.readFileSync('universities_parsed.json', 'utf8');
  const data = JSON.parse(rawData);
  const countries = data.countries;
  const universities = data.universities;

  // Use a Pool with a maximum of 20 connections
  const pool = new Pool({ connectionString, max: 20 });
  console.log("Connected to database pool.");

  // 1. Get existing countries & codes to prevent conflicts
  const existingCountriesRes = await pool.query("SELECT id, name, code FROM countries");
  const existingCountryMap = new Map();
  const existingCodes = new Set();

  existingCountriesRes.rows.forEach(c => {
    existingCountryMap.set(c.name.toLowerCase().trim(), c.id);
    existingCodes.add(c.code.toUpperCase());
  });

  console.log(`Loaded ${existingCountryMap.size} existing countries.`);

  // 2. Insert countries
  console.log(`Processing ${countries.length} countries...`);
  for (const country of countries) {
    const normName = country.name.toLowerCase().trim();
    if (existingCountryMap.has(normName)) {
      continue;
    }

    // Generate unique code
    let code = country.code.toUpperCase().replace(/[^A-Z]/g, '');
    if (!code) code = 'XX';
    const originalCode = code;
    let suffix = 1;
    while (existingCodes.has(code)) {
      code = (originalCode + suffix).substring(0, 10);
      suffix++;
    }
    existingCodes.add(code);

    const insertRes = await pool.query(
      `INSERT INTO countries (name, code, visa_info, average_living_cost, currency)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        country.name,
        code,
        `Student Visa details for ${country.name}. Please see the specific visa guidance module.`,
        country.average_living_cost,
        country.currency
      ]
    );
    const newId = insertRes.rows[0].id;
    existingCountryMap.set(normName, newId);
  }

  console.log("All countries synced.");

  // 3. Sync Universities in chunks of 50 in parallel using connection pool
  console.log(`Syncing ${universities.length} universities...`);
  const queryText = `
    INSERT INTO universities (
      name, country_id, logo_url, ranking, tuition_fee_min, tuition_fee_max, 
      acceptance_rate, description, website
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (name) DO UPDATE SET
      country_id = EXCLUDED.country_id,
      ranking = EXCLUDED.ranking,
      tuition_fee_min = EXCLUDED.tuition_fee_min,
      tuition_fee_max = EXCLUDED.tuition_fee_max,
      acceptance_rate = EXCLUDED.acceptance_rate,
      description = EXCLUDED.description,
      website = EXCLUDED.website
  `;

  const universityChunks = chunkArray(universities, 50);
  let processedCount = 0;

  for (const chunk of universityChunks) {
    const promises = chunk.map(u => {
      const normLoc = u.country_name.toLowerCase().trim();
      const countryId = existingCountryMap.get(normLoc);
      if (!countryId) {
        return Promise.resolve(); // Skip
      }
      const logoUrl = `/images/univ/default.png`;
      return pool.query(queryText, [
        u.name,
        countryId,
        logoUrl,
        u.ranking,
        u.tuition_fee_min,
        u.tuition_fee_max,
        u.acceptance_rate,
        u.description,
        u.website
      ]);
    });

    await Promise.all(promises);
    processedCount += chunk.length;
    console.log(`Synced ${processedCount} / ${universities.length} universities...`);
  }

  console.log(`Successfully completed university seeding. Total synced: ${processedCount}`);
  await pool.end();
}

run().catch(console.error);
