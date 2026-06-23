const fs = require('fs');
const { Pool } = require('pg');

let connectionString = 'postgresql://postgres:c$a$jnneJ,A5gxE@db.moolnigpzrcdgbuzrcrg.supabase.co:6543/postgres';
if (fs.existsSync('.env.local')) {
  const env = fs.readFileSync('.env.local', 'utf8');
  const match = env.match(/DATABASE_URL=(.+)/);
  if (match) {
    connectionString = match[1].trim().replace(/\\/g, '');
  }
}

console.log('Connecting to database...');

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const scholarships = [
  {
    name: 'National Overseas Scholarship (NOS)',
    provider: 'Government of India (Ministry of Social Justice)',
    type: 'government',
    amount: 'Full Funding (Tuition, living expenses, airfare, visa)',
    eligibility_criteria: 'SC, Denotified Tribes, Landless Agricultural Labourers, Traditional Artisans. Indian citizen with family income limits.',
    deadline: '2026-10-15T00:00:00Z',
    coverage: 'Tuition fee, Living expenses, Airfare, Visa expenses'
  },
  {
    name: 'National Overseas Scholarship for ST Students',
    provider: 'Ministry of Tribal Affairs',
    type: 'government',
    amount: 'Full Funding (Tuition, living expenses, airfare)',
    eligibility_criteria: 'ST students with family income limits.',
    deadline: '2026-10-30T00:00:00Z',
    coverage: 'Tuition, Living expenses, Airfare'
  },
  {
    name: 'Dr. Ambedkar Scheme of Interest Subsidy',
    provider: 'Government of India',
    type: 'government',
    amount: 'Interest Subsidy on Education Loans',
    eligibility_criteria: 'OBC and EBC students studying abroad.',
    deadline: '2026-11-15T00:00:00Z',
    coverage: 'Interest subsidy on educational loans'
  },
  {
    name: "Fulbright-Nehru Master's Fellowship",
    provider: 'US-India Educational Foundation',
    type: 'government',
    amount: 'Full Funding (Tuition, living, airfare, insurance)',
    eligibility_criteria: "Indian citizen applying for Master's programs in the US. Requires strong academics and leadership qualities.",
    deadline: '2026-12-15T00:00:00Z',
    coverage: 'Tuition, Living expenses, Airfare, Insurance'
  },
  {
    name: 'Fulbright-Nehru Doctoral Research Fellowship',
    provider: 'US-India Educational Foundation',
    type: 'government',
    amount: 'Full Funding',
    eligibility_criteria: 'PhD students conducting research in the USA.',
    deadline: '2026-12-15T00:00:00Z',
    coverage: 'Monthly stipend, Airfare, Health insurance'
  },
  {
    name: 'Chevening Scholarship',
    provider: 'UK Government',
    type: 'government',
    amount: 'Full tuition + Living expenses + Flights',
    eligibility_criteria: "Master's degree applicants in the UK. Requires leadership skills and a good academic profile.",
    deadline: '2026-11-05T00:00:00Z',
    coverage: 'Full tuition, Living expenses, Flights'
  },
  {
    name: 'Commonwealth Scholarship',
    provider: 'UK Government',
    type: 'government',
    amount: 'Tuition fees + Airfare + Living allowance',
    eligibility_criteria: "Master's and PhD applicants. Citizens of Commonwealth countries including India.",
    deadline: '2026-10-25T00:00:00Z',
    coverage: 'Tuition fees, Airfare, Living allowance'
  },
  {
    name: "Erasmus Mundus Joint Master's Scholarship",
    provider: 'European Union',
    type: 'government',
    amount: 'Full tuition + Monthly stipend + Travel expenses',
    eligibility_criteria: 'Applicants to Erasmus Mundus joint programs. Open globally.',
    deadline: '2027-01-30T00:00:00Z',
    coverage: 'Full tuition, Monthly stipend, Travel expenses'
  },
  {
    name: 'DAAD Scholarship',
    provider: 'German Academic Exchange Service (DAAD)',
    type: 'government',
    amount: 'Tuition + Monthly stipend + Insurance + Travel allowance',
    eligibility_criteria: "Master's and PhD applicants in Germany. Requires a strong academic background.",
    deadline: '2026-10-31T00:00:00Z',
    coverage: 'Tuition, Monthly stipend, Insurance, Travel allowance'
  },
  {
    name: 'Stanford Knight-Hennessy Scholarship',
    provider: 'Stanford University',
    type: 'university',
    amount: 'Full Funding',
    eligibility_criteria: "Master's and PhD students at Stanford University.",
    deadline: '2026-10-10T00:00:00Z',
    coverage: 'Full funding (Tuition, living stipend, travel)'
  },
  {
    name: 'Yale University Scholarships',
    provider: 'Yale University',
    type: 'university',
    amount: 'Up to Full Funding',
    eligibility_criteria: "Master's and PhD programs at Yale University.",
    deadline: '2026-12-01T00:00:00Z',
    coverage: 'Tuition fees, Living stipend'
  },
  {
    name: 'Harvard University Financial Aid',
    provider: 'Harvard University',
    type: 'university',
    amount: 'Need-based full/partial funding',
    eligibility_criteria: 'Graduate studies and research programs at Harvard.',
    deadline: '2026-12-15T00:00:00Z',
    coverage: 'Tuition, Stipends, Health insurance'
  },
  {
    name: 'Vanier Canada Graduate Scholarship',
    provider: 'Canadian Government',
    type: 'government',
    amount: 'CAD 50,000 / year',
    eligibility_criteria: 'PhD students showing leadership and high research potential.',
    deadline: '2026-11-01T00:00:00Z',
    coverage: 'CAD 50,000/year allowance'
  },
  {
    name: 'Ontario Graduate Scholarship',
    provider: 'Ontario Provincial Government / Universities',
    type: 'government',
    amount: 'CAD 15,000',
    eligibility_criteria: "Master's and PhD students in Ontario universities.",
    deadline: '2027-01-15T00:00:00Z',
    coverage: 'CAD 15,000 stipend'
  },
  {
    name: 'Australia Awards Scholarship',
    provider: 'Australian Government (DFAT)',
    type: 'government',
    amount: 'Full tuition + Living expenses + Airfare',
    eligibility_criteria: 'Citizens from eligible partner countries (including India) for postgraduate study.',
    deadline: '2026-08-30T00:00:00Z',
    coverage: 'Tuition, Living expenses, Airfare, Health insurance'
  },
  {
    name: 'Research Training Program (RTP)',
    provider: 'Australian Government',
    type: 'government',
    amount: 'Full tuition + Stipend',
    eligibility_criteria: "Research Master's and PhD students in Australian universities.",
    deadline: '2026-10-31T00:00:00Z',
    coverage: 'Full tuition fees, Monthly stipend, Relocation allowance'
  },
  {
    name: 'Manaaki New Zealand Scholarship',
    provider: 'New Zealand Government',
    type: 'government',
    amount: 'Full tuition + Accommodation + Living expenses',
    eligibility_criteria: 'Postgraduate students from selected developing regions.',
    deadline: '2026-12-20T00:00:00Z',
    coverage: 'Tuition, Accommodation, Living expenses, Airfare'
  },
  {
    name: 'Inlaks Shivdasani Foundation Scholarship',
    provider: 'Inlaks Shivdasani Foundation',
    type: 'private',
    amount: 'Up to USD 100,000',
    eligibility_criteria: "Master's and PhD applicants to top US, UK, and European universities. Indian citizens.",
    deadline: '2027-03-15T00:00:00Z',
    coverage: 'Tuition, Living allowance, Airfare'
  },
  {
    name: 'JN Tata Endowment Scholarship',
    provider: 'Tata Trusts',
    type: 'private',
    amount: 'Loan scholarship up to ₹10 Lakhs (plus travel grants)',
    eligibility_criteria: 'Indian citizens pursuing higher studies abroad.',
    deadline: '2027-03-31T00:00:00Z',
    coverage: 'Loan subsidy, Travel grants, Gift scholarships'
  },
  {
    name: 'Aga Khan Foundation International Scholarship',
    provider: 'Aga Khan Foundation',
    type: 'private',
    amount: 'Need-based 50% loan / 50% grant funding',
    eligibility_criteria: 'Postgraduate studies. Citizens of selected developing countries including India.',
    deadline: '2027-03-20T00:00:00Z',
    coverage: 'Tuition fees, Living expenses'
  }
];

async function run() {
  try {
    // 1. Delete all old scholarships
    console.log('Clearing old scholarships...');
    await pool.query('DELETE FROM scholarships');

    // 2. Insert new ones
    console.log(`Inserting ${scholarships.length} scholarships...`);
    for (const sch of scholarships) {
      await pool.query(`
        INSERT INTO scholarships (name, provider, type, amount, eligibility_criteria, deadline, coverage)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [sch.name, sch.provider, sch.type, sch.amount, sch.eligibility_criteria, sch.deadline, sch.coverage]);
    }

    console.log('Scholarships seeded successfully!');
  } catch (err) {
    console.error('Error seeding scholarships:', err);
  } finally {
    await pool.end();
  }
}

run();
