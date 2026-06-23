const fs = require('fs');
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
  const rawData = fs.readFileSync('loans_parsed.json', 'utf8');
  const items = JSON.parse(rawData);
  
  const client = new Client({ connectionString });
  await client.connect();
  console.log("Connected to database.");
  
  console.log("Clearing funding_providers...");
  await client.query("TRUNCATE TABLE funding_providers RESTART IDENTITY CASCADE");
  
  const providers = [];
  
  for (const item of items) {
    const name = item.name;
    const provider_type = item.provider_type;
    const category = item.category;
    const rate = item.interest_rate;
    const max = item.max_amount;
    
    let isPublic = name.toLowerCase().includes("sbi") || 
                   name.toLowerCase().includes("baroda") || 
                   name.toLowerCase().includes("punjab") || 
                   name.toLowerCase().includes("canara") || 
                   name.toLowerCase().includes("union") || 
                   name.toLowerCase().includes("indian") || 
                   name.toLowerCase().includes("overseas") || 
                   name.toLowerCase().includes("uco") || 
                   name.toLowerCase().includes("central bank");
                   
    let website = 'https://www.education.gov.in';
    
    // Website mappings
    if (name.toLowerCase().includes("sbi")) website = "https://sbi.co.in";
    else if (name.toLowerCase().includes("baroda")) website = "https://www.bankofbaroda.in";
    else if (name.toLowerCase().includes("punjab") || name.toLowerCase().includes("pnb")) website = "https://www.pnbindia.in";
    else if (name.toLowerCase().includes("canara")) website = "https://canarabank.com";
    else if (name.toLowerCase().includes("union")) website = "https://www.unionbankofindia.co.in";
    else if (name.toLowerCase().includes("indian bank")) website = "https://www.indianbank.in";
    else if (name.toLowerCase().includes("overseas")) website = "https://www.iob.in";
    else if (name.toLowerCase().includes("central bank")) website = "https://www.centralbankofindia.co.in";
    else if (name.toLowerCase().includes("uco")) website = "https://www.ucobank.com";
    else if (name.toLowerCase().includes("hdfc bank")) website = "https://www.hdfcbank.com";
    else if (name.toLowerCase().includes("hdfc credila")) website = "https://www.hdfccredila.com";
    else if (name.toLowerCase().includes("icici")) website = "https://www.icicibank.com";
    else if (name.toLowerCase().includes("axis")) website = "https://www.axisbank.com";
    else if (name.toLowerCase().includes("idfc")) website = "https://www.idfcfirstbank.com";
    else if (name.toLowerCase().includes("kotak")) website = "https://www.kotak.com";
    else if (name.toLowerCase().includes("avanse")) website = "https://www.avanse.com";
    else if (name.toLowerCase().includes("auxilo")) website = "https://www.auxilo.com";
    else if (name.toLowerCase().includes("incred")) website = "https://www.incred.com";
    else if (name.toLowerCase().includes("tata capital")) website = "https://www.tatacapital.com";
    else if (name.toLowerCase().includes("propelld")) website = "https://www.propelld.com";
    else if (name.toLowerCase().includes("poonawalla")) website = "https://poonawallafincorp.com";
    else if (name.toLowerCase().includes("aditya birla")) website = "https://abfl.adityabirla.com";
    else if (name.toLowerCase().includes("muthoot")) website = "https://www.muthootfinance.com";
    else if (name.toLowerCase().includes("shriram")) website = "https://www.shriramfinance.in";
    else if (name.toLowerCase().includes("l&t") || name.toLowerCase().includes("lt ")) website = "https://www.ltfs.com";
    else if (name.toLowerCase().includes("hero")) website = "https://www.herofincorp.com";
    else if (name.toLowerCase().includes("bajaj")) website = "https://www.bajajfinserv.in";
    else if (name.toLowerCase().includes("mahindra")) website = "https://www.mahindrafinance.com";
    else if (name.toLowerCase().includes("prodigy")) website = "https://prodigyfinance.com";
    else if (name.toLowerCase().includes("vidya lakshmi")) website = "https://www.vidyalakshmi.co.in";
    else if (name.toLowerCase().includes("national scholarship") || name.toLowerCase().includes("nsp")) website = "https://scholarships.gov.in";
    else if (name.toLowerCase().includes("aicte")) website = "https://www.aicte-india.org";
    else if (name.toLowerCase().includes("nbcfdc")) website = "https://www.nbcfdc.gov.in";
    else if (name.toLowerCase().includes("nmdfc")) website = "https://www.nmdfc.org";
    else if (name.toLowerCase().includes("nsfdc")) website = "https://www.nsfdc.nic.in";
    else if (name.toLowerCase().includes("nstfdc")) website = "https://nstfdc.tribal.gov.in";
    else if (name.toLowerCase().includes("tahdco")) website = "https://www.tahdco.tn.gov.in";
    else if (name.toLowerCase().includes("karnataka minorities")) website = "https://gokdom.karnataka.gov.in";
    
    // Metadata properties
    let collateral_requirement = '';
    let eligibility = item.eligibility;
    let income_limit = 'No specific limit (co-applicant income assessed)';
    let interest_subsidy = 'No government interest subsidy';
    let highlights = [];
    let documents_required = [];
    let application_process = [];
    
    if (category === 'bank_or_nbfc') {
      documents_required = [
        'KYC Proof (Aadhaar / PAN)',
        'Academic Marksheets (10th/12th/Graduation)',
        'Admission Letter with Fee Structure',
        'Co-applicant Income Proof (ITRs / Salary Slips)',
        'Passport copy (for study abroad)'
      ];
      
      if (provider_type === 'public_bank') {
        collateral_requirement = 'Collateral required for loans above ₹7.5 Lakhs (Property, FD, LIC policy)';
        interest_subsidy = 'Eligible for Central Sector Interest Subsidy (CSIS) scheme';
        highlights = [
          'Lowest interest rates for studies',
          '0.50% concession for girl students',
          'No processing fee up to ₹20L',
          'Long repayment tenure up to 15 years'
        ];
        application_process = [
          'Register on Vidya Lakshmi Portal',
          'Fill out common CELAF form and select banks',
          'Submit physical documents to selected branch',
          'Collateral verification and evaluation (if required)',
          'Receive loan sanction and sign loan contract'
        ];
      } else {
        const isIntl = name.toLowerCase().includes("prodigy") || name.toLowerCase().includes("mpower");
        collateral_requirement = isIntl 
          ? 'No co-signer and no collateral required'
          : 'Collateral-free options available up to ₹40-50 Lakhs based on academic score and co-applicant income.';
        income_limit = isIntl ? 'Assessment based on future earning potential' : 'Co-applicant must have stable salary or business income';
        highlights = isIntl
          ? ['No collateral or Indian co-signer needed', 'USD-denominated loans prevent currency risk', 'Repayment begins 6 months post-graduation']
          : ['Covers up to 100% cost of attendance', 'Quick digital processing in 3-5 days', 'Flexible co-applicant rules', 'Tax benefits under Section 80E'];
        application_process = [
          'Apply online via the lender\'s portal',
          'Upload scanned files of academics and co-borrower proofs',
          'Digital credit scoring and profile evaluation',
          'Receive pre-visa sanction letter',
          'Disbursal'
        ];
      }
    } else if (category === 'gov_agency') {
      collateral_requirement = 'No collateral required up to specified limits, subject to host bank rules.';
      interest_subsidy = 'Highly subsidized interest rates sponsored by the Government of India or State agencies.';
      
      highlights = [
        `Subsidized interest rate (${rate}) for eligible category`,
        'Moratorium support covering entire course duration',
        'Concessional interest rates for female candidates',
        `Apply through: ${item.apply_through}`
      ];
      
      // Parse documents list from string
      if (item.documents_required_str) {
        documents_required = item.documents_required_str.split(',').map(d => d.trim()).filter(d => d);
      } else {
        documents_required = ['Caste/Category Certificate', 'Income Certificate', 'Aadhaar Card', 'Admission Letter'];
      }
      
      application_process = [
        `How to Apply: ${item.how_to_apply}`,
        `Submit Application via: ${item.apply_through}`
      ];
    } else if (category === 'gov_scheme') {
      collateral_requirement = 'Depends on host bank scheme limits / guidelines';
      interest_subsidy = item.benefit || 'Subsidized loan / scholarship rates';
      
      highlights = [
        item.benefit || 'Sponsored by Government of India',
        'Encourages education accessibility for all economic sections',
        `Apply through: ${item.apply_through}`
      ];
      
      if (item.documents_required_str) {
        documents_required = item.documents_required_str.split(',').map(d => d.trim()).filter(d => d);
      } else {
        documents_required = ['Aadhaar Card', 'Admission Letter', 'Academic Marksheets', 'Income Certificate'];
      }
      
      application_process = [
        `How to Apply: ${item.how_to_apply}`,
        `Apply via: ${item.apply_through}`
      ];
    }
    
    providers.push({
      name,
      provider_type,
      interest_rate: rate,
      max_amount: max,
      collateral_requirement,
      eligibility,
      income_limit,
      interest_subsidy,
      documents_required,
      application_process,
      highlights,
      website
    });
  }
  
  console.log(`Inserting ${providers.length} providers into DB...`);
  
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
  
  console.log("Successfully imported all providers!");
  await client.end();
}

run().catch(console.error);
