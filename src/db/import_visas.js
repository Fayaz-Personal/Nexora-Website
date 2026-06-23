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

const countryCodeMap = {
  'USA': 'US', 'United States': 'US',
  'Canada': 'CA',
  'UK': 'GB', 'United Kingdom': 'GB',
  'Australia': 'AU',
  'Germany': 'DE',
  'France': 'FR',
  'Italy': 'IT',
  'Spain': 'ES',
  'Netherlands': 'NL',
  'Ireland': 'IE',
  'New Zealand': 'NZ',
  'Switzerland': 'CH',
  'Sweden': 'SE',
  'Finland': 'FI',
  'Denmark': 'DK',
  'Norway': 'NO',
  'Singapore': 'SG',
  'Japan': 'JP',
  'South Korea': 'KR',
  'UAE': 'AE'
};

const countryCurrencyMap = {
  'USA': 'USD', 'United States': 'USD',
  'Canada': 'CAD',
  'UK': 'GBP', 'United Kingdom': 'GBP',
  'Australia': 'AUD',
  'New Zealand': 'NZD',
  'Singapore': 'SGD',
  'Japan': 'JPY',
  'South Korea': 'KRW',
  'UAE': 'AED',
  'Switzerland': 'CHF',
  'Sweden': 'SEK',
  'Norway': 'NOK',
  'Denmark': 'DKK'
};

const visaMetadata = {
  'USA': { timeline: '3 - 6 Weeks', fee: 185.00 },
  'United States': { timeline: '3 - 6 Weeks', fee: 185.00 },
  'Canada': { timeline: '6 - 12 Weeks', fee: 150.00 },
  'UK': { timeline: '3 - 4 Weeks', fee: 490.00 },
  'United Kingdom': { timeline: '3 - 4 Weeks', fee: 490.00 },
  'Australia': { timeline: '4 - 8 Weeks', fee: 450.00 },
  'Germany': { timeline: '6 - 12 Weeks', fee: 75.00 },
  'France': { timeline: '4 - 8 Weeks', fee: 99.00 },
  'Italy': { timeline: '3 - 6 Weeks', fee: 50.00 },
  'Spain': { timeline: '4 - 8 Weeks', fee: 60.00 },
  'Netherlands': { timeline: '2 - 4 Weeks', fee: 228.00 },
  'Ireland': { timeline: '4 - 8 Weeks', fee: 60.00 },
  'New Zealand': { timeline: '4 - 8 Weeks', fee: 270.00 },
  'Switzerland': { timeline: '6 - 12 Weeks', fee: 88.00 },
  'Sweden': { timeline: '4 - 8 Weeks', fee: 135.00 },
  'Finland': { timeline: '4 - 8 Weeks', fee: 350.00 },
  'Denmark': { timeline: '4 - 8 Weeks', fee: 310.00 },
  'Norway': { timeline: '4 - 8 Weeks', fee: 450.00 },
  'Singapore': { timeline: '2 - 4 Weeks', fee: 90.00 },
  'Japan': { timeline: '6 - 12 Weeks', fee: 25.00 },
  'South Korea': { timeline: '2 - 4 Weeks', fee: 60.00 },
  'UAE': { timeline: '2 - 4 Weeks', fee: 150.00 }
};

const countryLivingCostMap = {
  'USA': 1500.00, 'United States': 1500.00,
  'Canada': 1200.00,
  'UK': 1300.00, 'United Kingdom': 1300.00,
  'Australia': 1400.00,
  'Germany': 950.00,
  'France': 1000.00,
  'Italy': 800.00,
  'Spain': 850.00,
  'Netherlands': 1100.00,
  'Ireland': 1200.00,
  'New Zealand': 1300.00,
  'Switzerland': 1800.00,
  'Sweden': 1000.00,
  'Finland': 900.00,
  'Denmark': 1100.00,
  'Norway': 1200.00,
  'Singapore': 1500.00,
  'Japan': 1100.00,
  'South Korea': 1000.00,
  'UAE': 1400.00
};

async function run() {
  const rawData = fs.readFileSync('visas_parsed.json', 'utf8');
  const data = JSON.parse(rawData);
  const visas = data.visas;

  const pool = new Pool({ connectionString, max: 10 });
  console.log("Connected to database pool.");

  // Get existing countries
  const existingCountriesRes = await pool.query("SELECT id, name, code FROM countries");
  const existingCountryMap = new Map();
  const existingCodes = new Set();
  
  existingCountriesRes.rows.forEach(c => {
    existingCountryMap.set(c.name.toLowerCase().trim(), c.id);
    existingCodes.add(c.code.toUpperCase());
  });

  console.log(`Processing ${visas.length} visas...`);
  for (const visa of visas) {
    const rawCountry = visa.country;
    let dbCountryName = rawCountry;
    if (rawCountry === 'USA') dbCountryName = 'United States';
    if (rawCountry === 'UK') dbCountryName = 'United Kingdom';

    const normName = dbCountryName.toLowerCase().trim();
    let countryId = existingCountryMap.get(normName);

    // If country doesn't exist, insert it!
    if (!countryId) {
      let code = countryCodeMap[rawCountry] || countryCodeMap[dbCountryName];
      if (!code) {
        code = dbCountryName.substring(0, 2).toUpperCase();
      }
      let originalCode = code;
      let suffix = 1;
      while (existingCodes.has(code)) {
        code = (originalCode + suffix).substring(0, 10);
        suffix++;
      }
      existingCodes.add(code);

      const currency = countryCurrencyMap[rawCountry] || countryCurrencyMap[dbCountryName] || (['Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Ireland', 'Finland'].includes(dbCountryName) ? 'EUR' : 'USD');
      const livingCost = countryLivingCostMap[rawCountry] || countryLivingCostMap[dbCountryName] || 1000.00;

      console.log(`Country ${dbCountryName} not found. Inserting country with code ${code}...`);
      const insertCountryRes = await pool.query(
        `INSERT INTO countries (name, code, visa_info, average_living_cost, currency)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          dbCountryName,
          code,
          `Student Visa details for ${dbCountryName}. Please see the specific visa guidance module.`,
          livingCost,
          currency
        ]
      );
      countryId = insertCountryRes.rows[0].id;
      existingCountryMap.set(normName, countryId);
    }

    // Set visa parameters
    const meta = visaMetadata[rawCountry] || visaMetadata[dbCountryName] || { timeline: '4 - 8 Weeks', fee: 100.00 };
    const requirements = `Applying for the ${visa.visa_type} requires a valid Passport, an official Admission Letter, and meeting the specific financial, medical, and biometric requirements set by the consulate. Necessary details: ${visa.documents.join(', ')}.`;
    
    const steps = [
      `Receive official admission confirmation and visa documents (e.g. CAS, I-20, COE, LOA)`,
      `Gather necessary documentation: Passport, photos, and academic transcripts`,
      `Arrange financial proof showing sufficient funds (blocked account, loan sanction, or bank statements)`,
      `Complete the official online visa application form for the ${dbCountryName} embassy`,
      `Pay the consular processing fee of $${meta.fee}`,
      `Book and attend visa appointment / submit biometrics`,
      `Await consular decision and prepare for travel post-approval`
    ];

    const checklist_json = { steps };

    console.log(`Upserting visa requirements for ${dbCountryName}...`);
    await pool.query(
      `INSERT INTO visas (country_id, requirements, documents_required, timeline, fee, checklist_json)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (country_id) DO UPDATE SET
         requirements = EXCLUDED.requirements,
         documents_required = EXCLUDED.documents_required,
         timeline = EXCLUDED.timeline,
         fee = EXCLUDED.fee,
         checklist_json = EXCLUDED.checklist_json`,
      [
        countryId,
        requirements,
        visa.documents,
        meta.timeline,
        meta.fee,
        JSON.stringify(checklist_json)
      ]
    );
  }

  console.log("Successfully completed visa seeding!");
  await pool.end();
}

run().catch(console.error);
