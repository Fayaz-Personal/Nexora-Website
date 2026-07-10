const { Client } = require('pg');
const fs = require('fs');

let connectionString = process.env.DATABASE_URL || 'postgresql://postgres:c$a$jnneJ,A5gxE@db.moolnigpzrcdgbuzrcrg.supabase.co:6543/postgres';
if (fs.existsSync('.env.local')) {
  const env = fs.readFileSync('.env.local', 'utf8');
  const match = env.match(/DATABASE_URL=(.+)/);
  if (match) {
    connectionString = match[1].trim().replace(/\\/g, '');
  }
}

async function run() {
  const client = new Client({ connectionString });
  console.log('Connecting to database for portal migrations...');
  await client.connect();
  console.log('Connected successfully!');

  try {
    console.log('Adding columns to universities, courses, and scholarships...');
    // Add columns to universities
    await client.query(`
      ALTER TABLE universities 
      ADD COLUMN IF NOT EXISTS city VARCHAR(255),
      ADD COLUMN IF NOT EXISTS accreditation VARCHAR(255),
      ADD COLUMN IF NOT EXISTS contact_info JSONB;
    `);

    // Add columns to courses
    await client.query(`
      ALTER TABLE courses
      ADD COLUMN IF NOT EXISTS intake VARCHAR(100),
      ADD COLUMN IF NOT EXISTS application_deadline DATE,
      ADD COLUMN IF NOT EXISTS seats_available INTEGER,
      ADD COLUMN IF NOT EXISTS eligibility_criteria TEXT,
      ADD COLUMN IF NOT EXISTS required_exams VARCHAR(255),
      ADD COLUMN IF NOT EXISTS ielts_requirement DECIMAL(3,1),
      ADD COLUMN IF NOT EXISTS toefl_requirement INTEGER,
      ADD COLUMN IF NOT EXISTS gre_requirement INTEGER,
      ADD COLUMN IF NOT EXISTS min_cgpa DECIMAL(3,2);
    `);

    // Add columns to scholarships
    await client.query(`
      ALTER TABLE scholarships
      ADD COLUMN IF NOT EXISTS required_documents TEXT,
      ADD COLUMN IF NOT EXISTS description TEXT;
    `);

    console.log('Creating partner_registrations, business_profiles, student_applications, travel/loan/visa business offerings, and inquiry/ticket tables...');

    // 1. partner_registrations
    await client.query(`
      CREATE TABLE IF NOT EXISTS partner_registrations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        partner_type VARCHAR(50) NOT NULL CHECK (partner_type IN ('university', 'business')),
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
        entity_name VARCHAR(255) NOT NULL,
        category VARCHAR(100), -- for business: 'travel_agency' | 'accommodation' | 'loan_provider' | 'visa_consultancy'
        uploaded_documents JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. business_profiles
    await client.query(`
      CREATE TABLE IF NOT EXISTS business_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(100) NOT NULL CHECK (category IN ('travel_agency', 'accommodation', 'loan_provider', 'visa_consultancy')),
        company_name VARCHAR(255) NOT NULL,
        logo_url TEXT,
        website VARCHAR(255),
        contact_info JSONB,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. student_applications
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_applications (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES student_profiles(id) ON DELETE CASCADE,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
        documents_json JSONB,
        university_feedback TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. business_travel_packages
    await client.query(`
      CREATE TABLE IF NOT EXISTS business_travel_packages (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES business_profiles(id) ON DELETE CASCADE,
        destination_country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
        departure_country_id INTEGER REFERENCES countries(id) ON DELETE SET NULL,
        flight_info TEXT,
        ticket_cost DECIMAL(10,2) NOT NULL,
        has_insurance BOOLEAN DEFAULT FALSE,
        has_airport_pickup BOOLEAN DEFAULT FALSE,
        visa_assistance BOOLEAN DEFAULT FALSE,
        description TEXT,
        images TEXT[],
        available_seats INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        contact_info TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. business_loan_schemes
    await client.query(`
      CREATE TABLE IF NOT EXISTS business_loan_schemes (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES business_profiles(id) ON DELETE CASCADE,
        scheme_name VARCHAR(255) NOT NULL,
        interest_rate VARCHAR(50) NOT NULL,
        max_loan_amount DECIMAL(15,2) NOT NULL,
        eligibility_criteria TEXT,
        processing_fee DECIMAL(10,2),
        repayment_details TEXT,
        collateral_required TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. business_visa_services
    await client.query(`
      CREATE TABLE IF NOT EXISTS business_visa_services (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES business_profiles(id) ON DELETE CASCADE,
        country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
        services_offered TEXT[],
        consultation_charges DECIMAL(10,2),
        processing_fee DECIMAL(10,2),
        contact_info TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. student_inquiries
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_inquiries (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES student_profiles(id) ON DELETE CASCADE,
        business_profile_id INTEGER REFERENCES business_profiles(id) ON DELETE CASCADE,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        response TEXT,
        status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. user_tickets
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. Link business_id to accommodations
    await client.query(`
      ALTER TABLE accommodations
      ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES business_profiles(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS deposit DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS available_rooms INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS images TEXT[],
      ADD COLUMN IF NOT EXISTS wifi BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS food_availability BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS laundry BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS furnished_status VARCHAR(50) DEFAULT 'furnished',
      ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
      ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
      ADD COLUMN IF NOT EXISTS contact_information TEXT,
      ADD COLUMN IF NOT EXISTS room_capacity INTEGER DEFAULT 1;
    `);

    console.log('Database tables and columns created successfully!');

    // Seed some registration requests if empty
    const checkRegs = await client.query('SELECT COUNT(*) FROM partner_registrations');
    if (Number(checkRegs.rows[0].count) === 0) {
      console.log('Seeding mock partner registration requests...');
      // Fetch some user ids
      const usersRes = await client.query("SELECT id FROM users WHERE role = 'uni_admin' LIMIT 1");
      const busRes = await client.query("SELECT id FROM users WHERE role = 'business' LIMIT 1");
      if (usersRes.rows.length > 0) {
        await client.query(`
          INSERT INTO partner_registrations (user_id, partner_type, status, entity_name, uploaded_documents)
          VALUES ($1, 'university', 'pending', 'Technical University of Munich', '{"license_doc": "/docs/tum_license.pdf", "accreditation_doc": "/docs/tum_accreditation.pdf"}')
        `, [usersRes.rows[0].id]);
      }
      if (busRes.rows.length > 0) {
        await client.query(`
          INSERT INTO partner_registrations (user_id, partner_type, status, entity_name, category, uploaded_documents)
          VALUES ($1, 'business', 'pending', 'Nexora Travel Agency', 'travel_agency', '{"business_license": "/docs/travel_license.pdf"}')
        `, [busRes.rows[0].id]);
      }
    }

  } catch (error) {
    console.error('Error running portal migrations:', error);
  } finally {
    await client.end();
  }
}

run();
