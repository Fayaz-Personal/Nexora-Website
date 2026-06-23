# 🌌 Nexora | AI-Powered Higher Studies Guidance Platform

Nexora is a premium, state-of-the-art higher education guidance portal designed to empower students globally in their international study-abroad journeys. Leveraging the power of Next.js 15, React 19, Tailwind CSS v4, PostgreSQL, and advanced LLMs (Llama 3.3 via Groq), Nexora automates and customizes the entire university application, loan search, and visa process.

---

## 🚀 Key Features

### 🎓 For Students
1. **Interactive Onboarding & Roadmaps**: Customized student profiling (CGPA, target degree, budgets, preferred countries) mapped to an interactive roadmap tracking milestones from exams to enrollment.
2. **AI Admission Chance Predictor**: Analyzes a student's profile (GPA, GRE/IELTS scores, projects, papers, work experience) and predicts admission probabilities (classified as *Safe*, *Moderate*, or *Dream*) for specific target universities using Llama 3.3.
3. **AI Recommendations Engine**: Suggests suitable matching courses, universities, scholarships, and target countries tailored to the student's unique academic background and budget.
4. **AI Counselor Chatbot**: A 24/7 interactive chat advisor powered by the `llama-3.3-70b-versatile` model, fully aware of student profiles and local databases, providing advice on admissions, documents, housing, and visas.
5. **Funding & Loan Portal**: A comprehensive directory of public banks (e.g., SBI, Bank of Baroda), private banks/NBFCs (e.g., HDFC Credila, Axis Bank), and government portals/schemes, highlighting interest rates, collateral requirements, and documents.
6. **Visa & Document Checklist**: Country-specific guides (USA, Germany, UK, Canada, Australia) containing fee structures, document checklists, timelines, and step-by-step preparation steps.
7. **Expense & Budget Simulator**: Interactive cost calculation helper comparing rent, food, transport, insurance, and miscellaneous living costs across different countries and cities.
8. **Accommodation Directory**: Real-time listing of hostels, PG rooms, student housings, and private apartments relative to campus proximity.
9. **Alumni Testimonial Network**: Connecting aspirants with alumni outcomes, testimonials, and industry placement data.

### 🏛️ For University Admins
* **Course & Admissions Catalog Manager**: Update courses, degrees, admission guidelines, fee structures, and test requirements.

### 👑 For Platform Admins
* **Data & Operations Dashboard**: High-level platform analytics, enrolled student metrics, and database catalog management.

---

## 🛠️ Technology Stack

* **Frontend Framework**: [Next.js 15](https://nextjs.org/) (App Router, Turbopack) & [React 19](https://react.dev/)
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/) (smooth micro-animations), [Lucide React](https://lucide.dev/) (icons)
* **Charts & Analytics**: [Recharts](https://recharts.org/)
* **Database**: [PostgreSQL](https://www.postgresql.org/) (relational storage with `pg` client driver)
* **Auth**: Custom JWT-based sessions, bcryptjs encryption, and OTP email validation
* **Email Dispatcher**: Nodemailer for sending verification OTPs
* **AI Engine**: Groq API integration utilising `llama-3.3-70b-versatile`

---

## 🗄️ Database Schema Design

Nexora relies on a highly relational PostgreSQL schema to power its matching algorithms and trackers. Below is the list of database tables defined in `src/db/migrate.js`:

| Table Name | Primary Purpose / Description |
| :--- | :--- |
| `users` | Accounts storing credentials, password hashes, verified flags, and system roles (`student`, `uni_admin`, `platform_admin`). |
| `countries` | Global study destinations, visa details, average living costs, and currencies. |
| `cities` | Cities belonging to countries, featuring a cost-of-living multiplier. |
| `student_profiles` | Profile details (GPAs, budgets, preferred locations, readiness/strength scores). |
| `universities` | University profiles (logos, global ranking, acceptance rates, fee ranges, and websites). |
| `courses` | Course catalogues mapped to specific departments, degree levels (MS, PhD, MBA), and tuition costs. |
| `scholarships` | Private, government, and university-sponsored scholarships, deadlines, and eligibility criteria. |
| `entrance_exams` | Standardized exams (GRE, IELTS, TOEFL, GMAT) with test schedules and resources. |
| `course_exam_requirements` | Connects specific courses to minimum required entrance exam scores. |
| `living_costs` | Living cost breakdowns per country (rent, food, transit, insurance). |
| `accommodations` | Shared rooms, PG rooms, hostels, or apartment availability lists. |
| `visas` | Document checklists, fee requirements, and application steps per target country. |
| `flights` | Travel ticket estimates and packing tips from target departure origins. |
| `alumni` | Placement logs and text testimonials of graduates from universities. |
| `admission_predictions` | Tracks AI-calculated admission probability ratings (Safe/Moderate/Dream) per student. |
| `student_roadmaps` | Interactive step milestones from profile setups to departure schedules. |
| `funding_providers` | Comparison grid records of banking and loan organizations. |
| `chatbot_conversations` & `messages` | Chat history storage records for the AI counselor. |

---

## ⚡ Server Actions API

Nexora uses secure, asynchronous Next.js Server Actions (`'use server'`) under `src/app/actions` to execute backend database queries and external API integrations:

* **Authentication (`auth.ts`)**:
  * `signUpUser(email, password, role)`: Registers new users, generating custom email verification codes.
  * `verifyOTP(email, code)`: Verifies user account status.
  * `signInUser(email, password)`: Validates credentials, signs JWT session cookies, and redirects based on roles.
  * `signOutUser()`: Destroys user session cookies.
  * `getCurrentUser()`: Fetches current session state decoded from client cookies.
* **Student Operations (`student.ts`)**:
  * `getUniversities(filters, profileId)`: Returns universities, checking if they are saved by the student.
  * `getCourses(filters, profileId)`: Lists course options filtered by degree type, department, and budget.
  * `getScholarships(profileId)`: Automatically calculates personalized criteria match percentages based on CGPA.
  * `toggleSaveUniversity(univId, profileId, savedStatus)`: Toggles university bookmarks and triggers admission predictor.
  * `updateStudentProfile(profileId, data)`: Updates profile stats and recalculates prediction benchmarks.
  * `saveStudentOnboarding(profileId, onboardingData)`: Processes onboarding metrics to determine AI readiness scores.
  * `updateStudentMilestones(profileId, milestones)`: Marks roadmap items completed.
* **AI Advisor Counseling (`advisor.ts`)**:
  * `askAIAdvisor(messages)`: Calls Groq API using `llama-3.3-70b-versatile`. Automatically feeds local profile context, top matching universities, and scholarship databases.
* **AI Recommendation Engines (`recommendations.ts`)**:
  * `predictAdmissionChance(input)`: Generates structured audit evaluations detailing safe, moderate, and dream alternatives.
  * `generateAIRecommendations(input)`: Returns a structured JSON payload of courses, universities, scholarships, and country visas matched to budgets and background tags.
* **Funding & Loans (`loans.ts`)**:
  * `getFundingProviders()`: Queries the database repository for public/private banks.
  * `getAIFundingRecommendations(profile)`: Recommends banking facilities based on tuition cost, parental income, and collateral status.
* **University Management (`uniAdmin.ts`)**:
  * `getUniDashboardStats(univId)`: Computes avg applicant CGPA, bookmark interest counts, and total catalogs.
  * `createCourse(data)` / `deleteCourse(id, univId)`: Manages university catalog items.
* **Platform Operations (`platformAdmin.ts`)**:
  * `getPlatformStats()`: Pulls student department breakdowns, event history graphs, and chat aggregates.

---

## 📁 Repository Directory Structure

```
d:/office
├── src/
│   ├── app/                    # Next.js pages, layouts & routing
│   │   ├── actions/            # Server Actions handling logic (Auth, AI, Student, Uni-Admin)
│   │   ├── auth/               # Sign-in, Sign-up, Verification pages
│   │   ├── platform-admin/     # Platform administrator console
│   │   ├── student/            # Student portal pages (universities, scholarships, visa, dashboard, etc.)
│   │   └── uni-admin/          # University administrator console
│   ├── components/             # Reusable UI components (Navbar, AIChatbot, etc.)
│   └── db/                     # DB client connection, tables migration & seed scripts
├── public/                     # Static media files, logos, and background graphics
├── parse_docx_to_json.py       # Python script converting raw DOCX documents into JSON
├── inspect_files.py            # Utility script for verifying raw DOCX paragraphs structure
├── verify_parser.py            # Helper script verifying raw text lines before mapping
└── package.json                # Project dependencies and script runner config
```

---

## ⚙️ Installation & Local Setup

### 1. Prerequisites
Ensure you have the following installed on your machine:
* **Node.js** (v18.x or above)
* **NPM** or **Yarn**
* **PostgreSQL** instance (local database or hosted like Supabase)
* **Python 3** (if you want to run parser scripts)

### 2. Clone and Install Dependencies
Navigate to the directory and run:
```bash
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory and add the following keys:
```env
DATABASE_URL=your_postgresql_connection_string
GROQ_API_KEY=your_groq_api_key
JWT_SECRET=your_jwt_secret_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail_address
SMTP_PASS=your_gmail_app_password

# Google Sign-In configuration (OAuth 2.0 Client ID)
# Leave blank or omit to auto-enable "Google Identity Sandbox" simulation mode
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_from_developer_console
```

### 4. Database Initialization & Seeding
Deploy the tables and seed mock data (such as default users, countries, top universities, scholarships, and loan details) by running:
```bash
node src/db/migrate.js
```

### 5. Running the Development Server
To launch Nexora locally, execute:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to interact with the platform.

---

## 📊 Data Ingestion & Parser Scripts
Nexora uses automated data pipeline helpers in Python to structure bulk information:
* `parse_docx_to_json.py`: Extracts and filters details from documents like `Loan details (1).docx` into `loans_parsed.json`, which is then read by the database seeder.
* `QS World University Rankings 2025 (Top global universities).csv`: Ingests and processes data for over 1500 universities globally.
