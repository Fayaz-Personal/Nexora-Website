brconst fs = require('fs');
const { Client } = require('pg');

let connectionString = 'postgresql://postgres.moolnigpzrcdgbuzrcrg:c$a$jnneJ,A5gxE@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';
if (fs.existsSync('.env.local')) {
  const env = fs.readFileSync('.env.local', 'utf8');
  const match = env.match(/DATABASE_URL=(.+)/);
  if (match) {
    connectionString = match[1].trim().replace(/\\/g, '').replace(/"/g, '');
  }
}

async function run() {
  const content = fs.readFileSync('loan_details_extracted.txt', 'utf8');
  const lines = content.split('\n').map(l => l.trim());

  const client = new Client({ connectionString });
  await client.connect();
  console.log("Connected to database.");

  console.log("Clearing funding_providers...");
  await client.query("TRUNCATE TABLE funding_providers RESTART IDENTITY CASCADE");

  const providers = [];

  let section = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (line.startsWith("Public & Private Banks")) {
      section = 1;
      i += 4; // skip header lines
      continue;
    } else if (line.startsWith("2. NBFCs")) {
      section = 2;
      i += 4; // skip header lines
      continue;
    } else if (line.startsWith("3. Government Organizations")) {
      section = 3;
      i += 5; // skip header lines
      continue;
    } else if (line.startsWith("4. Government Schemes")) {
      section = 4;
      i += 1; // skip header
      if (lines[i + 1] === "Scheme") i += 2; // skip subheaders
      continue;
    } else if (line.startsWith("Common Documents Required")) {
      break;
    }

    if (section === 1) {
      const name = line;
      const type = lines[i + 1];
      const rate = lines[i + 2];
      const max = lines[i + 3];
      i += 3;

      const isPublic = type ? type.toLowerCase().includes("public") : true;
      const provider_type = isPublic ? 'public_bank' : 'private_bank_nbfc';
      const defaultSite = isPublic ? 'https://www.vidyalakshmi.co.in' : 'https://www.hdfcbank.com';

      providers.push({
        name,
        provider_type,
        interest_rate: rate,
        max_amount: max,
        collateral_requirement: isPublic
          ? 'Collateral required for loans above ₹7.5 Lakhs (Property, FD, LIC policy)'
          : 'Collateral-free options available up to ₹40-50 Lakhs for premier universities.',
        eligibility: 'Indian Citizenship, Secured admission in recognized course in India or abroad',
        income_limit: 'No specific family income limit, but co-applicant income is assessed',
        interest_subsidy: isPublic ? 'Eligible for Central Sector Interest Subsidy (CSIS) scheme' : 'No government interest subsidy available',
        documents_required: [
          'KYC Proof (Aadhaar / PAN)',
          'Academic Marksheets (10th/12th/Graduation)',
          'Admission Letter with Fee Structure',
          'Co-applicant Income Proof (Salary Slips / Form 16 / ITR)',
          'Passport copy (for study abroad)'
        ],
        application_process: [
          'Register on Vidya Lakshmi Portal or visit the bank branch',
          'Fill out common CELAF form and select schemes',
          'Submit physical documents to selected branch',
          'Collateral verification and evaluation (if required)',
          'Receive loan sanction and sign loan contract'
        ],
        highlights: isPublic
          ? ['Lowest interest rates for studies', '0.50% concession for girl students', 'No processing fee up to ₹20L', 'Long repayment tenure up to 15 years']
          : ['Fast digital approval (3-5 days)', 'Flexible co-applicant requirements', 'Section 80E tax benefits', 'Covers 100% cost of attendance'],
        website: name.toLowerCase().includes("sbi") ? "https://sbi.co.in" :
          name.toLowerCase().includes("baroda") ? "https://www.bankofbaroda.in" :
            name.toLowerCase().includes("canara") ? "https://canarabank.com" :
              name.toLowerCase().includes("punjab") || name.toLowerCase().includes("pnb") ? "https://www.pnbindia.in" :
                name.toLowerCase().includes("union") ? "https://www.unionbankofindia.co.in" :
                  name.toLowerCase().includes("icici") ? "https://www.icicibank.com" :
                    name.toLowerCase().includes("axis") ? "https://www.axisbank.com" : defaultSite
      });
    } else if (section === 2) {
      const name = line;
      const type = lines[i + 1];
      const rate = lines[i + 2];
      const max = lines[i + 3];
      i += 3;

      const isInternational = type ? type.toLowerCase().includes("international") : false;
      const provider_type = 'private_bank_nbfc';
      const defaultSite = isInternational ? 'https://prodigyfinance.com' : 'https://www.hdfccredila.com';

      providers.push({
        name,
        provider_type,
        interest_rate: rate,
        max_amount: max,
        collateral_requirement: isInternational
          ? 'No co-signer and no collateral required'
          : 'Collateral-free options available up to ₹40-50 Lakhs based on academic score and co-applicant income.',
        eligibility: isInternational
          ? 'Admission to eligible global graduate business/engineering courses'
          : 'Indian Citizenship, confirmed admission to recognized global universities',
        income_limit: isInternational ? 'Assessment based on future earning potential' : 'Co-applicant must have stable salary or business income',
        interest_subsidy: 'No government interest subsidy available (Private NBFC)',
        documents_required: [
          'KYC Proof (Aadhaar / PAN)',
          'Academic Marksheets (10th/12th/Graduation)',
          'Admission Letter with Fee Structure',
          'Co-applicant Income Proof (Salary Slips / Form 16 / ITR)',
          'Passport copy (for study abroad)'
        ],
        application_process: [
          'Apply online via the NBFC portal',
          'Upload scanned files of academics and co-borrower proofs',
          'Digital credit scoring and profile evaluation',
          'Receive pre-visa sanction letter',
          'Disbursal'
        ],
        highlights: isInternational
          ? ['No collateral or Indian co-signer needed', 'USD-denominated loans prevent currency risk', 'Repayment begins 6 months post-graduation']
          : ['Covers up to 100% cost of attendance', 'Quick digital processing in 3-5 days', 'Flexible co-applicant rules', 'Tax benefits under Section 80E'],
        website: name.toLowerCase().includes("credila") ? "https://www.hdfccredila.com" :
          name.toLowerCase().includes("avanse") ? "https://www.avanse.com" :
            name.toLowerCase().includes("auxilo") ? "https://www.auxilo.com" :
              name.toLowerCase().includes("incred") ? "https://www.incred.com" : defaultSite
      });
    } else if (section === 3) {
      const name = line;
      const category = lines[i + 1];
      const max = lines[i + 2];
      const rate = lines[i + 3];
      i += 3;

      providers.push({
        name,
        provider_type: 'government_portal',
        interest_rate: rate,
        max_amount: max,
        collateral_requirement: 'No collateral required up to specific limits, subject to host bank guidelines.',
        eligibility: `Indian Citizenship, belongs to ${category} category, enrolled in recognized professional/technical courses.`,
        income_limit: 'Family annual income must be within government specified limits (e.g. ₹3L–₹4.5L per annum).',
        interest_subsidy: 'Highly subsidized interest rates sponsored by the Government of India or State agencies.',
        documents_required: [
          'Category / Caste Certificate (Mandatory)',
          'Verified Income Certificate issued by competent authority',
          'Aadhaar Card (Mandatory)',
          'Admission Letter & Academic marksheets'
        ],
        application_process: [
          'Apply online through the specific corporation portal or State Channelising Agency (SCA)',
          'Submit caste/category certificate and income certificate for validation',
          'Profile review and allocation of funds',
          'Subsidized loan sanction and transfer'
        ],
        highlights: [
          `Subsidized interest rate (${rate}) for ${category} category`,
          'Moratorium support covering entire course duration',
          'Concessional interest rates for female candidates',
          'Aims to support students from weaker economic sections'
        ],
        website: name.toLowerCase().includes("nbcfdc") ? "https://www.nbcfdc.gov.in" :
          name.toLowerCase().includes("nmdfc") ? "https://www.nmdfc.org" :
            name.toLowerCase().includes("nsfdc") ? "https://www.nsfdc.nic.in" : "https://www.education.gov.in"
      });
    } else if (section === 4) {
      const name = line;
      const benefit = lines[i + 1];
      i += 1;

      const isVL = name.toLowerCase().includes("vidya lakshmi portal");
      const isCSIS = name.toLowerCase().includes("central sector interest");

      providers.push({
        name,
        provider_type: 'government_portal',
        interest_rate: isVL ? 'Determined by bank (8.55% - 12.00%)' :
          isCSIS ? '0.00% during moratorium (Course + 1 Year)' : 'Subsidized / Guaranteed rates',
        max_amount: isVL ? 'Varies by bank and scheme' :
          isCSIS ? 'Covers interest during moratorium period' : 'Covers study course costs',
        collateral_requirement: isVL ? 'Depends on selected bank' : 'Often collateral-free up to ₹7.5 Lakhs',
        eligibility: isCSIS
          ? 'Indian Citizen, enrolled in professional/technical courses in NAAC accredited or NBA recognized institutions in India'
          : 'Indian Citizen, registered student profile',
        income_limit: isCSIS ? 'Parental family income limit up to ₹4.5 Lakhs per annum' : 'Varies by scheme',
        interest_subsidy: benefit,
        documents_required: isCSIS
          ? ['Family Income Certificate', 'Aadhaar Card', 'Admission Letter', 'Bank Loan Account Statements']
          : ['Aadhaar Card', 'Admission Letter', 'Academic Marksheets', 'Parent Income Proof / Certificate'],
        application_process: isVL
          ? ['Register on Vidya Lakshmi Portal', 'Create Student Profile', 'Fill Common Education Loan Application Form (CELAF)', 'Select Banks & Submit online', 'Track application status']
          : ['Secure loan from any scheduled bank', 'Submit Income Certificate to lending bank', 'Lending bank registers details on central portal', 'Subsidy credited directly to account'],
        highlights: [
          benefit,
          'Encourages education accessibility for all economic sections',
          'Sponsored by Ministry of Education, Government of India'
        ],
        website: isVL ? 'https://www.vidyalakshmi.co.in' :
          isCSIS ? 'https://www.education.gov.in' : 'https://www.education.gov.in'
      });
    }
  }

  console.log(`Inserting ${providers.length} providers...`);

  const queryText = `
    INSERT INTO funding_providers (
      name, provider_type, interest_rate, max_amount, collateral_requirement, 
      eligibility, income_limit, interest_subsidy, documents_required, 
      application_process, highlights, website
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  `;

  for (const p of providers) {
    await client.query(queryText, [
      p.name, p.provider_type, p.interest_rate, p.max_amount, p.collateral_requirement,
      p.eligibility, p.income_limit, p.interest_subsidy, p.documents_required,
      p.application_process, p.highlights, p.website
    ]);
  }

  console.log("Successfully seeded all providers!");
  await client.end();
}

run().catch(console.error);
