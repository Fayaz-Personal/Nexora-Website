const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');

let connectionString = 'postgresql://postgres.moolnigpzrcdgbuzrcrg:c$a$jnneJ,A5gxE@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';
if (fs.existsSync('.env.local')) {
  const env = fs.readFileSync('.env.local', 'utf8');
  const match = env.match(/DATABASE_URL=(.+)/);
  if (match) {
    connectionString = match[1].trim().replace(/\\/g, '');
  }
}

async function migrate() {
  const client = new Client({ connectionString });
  console.log('Connecting to database...');
  await client.connect();
  console.log('Connected successfully!');

  try {
    // Drop existing tables to ensure clean schema (in reverse dependency order)
    console.log('Dropping existing tables...');
    await client.query(`
      DROP TABLE IF EXISTS uni_admin_profiles CASCADE;
      DROP TABLE IF EXISTS announcements CASCADE;
      DROP TABLE IF EXISTS funding_providers CASCADE;
      DROP TABLE IF EXISTS ai_chat_logs CASCADE;
      DROP TABLE IF EXISTS analytics_events CASCADE;
      DROP TABLE IF EXISTS student_roadmaps CASCADE;
      DROP TABLE IF EXISTS ai_recommendations CASCADE;
      DROP TABLE IF EXISTS admission_predictions CASCADE;
      DROP TABLE IF EXISTS chatbot_messages CASCADE;
      DROP TABLE IF EXISTS chatbot_conversations CASCADE;
      DROP TABLE IF EXISTS student_saved_scholarships CASCADE;
      DROP TABLE IF EXISTS student_saved_courses CASCADE;
      DROP TABLE IF EXISTS student_saved_universities CASCADE;
      DROP TABLE IF EXISTS alumni CASCADE;
      DROP TABLE IF EXISTS flights CASCADE;
      DROP TABLE IF EXISTS visas CASCADE;
      DROP TABLE IF EXISTS accommodations CASCADE;
      DROP TABLE IF EXISTS living_costs CASCADE;
      DROP TABLE IF EXISTS course_exam_requirements CASCADE;
      DROP TABLE IF EXISTS entrance_exams CASCADE;
      DROP TABLE IF EXISTS scholarships CASCADE;
      DROP TABLE IF EXISTS courses CASCADE;
      DROP TABLE IF EXISTS universities CASCADE;
      DROP TABLE IF EXISTS student_profiles CASCADE;
      DROP TABLE IF EXISTS cities CASCADE;
      DROP TABLE IF EXISTS countries CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS currency_rates CASCADE;
    `);

    console.log('Creating tables...');

    // 1. users
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'uni_admin', 'platform_admin', 'business')),
        otp_code VARCHAR(6),
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. countries
    await client.query(`
      CREATE TABLE countries (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        code VARCHAR(10) UNIQUE NOT NULL,
        visa_info TEXT,
        average_living_cost DECIMAL(10, 2),
        currency VARCHAR(10),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. cities
    await client.query(`
      CREATE TABLE cities (
        id SERIAL PRIMARY KEY,
        country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        cost_multiplier DECIMAL(3, 2) DEFAULT 1.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(country_id, name)
      );
    `);

    // 4. student_profiles
    await client.query(`
      CREATE TABLE student_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        degree VARCHAR(100),
        department VARCHAR(100),
        cgpa DECIMAL(3, 2),
        skills TEXT[],
        interests TEXT[],
        budget DECIMAL(10, 2),
        preferred_countries TEXT[],
        career_goals TEXT[],
        eligibility_score INTEGER DEFAULT 0,
        onboarding_completed BOOLEAN DEFAULT FALSE,
        onboarding_data JSONB,
        ai_readiness_score INTEGER DEFAULT 0,
        scholarship_eligibility_score INTEGER DEFAULT 0,
        admission_strength_score INTEGER DEFAULT 0,
        linkedin_url TEXT,
        github_url TEXT,
        portfolio_url TEXT,
        milestones_completed JSONB DEFAULT '[]',
        nationality VARCHAR(100),
        current_country VARCHAR(100),
        preferred_currency VARCHAR(10) DEFAULT 'USD',
        passport_stamps JSONB DEFAULT '[]',
        xp INTEGER DEFAULT 120,
        level INTEGER DEFAULT 1,
        achievements JSONB DEFAULT '[]',
        missions JSONB DEFAULT '[]',
        ep INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4c. announcements
    await client.query(`
      CREATE TABLE announcements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        target_role VARCHAR(50) DEFAULT 'all',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4b. ai_chat_logs
    await client.query(`
      CREATE TABLE ai_chat_logs (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES student_profiles(id) ON DELETE CASCADE,
        query_text TEXT NOT NULL,
        response_text TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. universities
    await client.query(`
      CREATE TABLE universities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
        logo_url TEXT,
        ranking INTEGER,
        tuition_fee_min DECIMAL(10, 2),
        tuition_fee_max DECIMAL(10, 2),
        acceptance_rate DECIMAL(5, 2),
        description TEXT,
        website VARCHAR(255),
        application_procedure TEXT,
        eligibility_requirements TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5b. uni_admin_profiles
    await client.query(`
      CREATE TABLE uni_admin_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. courses
    await client.query(`
      CREATE TABLE courses (
        id SERIAL PRIMARY KEY,
        university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        degree_type VARCHAR(50) NOT NULL CHECK (degree_type IN ('MSc', 'MTech', 'MBA', 'MS', 'PhD', 'Professional Certification')),
        department VARCHAR(100) NOT NULL,
        duration VARCHAR(50),
        fees DECIMAL(10, 2),
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. scholarships
    await client.query(`
      CREATE TABLE scholarships (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        provider VARCHAR(255),
        type VARCHAR(50) NOT NULL CHECK (type IN ('government', 'university', 'private')),
        amount VARCHAR(255),
        eligibility_criteria TEXT,
        deadline DATE,
        coverage VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. entrance_exams
    await client.query(`
      CREATE TABLE entrance_exams (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        syllabus TEXT,
        registration_link VARCHAR(255),
        test_dates JSONB,
        resources_json JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. course_exam_requirements
    await client.query(`
      CREATE TABLE course_exam_requirements (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        exam_id INTEGER REFERENCES entrance_exams(id) ON DELETE CASCADE,
        min_score VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 10. living_costs
    await client.query(`
      CREATE TABLE living_costs (
        id SERIAL PRIMARY KEY,
        country_id INTEGER UNIQUE REFERENCES countries(id) ON DELETE CASCADE,
        rent DECIMAL(10, 2) NOT NULL,
        food DECIMAL(10, 2) NOT NULL,
        transport DECIMAL(10, 2) NOT NULL,
        insurance DECIMAL(10, 2) NOT NULL,
        miscellaneous DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 11. accommodations
    await client.query(`
      CREATE TABLE accommodations (
        id SERIAL PRIMARY KEY,
        country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
        city_name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('hostels', 'student housing', 'PGs', 'apartments', 'shared rooms')),
        rent DECIMAL(10, 2) NOT NULL,
        distance_to_univ VARCHAR(100),
        availability BOOLEAN DEFAULT TRUE,
        facilities TEXT[],
        title VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 12. visas
    await client.query(`
      CREATE TABLE visas (
        id SERIAL PRIMARY KEY,
        country_id INTEGER UNIQUE REFERENCES countries(id) ON DELETE CASCADE,
        requirements TEXT,
        documents_required TEXT[],
        timeline VARCHAR(100),
        fee DECIMAL(10, 2),
        checklist_json JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 13. flights
    await client.query(`
      CREATE TABLE flights (
        id SERIAL PRIMARY KEY,
        origin VARCHAR(100) NOT NULL,
        destination_country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
        est_cost DECIMAL(10, 2) NOT NULL,
        checklist_json JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 14. alumni
    await client.query(`
      CREATE TABLE alumni (
        id SERIAL PRIMARY KEY,
        university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        course_studied VARCHAR(255) NOT NULL,
        graduation_year INTEGER NOT NULL,
        company VARCHAR(255),
        job_title VARCHAR(255),
        testimonial TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 15. student_saved_universities
    await client.query(`
      CREATE TABLE student_saved_universities (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES student_profiles(id) ON DELETE CASCADE,
        university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, university_id)
      );
    `);

    // 16. student_saved_courses
    await client.query(`
      CREATE TABLE student_saved_courses (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES student_profiles(id) ON DELETE CASCADE,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, course_id)
      );
    `);

    // 17. student_saved_scholarships
    await client.query(`
      CREATE TABLE student_saved_scholarships (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES student_profiles(id) ON DELETE CASCADE,
        scholarship_id INTEGER REFERENCES scholarships(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, scholarship_id)
      );
    `);

    // 18. chatbot_conversations
    await client.query(`
      CREATE TABLE chatbot_conversations (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES student_profiles(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 19. chatbot_messages
    await client.query(`
      CREATE TABLE chatbot_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
        sender VARCHAR(50) NOT NULL CHECK (sender IN ('user', 'bot')),
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 20. admission_predictions
    await client.query(`
      CREATE TABLE admission_predictions (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES student_profiles(id) ON DELETE CASCADE,
        university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
        probability INTEGER NOT NULL,
        status VARCHAR(50) NOT NULL CHECK (status IN ('safe', 'moderate', 'dream')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 21. ai_recommendations
    await client.query(`
      CREATE TABLE ai_recommendations (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES student_profiles(id) ON DELETE CASCADE,
        recommendations_json JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 22. student_roadmaps
    await client.query(`
      CREATE TABLE student_roadmaps (
        id SERIAL PRIMARY KEY,
        student_id INTEGER UNIQUE REFERENCES student_profiles(id) ON DELETE CASCADE,
        steps_json JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 23. analytics_events
    await client.query(`
      CREATE TABLE analytics_events (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        metadata_json JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 24. funding_providers
    await client.query(`
      CREATE TABLE funding_providers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN ('public_bank', 'private_bank_nbfc', 'government_portal', 'marketplace')),
        interest_rate VARCHAR(255),
        max_amount VARCHAR(255),
        collateral_requirement TEXT,
        eligibility TEXT,
        income_limit VARCHAR(255),
        interest_subsidy TEXT,
        documents_required TEXT[],
        application_process TEXT[],
        highlights TEXT[],
        website VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 25. currency_rates
    await client.query(`
      CREATE TABLE currency_rates (
        code VARCHAR(10) PRIMARY KEY,
        rate_to_usd DECIMAL(12, 6) NOT NULL
      );
    `);

    console.log('Tables created successfully!');
    console.log('Seeding initial data...');

    // Seeding currency rates
    console.log('Seeding currency rates...');
    await client.query(`
      INSERT INTO currency_rates (code, rate_to_usd) VALUES
      ('USD', 1.0),
      ('EUR', 0.92),
      ('GBP', 0.78),
      ('INR', 83.5),
      ('CAD', 1.37),
      ('AUD', 1.50),
      ('NZD', 1.63),
      ('CNY', 7.25),
      ('JPY', 158.0),
      ('KRW', 1380.0),
      ('SGD', 1.35),
      ('MYR', 4.70),
      ('RUB', 88.0),
      ('CHF', 0.89),
      ('SEK', 10.5),
      ('NOK', 10.6),
      ('DKK', 6.9),
      ('AED', 3.67),
      ('SAR', 3.75)
    `);

    // Hash passwords for seed users
    const adminHash = await bcrypt.hash('adminpassword', 10);
    const studentHash = await bcrypt.hash('studentpassword', 10);

    // Insert Users
    const usersRes = await client.query(`
      INSERT INTO users (email, password_hash, role, is_verified) VALUES
      ('admin@nexora.com', '${adminHash}', 'platform_admin', TRUE),
      ('admin_access@nexora.com', '${adminHash}', 'platform_admin', TRUE),
      ('student@nexora.com', '${studentHash}', 'student', TRUE),
      ('ashwin@nexora.com', '${studentHash}', 'student', TRUE),
      ('sarah@nexora.com', '${studentHash}', 'student', TRUE),
      ('alex@nexora.com', '${studentHash}', 'student', TRUE)
      RETURNING id, email, role;
    `);

    const adminId = usersRes.rows.find(u => u.role === 'platform_admin').id;
    const studentId = usersRes.rows.find(u => u.role === 'student' && u.email === 'student@nexora.com').id;
    const ashwinId = usersRes.rows.find(u => u.role === 'student' && u.email === 'ashwin@nexora.com').id;
    const sarahId = usersRes.rows.find(u => u.role === 'student' && u.email === 'sarah@nexora.com').id;
    const alexId = usersRes.rows.find(u => u.role === 'student' && u.email === 'alex@nexora.com').id;

    // Seed Countries
    const countriesRes = await client.query(`
      INSERT INTO countries (name, code, visa_info, average_living_cost, currency) VALUES
      ('Germany', 'DE', 'German Student Visa requires a blocked account showing €11,908 per year, health insurance, and proof of university admission.', 950.00, 'EUR'),
      ('United States', 'US', 'US F-1 Student Visa requires a Form I-20 issued by the university, proof of financial support, and a SEVIS fee payment.', 1500.00, 'USD'),
      ('United Kingdom', 'GB', 'UK Student Visa (formerly Tier 4) requires 70 points on the points-based system, including an official CAS letter, English proficiency, and financial proof.', 1300.00, 'GBP'),
      ('Canada', 'CA', 'Canadian Study Permit requires a Letter of Acceptance (LOA), a Provincial Attestation Letter (PAL), and GIC showing $20,635 CAD.', 1200.00, 'CAD'),
      ('Australia', 'AU', 'Australian Student Visa (Subclass 500) requires a Confirmation of Enrollment (CoE), OSHC health insurance, and GTE statement.', 1400.00, 'AUD')
      RETURNING id, name;
    `);

    const germanyId = countriesRes.rows.find(c => c.name === 'Germany').id;
    const usaId = countriesRes.rows.find(c => c.name === 'United States').id;
    const ukId = countriesRes.rows.find(c => c.name === 'United Kingdom').id;
    const canadaId = countriesRes.rows.find(c => c.name === 'Canada').id;
    const australiaId = countriesRes.rows.find(c => c.name === 'Australia').id;

    // Seed Cities
    await client.query(`
      INSERT INTO cities (country_id, name, cost_multiplier) VALUES
      (${germanyId}, 'Munich', 1.20),
      (${germanyId}, 'Berlin', 1.00),
      (${usaId}, 'Boston', 1.40),
      (${usaId}, 'Stanford', 1.50),
      (${ukId}, 'London', 1.50),
      (${ukId}, 'Oxford', 1.20),
      (${canadaId}, 'Toronto', 1.30),
      (${australiaId}, 'Melbourne', 1.25);
    `);

    // Seed Student Profiles
    const studentProfileRes = await client.query(`
      INSERT INTO student_profiles (user_id, name, degree, department, cgpa, skills, interests, budget, preferred_countries, career_goals, eligibility_score, nationality, current_country, preferred_currency, xp, level, achievements, missions, ep) VALUES
      (${studentId}, 'John Doe', 'MS', 'Computer Science', 3.85, 
       ARRAY['Python', 'TypeScript', 'Machine Learning', 'React'], 
       ARRAY['AI Research', 'Data Science', 'SaaS Development'], 
       35000.00, 
       ARRAY['Germany', 'United States', 'Canada'], 
       ARRAY['Become an AI Research Engineer', 'Work at a top tech lab'], 
       85, 'Indian', 'India', 'INR', 120, 1, '[]'::jsonb, '[]'::jsonb, 20),
      (${ashwinId}, 'Ashwin', 'MS', 'Computer Science', 3.90,
       ARRAY['Next.js', 'React', 'Node.js', 'PostgreSQL'],
       ARRAY['Full-Stack Development', 'AI Engineering'],
       40000.00,
       ARRAY['Germany', 'Canada', 'Australia'],
       ARRAY['Senior Full-Stack Engineer'],
       90, 'Indian', 'India', 'INR', 620, 3, '[{"id":"onboarding","title":"First Step","description":"Completed your academic profile","icon":"UserCheck","unlockedAt":"2026-06-19T10:00:00.000Z"},{"id":"lang_ace","title":"Language Pioneer","description":"Unlocked IELTS checklist parameters","icon":"Languages","unlockedAt":"2026-06-19T10:05:00.000Z"}]'::jsonb, '[{"id":"ielts_profile","title":"Complete IELTS Profile","description":"Update language score details","xpReward":150,"completed":true},{"id":"bookmark_univ","title":"Bookmark a University","description":"Save 1 target university to your dashboard","xpReward":100,"completed":false},{"id":"explore_loans","title":"Explore Loan Options","description":"Compare top study abroad loans in the portal","xpReward":120,"completed":false}]'::jsonb, 150),
      (${sarahId}, 'Sarah Jenkins', 'MBA', 'Business', 3.75,
       ARRAY['Marketing', 'Financial Modeling', 'SQL'],
       ARRAY['Venture Capital', 'Product Management'],
       55000.00,
       ARRAY['United States', 'United Kingdom'],
       ARRAY['Associate Portfolio Manager'],
       80, 'American', 'United States', 'USD', 850, 4, '[{"id":"onboarding","title":"First Step","description":"Completed your academic profile","icon":"UserCheck","unlockedAt":"2026-06-19T09:00:00.000Z"}]'::jsonb, '[]'::jsonb, 200),
      (${alexId}, 'Alex Rivera', 'MS', 'Mechanical Engineering', 3.65,
       ARRAY['CAD', 'MATLAB', 'Python'],
       ARRAY['Robotics', 'Aerospace'],
       30000.00,
       ARRAY['Canada', 'Germany'],
       ARRAY['Robotics Systems Engineer'],
       75, 'Canadian', 'Canada', 'CAD', 380, 2, '[{"id":"onboarding","title":"First Step","description":"Completed your academic profile","icon":"UserCheck","unlockedAt":"2026-06-19T09:30:00.000Z"}]'::jsonb, '[]'::jsonb, 80)
      RETURNING id, name;
    `);
    const profileId = studentProfileRes.rows.find(r => r.name === 'John Doe').id;

    // Universities, courses, and university-linked scholarships are dynamically added by university users and approved by admins.
    console.log('Skipping mock university, course, and scholarship seeding to maintain real, dynamic data.');

    // Seed Funding Providers
    console.log('Seeding funding providers...');
    await client.query(`
      INSERT INTO funding_providers (name, provider_type, interest_rate, max_amount, collateral_requirement, eligibility, income_limit, interest_subsidy, documents_required, application_process, highlights, website) VALUES
      (
        'State Bank of India (SBI)',
        'public_bank',
        '8.55% - 10.05%',
        'Up to ₹3 Crores',
        'Collateral required for loans above ₹7.5 Lakhs (Property, FD, LIC policy)',
        'Indian Citizenship, Secured admission in eligible course in India or abroad',
        'No specific family income limit, but co-applicant income is assessed for repayment',
        'Eligible for CSIS interest subsidy scheme if within income guidelines',
        ARRAY['Aadhaar Card', 'PAN Card', '10th/12th/Degree Marksheets', 'Admission Letter', 'Co-Applicant Income Proof (salary slips, ITRs)', 'Collateral documents', 'Passport copy'],
        ARRAY['Apply online or via Vidya Lakshmi Portal', 'Submit physical documents to SBI branch', 'Collateral valuation and legal check', 'Sanction and disbursal directly to university'],
        ARRAY['Lowest interest rates for study abroad', 'Concession of 0.50% for female students', 'Long repayment tenure up to 15 years', 'No processing fee for loans up to ₹20L'],
        'https://sbi.co.in'
      ),
      (
        'Bank of Baroda',
        'public_bank',
        '8.85% - 10.50%',
        'Up to ₹1.5 Crores',
        'Collateral-free options available up to certain limits (₹7.5 Lakhs to ₹40 Lakhs for premier institutes)',
        'Indian Citizenship, Confirmed admission to recognized global universities',
        'Co-applicant profile checked for capability',
        'Eligible for interest subsidy schemes',
        ARRAY['KYC Documents', 'Academic Records', 'Admission Letter with Fee Structure', 'Co-applicant Income Documents', 'Asset/Liability Statement'],
        ARRAY['Register on Vidya Lakshmi Portal', 'Select Bank of Baroda Scholar scheme', 'Submit documents to nearest branch', 'Processing and verification', 'Disbursal'],
        ARRAY['Up to ₹40 Lakhs collateral-free for premier list of universities', 'Covers 100% tuition and living costs', 'Fast processing under Baroda Scholar scheme'],
        'https://www.bankofbaroda.in'
      ),
      (
        'Canara Bank',
        'public_bank',
        '9.25% - 11.00%',
        'Varies by scheme (Up to ₹1.5 Crores)',
        'Collateral required for higher amounts; collateral-free up to ₹7.5 Lakhs',
        'Indian Citizen, secured admission in recognized institute',
        'Assessed based on course and co-applicant income',
        'Supports Central Sector Interest Subsidy (CSIS) scheme',
        ARRAY['KYC Proof', 'Academic Marksheets', 'GRE/IELTS/TOEFL scores', 'Admission Proof', 'Income proofs of co-borrower'],
        ARRAY['Apply via Vidya Lakshmi Portal', 'Submit forms and documents to branch', 'Credit appraisal and approval', 'Disbursal'],
        ARRAY['Special scheme: Canara Vidya Turant', 'Repayment holiday/moratorium during course + 1 year', '0.50% concession for girl students'],
        'https://canarabank.com'
      ),
      (
        'Punjab National Bank (PNB)',
        'public_bank',
        '9.15% - 10.85%',
        'High-value loans available based on requirements',
        'Collateral-free up to ₹7.5 Lakhs; collateral required for higher amounts',
        'Indian Citizen, secured admission in recognized universities',
        'Co-borrower income verification required',
        'CSIS scheme active',
        ARRAY['KYC', 'Marksheets', 'Admission Proof', 'Co-borrower Income Proofs (2 years ITR)'],
        ARRAY['Submit application online', 'Branch verification and appraisal', 'Collateral assessment', 'Disbursal'],
        ARRAY['Covers airfare, tuition, and living costs', 'Repayment tenure up to 15 years', 'Concession for girl students'],
        'https://www.pnbindia.in'
      ),
      (
        'Union Bank of India',
        'public_bank',
        '9.30% - 11.20%',
        'Covers realistic tuition & living costs',
        'Collateral required above ₹7.5 Lakhs',
        'Indian Citizen, admission in recognized university abroad or India',
        'Co-borrower assessment',
        'CSIS active',
        ARRAY['KYC', 'Academic Records', 'Admission Offer', 'Income Documents'],
        ARRAY['Register on Vidya Lakshmi Portal', 'Select Union Bank scheme', 'Branch submission and verification', 'Disbursal'],
        ARRAY['Friendly repayment options', 'Low processing fees', 'Covers comprehensive expenses'],
        'https://www.unionbankofindia.co.in'
      ),
      (
        'Indian Bank',
        'public_bank',
        '9.40% - 11.15%',
        'Covers professional courses',
        'Collateral required above ₹7.5 Lakhs',
        'Indian Citizen, admission to recognized global universities',
        'Co-borrower verification',
        'CSIS active',
        ARRAY['KYC', 'Mark sheets', 'Admission Letter', 'Income proof of parent'],
        ARRAY['Register on Vidya Lakshmi Portal', 'Document check at branch', 'Sanction and disbursal'],
        ARRAY['Flexible repayment schemes', 'Wide network of branches'],
        'https://www.indianbank.in'
      ),
      (
        'Bank of India',
        'public_bank',
        '9.35% - 11.00%',
        'Covers actual studies expenses',
        'Collateral required above ₹7.5 Lakhs',
        'Indian Citizen, admission in recognized university',
        'Parent co-borrower',
        'CSIS active',
        ARRAY['KYC', 'Academics', 'Admission Offer', 'Income Proofs'],
        ARRAY['Apply via Vidya Lakshmi', 'Branch document submission', 'Disbursal'],
        ARRAY['Attractive interest rates', 'Girl student concession available'],
        'https://www.bankofindia.co.in'
      ),
      (
        'HDFC Credila',
        'private_bank_nbfc',
        '9.50% - 12.00%',
        'Up to ₹1.5 Crores',
        'Collateral-free options available (up to ₹50-60 Lakhs for top US/UK universities)',
        'Indian Citizen, secured admission to recognized global universities',
        'Co-applicant must have stable salary or business income (ITRs required)',
        'No government interest subsidy available (Private NBFC)',
        ARRAY['KYC Documents', 'Academic Marksheets', 'Entrance Test Scores', 'University Admit Letter', 'Co-applicant Salary Slips & 2 Years ITR', 'Bank Statements'],
        ARRAY['Apply online via HDFC Credila site', 'Submit digitized documents', 'Appraisal by credit team', 'Sanction Letter issuance', 'Disbursal'],
        ARRAY['Covers 100% cost of attendance (no margin money required)', 'Extremely fast approval process (3-5 days)', 'Flexible co-applicant requirements', 'Section 80E tax benefits'],
        'https://www.hdfccredila.com'
      ),
      (
        'ICICI Bank',
        'private_bank_nbfc',
        '9.75% - 12.50%',
        'Up to ₹1 Crore',
        'Collateral-free options available up to ₹50 Lakhs for premier global universities',
        'Indian Citizen, secured admission to top ranking universities',
        'Parental income and credit history checked',
        'No interest subsidy',
        ARRAY['KYC Documents', 'Admit Letter', 'Entrance Scores', 'Income Statements (ITR/Form 16)'],
        ARRAY['Apply online or at branch', 'Instant digital pre-sanction for select users', 'Document collection', 'Disbursal'],
        ARRAY['Quick processing and minimal documentation', 'Pre-admission sanction letters available', 'Online platform tracking'],
        'https://www.icicibank.com'
      ),
      (
        'Axis Bank',
        'private_bank_nbfc',
        '9.99% - 13.00%',
        'Up to ₹1.2 Crores',
        'Collateral-free up to ₹40 Lakhs for prime global list',
        'Indian Citizen, admission in recognized universities',
        'Co-borrower must have stable source of income',
        'No interest subsidy',
        ARRAY['KYC', 'Academic Records', 'Admission Letter', 'Income documents of co-borrower'],
        ARRAY['Apply online or visit Axis Loan Center', 'Document verification', 'Appraisal and sanction', 'Disbursal'],
        ARRAY['Pre-visa disbursement options', 'Long repayment tenures', 'Simplified online portal'],
        'https://www.axisbank.com'
      ),
      (
        'Avanse Financial Services',
        'private_bank_nbfc',
        '10.50% - 13.50%',
        'No upper limit (based on student profile)',
        'Collateral-free and collateral options both available',
        'Indian Citizen, secured admission in recognized global universities',
        'Co-borrower required with proof of regular income',
        'No interest subsidy',
        ARRAY['KYC', 'Admit Letter', 'Academic Marksheets', 'Co-borrower income documents'],
        ARRAY['Submit application online', 'Home visit/document pick-up', 'Credit evaluation', 'Disbursal'],
        ARRAY['100% funding including travel & insurance', 'Pre-visa disbursement', 'Flexible customization'],
        'https://www.avanse.com'
      ),
      (
        'Auxilo Finserve',
        'private_bank_nbfc',
        '10.75% - 14.00%',
        'Based on tuition & cost of living',
        'No-collateral options available based on academic scores',
        'Indian Citizen, confirmed admission',
        'Co-borrower with stable income',
        'No interest subsidy',
        ARRAY['KYC', 'Academic Proofs', 'Admission letter', 'Co-borrower financial papers'],
        ARRAY['Apply online', 'Credit assessment & counseling', 'Sanction & Disbursal'],
        ARRAY['Tailored loans for niche and specialized courses', 'Pre-visa disbursal', 'Speedy approval process'],
        'https://www.auxilo.com'
      ),
      (
        'InCred Education Loans',
        'private_bank_nbfc',
        '11.00% - 14.25%',
        'Based on cost of attendance',
        'Unsecured loans available up to ₹45 Lakhs for select universities',
        'Indian Citizen, admission to recognized global program',
        'Regular income of co-borrower required',
        'No interest subsidy',
        ARRAY['KYC', 'Admit Letter', 'Academic Records', 'Co-borrower Income Proofs'],
        ARRAY['Online application', 'Digital document submission', 'Evaluation and Sanction', 'Disbursal'],
        ARRAY['Flexible study-abroad packages', 'Unsecured options for multiple countries', 'Personalized counseling'],
        'https://www.incred.com'
      ),
      (
        'Vidya Lakshmi Portal',
        'government_portal',
        'Determined by bank (8.55% - 12.00%)',
        'Varies by bank and scheme (up to ₹3 Crores)',
        'Depends on selected bank; Single common application form for all banks',
        'Indian Citizen, registered student profile',
        'Determined by target scheme rules',
        'Enables application to Central Sector Interest Subsidy Scheme (CSIS)',
        ARRAY['Valid Passport', 'Admission Letter', '10th/12th/Graduation Marksheets', 'Parent Income Certificate / ITR', 'Co-Applicant KYC', 'Address Proof'],
        ARRAY['Register on Vidya Lakshmi Portal', 'Create Student Profile', 'Fill Common Education Loan Application Form (CELAF)', 'Search and Select Banks & Schemes', 'Submit CELAF Form online', 'Track application status on portal dashboard'],
        ARRAY['Single education loan application for multiple banks', 'Compare multiple loan schemes in one dashboard', 'Common Application Form (CELAF) standardizes details', '40+ participating banks and 100+ loan schemes'],
        'https://www.vidyalakshmi.co.in'
      ),
      (
        'Central Sector Interest Subsidy Scheme (CSIS)',
        'government_portal',
        '0.00% during moratorium (Moratorium = Course + 1 Year)',
        'Covers interest during moratorium period',
        'No collateral required for this subsidy, but subject to host bank loan rules (often collateral-free up to ₹7.5 Lakhs)',
        'Indian Citizen, enrolled in professional/technical courses in NAAC accredited or NBA recognized institutions in India',
        'Parental family income limit up to ₹4.5 Lakhs per annum',
        'Government of India pays 100% interest during the course duration + 1 year moratorium',
        ARRAY['Family Income Certificate from authorized government authority', 'Aadhaar Card (Mandatory)', 'Admission Letter', 'Bank Loan Account Statements', 'Institution accreditation proof'],
        ARRAY['Apply for education loan at any scheduled bank', 'Submit Income Certificate to the lending bank', 'Lending bank uploads student details to Canara Bank portal (nodal bank)', 'Interest subsidy is directly credited to the student loan account during the moratorium period'],
        ARRAY['Complete relief from interest payment during studies', 'Encourages students from economically weaker sections (EWS)', 'Applies to professional and technical degree programs'],
        'https://www.education.gov.in'
      ),
      (
        'GyanDhan',
        'marketplace',
        'Assists in getting best rate (8.55% - 13.50%)',
        'Up to ₹3 Crores',
        'Helps compare collateral vs collateral-free options across multiple partner banks',
        'Indian Citizen, target course abroad',
        'Determined by matching lender',
        'Bypasses direct bank visits by offering a single profile match',
        ARRAY['KYC Proofs', 'Academic records', 'Admission Letter', 'Co-borrower income documents'],
        ARRAY['Check eligibility on GyanDhan portal', 'Get counselor match', 'Upload documents', 'GyanDhan team coordinates with banks', 'Get sanction letter'],
        ARRAY['Education Loan Marketplace comparing multiple banks', 'Provides free loan assistance and counseling', 'Pre-visa disbursal coordination', 'Helps negotiate better rates'],
        'https://www.gyandhan.com'
      ),
      (
        'WeMakeScholars',
        'marketplace',
        'Helps secure concession rate (8.55% - 13.00%)',
        'Based on cost of attendance',
        'Guides students through bank collateral requirements',
        'Indian Citizen, admission in recognized university',
        'Lender-specific',
        'Assists with public bank interest subsidy applications',
        ARRAY['KYC', 'Academic Marksheets', 'Admission Offer', 'Co-applicant Financial Documents'],
        ARRAY['Register online', 'Submit academic and financial profile', 'Receive options from public/private lenders', 'Counselor coordinates bank processing'],
        ARRAY['Supported by Ministry of IT, Govt of India', 'Provides cashbacks and free guidance', 'Helps fast-track public sector bank loans'],
        'https://www.wemakescholars.com'
      ),
      (
        'Leverage Edu Finance',
        'marketplace',
        'Best available rates (9.00% - 13.50%)',
        'Based on university cost',
        'Compares unsecured vs secured offers',
        'Student with admission offer abroad',
        'Lender-specific',
        'None',
        ARRAY['KYC', 'Academics', 'Admit letter', 'Co-borrower financial statements'],
        ARRAY['Apply online on Leverage website', 'Choose from matched public/private partner banks', 'Document verification', 'Sanction & Disbursal'],
        ARRAY['Fully digital loan application process', 'Integration with study abroad services', 'Dedicated support managers'],
        'https://leverageedu.com/finance'
      ),
      (
        'Prodigy Finance',
        'marketplace',
        '11.20% - 14.50%',
        'Up to $100,000 (USD)',
        'No co-signer and no collateral required',
        'Admission to eligible business/engineering graduate programs globally',
        'Assessment based on future earning potential',
        'None',
        ARRAY['Valid Passport', 'Official Admission Letter with fee details', 'Credit report from home country', 'Address Proof'],
        ARRAY['Apply online on Prodigy portal', 'Provide school and course details', 'Receive custom quote in minutes', 'Upload document scans', 'Verify phone/identity', 'Sign loan contract digitally', 'Direct disbursal to university'],
        ARRAY['No Indian co-signer or collateral needed at all', 'USD-denominated loans prevent currency risk', 'Repayment holiday until 6 months after graduation', 'Assessments based on target course future salary stats'],
        'https://prodigyfinance.com'
      );
    `);

    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Error during migration/seeding:', err);
    throw err;
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

migrate()
  .then(() => console.log('Migration finished successfully!'))
  .catch(err => process.exit(1));
