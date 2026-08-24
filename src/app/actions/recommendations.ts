'use server';

import { query } from '@/db';
import { getCurrentUser } from './auth';

// NOTE: apiKey is read inside functions, not at module level
// This ensures Vercel env vars are available at runtime

export interface PredictChanceInput {
  degree: string;
  department: string;
  cgpa: number;
  ielts: number;
  toefl: number;
  greScore: string;
  projects: number;
  researchPapers: number;
  workExperience: number;
  targetUnivId: number;
  targetCourse: string;
}

export interface PredictChanceResult {
  probability: number;
  status: 'Safe' | 'Moderate' | 'Dream';
  explanation: string;
  safeUniversities: string[];
  moderateUniversities: string[];
  dreamUniversities: string[];
}

export async function predictAdmissionChance(input: PredictChanceInput): Promise<PredictChanceResult> {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("Groq API Key is missing. Please add GROQ_API_KEY to your .env.local file.");
    }

    // 1. Fetch Target University Details
    const univRes = await query('SELECT * FROM universities WHERE id = $1', [input.targetUnivId]);
    if (univRes.rows.length === 0) {
      throw new Error('Target university not found in database.');
    }
    const targetUniv = univRes.rows[0];

    // 1b. Fetch specific entrance exam requirements if any
    const courseRequirementsRes = await query(`
      SELECT cer.*, ee.name as exam_name, ee.full_name as exam_full_name
      FROM course_exam_requirements cer
      JOIN entrance_exams ee ON cer.exam_id = ee.id
      JOIN courses c ON cer.course_id = c.id
      WHERE c.university_id = $1 AND (c.name ILIKE $2 OR c.department ILIKE $2)
    `, [input.targetUnivId, `%${input.targetCourse}%`]);
    const examRequirements = courseRequirementsRes.rows;

    // 2. Fetch a smart subset of other universities (10 dream, 10 moderate, 10 safe relative to target ranking)
    const targetRank = targetUniv.ranking || 500;

    const dreamRes = await query(`
      SELECT u.name, c.name as country_name, u.ranking, u.acceptance_rate, u.eligibility_requirements
      FROM universities u
      JOIN countries c ON u.country_id = c.id
      WHERE u.ranking < $1
      ORDER BY u.ranking DESC
      LIMIT 10
    `, [targetRank]);

    const moderateRes = await query(`
      SELECT u.name, c.name as country_name, u.ranking, u.acceptance_rate, u.eligibility_requirements
      FROM universities u
      JOIN countries c ON u.country_id = c.id
      ORDER BY ABS(u.ranking - $1) ASC
      LIMIT 10
    `, [targetRank]);

    const safeRes = await query(`
      SELECT u.name, c.name as country_name, u.ranking, u.acceptance_rate, u.eligibility_requirements
      FROM universities u
      JOIN countries c ON u.country_id = c.id
      WHERE u.ranking > $1
      ORDER BY u.ranking ASC
      LIMIT 10
    `, [targetRank]);

    // Combine and deduplicate
    const combined = [...dreamRes.rows, ...moderateRes.rows, ...safeRes.rows];
    const seen = new Set();
    const allUnivs = [];
    for (const u of combined) {
      if (!seen.has(u.name)) {
        seen.add(u.name);
        allUnivs.push(u);
      }
    }

    const systemPrompt = `
You are the Nexora Admission Chance Predictor, an expert university admissions audit system.
Analyze the student's profile details and target choices below. You MUST audit the student's credentials (CGPA, TOEFL, IELTS, GRE) directly against the target university's general eligibility requirements and course-specific exam minimum scores from the database.

Deduce the probability strictly:
1. Admission Probability (from 10% to 95%):
   - Deduct heavily if the student fails to meet the minimum GPA or minimum exam score requirements.
   - If they meet or exceed the requirements, calculate the probability based on the university's acceptance rate and student's profile strength (projects, work experience, papers).
2. Eligibility Status (one of "Safe", "Moderate", or "Dream"):
   - "Safe" if student comfortably exceeds all requirements and has a strong profile.
   - "Moderate" if they meet requirements but the university has a competitive acceptance rate.
   - "Dream" if they do not meet some requirements, or if the university is highly competitive (acceptance rate < 10%).
3. A detailed analysis explanation:
   - Explicitly cite the university's GPA and test requirements versus the student's actual values (e.g. "Your CGPA of 3.6 exceeds the minimum requirement of 3.0, but your GRE is not provided which is recommended").
4. Select 2-3 suitable alternative universities from the provided database list categorized under "Safe", "Moderate", and "Dream".

Available Database Universities:
${allUnivs.map(u => `- ${u.name} (Rank: #${u.ranking}, Acceptance: ${u.acceptance_rate}%, Country: ${u.country_name}, Req: ${u.eligibility_requirements || 'Minimum GPA: 3.0, IELTS 6.5'}).`).join('\n')}

Output your response in STRICT JSON format matching the following schema:
{
  "probability": number,
  "status": "Safe" | "Moderate" | "Dream",
  "explanation": "string",
  "safeUniversities": ["string", "string"],
  "moderateUniversities": ["string", "string"],
  "dreamUniversities": ["string", "string"]
}
`;

    const userPrompt = `
Student Academic Profile:
- Current Degree: ${input.degree}
- Major/Department: ${input.department}
- CGPA: ${input.cgpa}
- IELTS Score: ${input.ielts || 'N/A'}
- TOEFL Score: ${input.toefl || 'N/A'}
- GRE Score: ${input.greScore || 'N/A'}
- Number of Projects: ${input.projects}
- Research Papers: ${input.researchPapers}
- Work Experience (Months): ${input.workExperience}

Target Choice:
- Target University: ${targetUniv.name} (Rank: #${targetUniv.ranking}, Acceptance Rate: ${targetUniv.acceptance_rate}%)
- Target Course: ${input.targetCourse}

Target University Admission & Eligibility Requirements (from Database):
- General Requirements: ${targetUniv.eligibility_requirements || 'Minimum GPA: 3.0 or equivalent, English test required (IELTS 6.5 / TOEFL 90).'}
${examRequirements.length > 0 ? `- Course Specific Exam Minimum Scores:\n${examRequirements.map(er => `  * ${er.exam_full_name} (${er.exam_name}): Minimum score of ${er.min_score}`).join('\n')}` : ''}
`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${await response.text()}`);
    }

    const data = await response.json();
    const resultText = data?.choices?.[0]?.message?.content || '{}';
    return JSON.parse(resultText) as PredictChanceResult;

  } catch (error: any) {
    console.error('Error predicting admission chance:', error);
    return {
      probability: 50,
      status: 'Moderate',
      explanation: `Could not perform AI analysis: ${error?.message || error || 'Unknown error'}. Please verify database connectivity and your GROQ_API_KEY environment settings.`,
      safeUniversities: ['Technical University of Munich', 'University of Toronto'],
      moderateUniversities: ['University of Melbourne'],
      dreamUniversities: ['Stanford University']
    };
  }
}

export interface RecommendationInput {
  academicBackground: string;
  cgpa: number;
  skills: string[];
  interests: string[];
  careerGoals: string[];
  budget: number;
  preferredCountries: string[];
  preferredDegree: string;
}

export interface CourseRec {
  name: string;
  university: string;
  fees: string;
  duration: string;
  matchReason: string;
}

export interface UniRec {
  name: string;
  ranking: number;
  country: string;
  reason: string;
}

export interface ScholarshipRec {
  name: string;
  provider: string;
  amount: string;
  criteria: string;
}

export interface CountryRec {
  name: string;
  visaInfo: string;
  averageCost: string;
}

export interface RecommendationResult {
  universities: UniRec[];
  courses: CourseRec[];
  scholarships: ScholarshipRec[];
  countries: CountryRec[];
}

export async function generateAIRecommendations(input: RecommendationInput): Promise<RecommendationResult> {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("Groq API Key is missing. Please add GROQ_API_KEY to your .env.local file.");
    }

    // 1. Fetch DB Universities matching preferred countries, sorted by ranking (limit to 30)
    let uniSql = `
      SELECT u.id, u.name, u.ranking, u.acceptance_rate, u.eligibility_requirements, c.name as country_name 
      FROM universities u
      JOIN countries c ON u.country_id = c.id
    `;
    const uniParams = [];
    if (input.preferredCountries && input.preferredCountries.length > 0 && !input.preferredCountries.includes('Any')) {
      uniSql += ` WHERE LOWER(c.name) = ANY($1) `;
      uniParams.push(input.preferredCountries.map(c => c.toLowerCase().trim()));
    }
    uniSql += ` ORDER BY u.ranking ASC LIMIT 30 `;
    const univsRes = await query(uniSql, uniParams);
    const dbUnivs = univsRes.rows;

    // 2. Fetch DB Courses matching budget, degree type, and country if specified (limit to 35)
    let courseSql = `
      SELECT c.id, c.name, c.degree_type, c.department, c.fees, c.duration, u.name as university_name
      FROM courses c
      JOIN universities u ON c.university_id = u.id
      JOIN countries co ON u.country_id = co.id
      WHERE c.fees <= $1
    `;
    const courseParams: any[] = [input.budget];
    let pIdx = 2;

    if (input.preferredCountries && input.preferredCountries.length > 0 && !input.preferredCountries.includes('Any')) {
      courseSql += ` AND LOWER(co.name) = ANY($${pIdx}) `;
      courseParams.push(input.preferredCountries.map(c => c.toLowerCase().trim()));
      pIdx++;
    }

    if (input.preferredDegree && input.preferredDegree !== 'all') {
      courseSql += ` AND c.degree_type = $${pIdx} `;
      courseParams.push(input.preferredDegree);
      pIdx++;
    }

    courseSql += ` ORDER BY u.ranking ASC, c.fees ASC LIMIT 35 `;
    let coursesRes = await query(courseSql, courseParams);
    let dbCourses = coursesRes.rows;

    if (dbCourses.length === 0 && dbUnivs.length > 0) {
      // Fallback: Broaden search by removing constraints if no matches are found but universities exist
      const fallbackRes = await query(`
        SELECT c.id, c.name, c.degree_type, c.department, c.fees, c.duration, u.name as university_name
        FROM courses c
        JOIN universities u ON c.university_id = u.id
        ORDER BY u.ranking ASC LIMIT 35
      `);
      dbCourses = fallbackRes.rows;
    }

    // 3. Fetch DB Scholarships (limit to 20)
    const scholarshipsRes = await query('SELECT name, provider, amount, eligibility_criteria FROM scholarships LIMIT 20');
    const dbScholarships = scholarshipsRes.rows;

    // 4. Fetch DB Countries with Visa Details
    const countriesRes = await query(`
      SELECT c.name, c.visa_info, c.average_living_cost, c.currency, v.requirements, v.timeline, v.fee
      FROM countries c
      LEFT JOIN visas v ON v.country_id = c.id
    `);
    const dbCountries = countriesRes.rows;

    const systemPrompt = `
You are the Nexora AI Higher Studies Recommendation Engine.
Match the student's background against the local database context of Universities, Courses, and Scholarships.
Return highly personalized recommendations.

CRITICAL RULE: You MUST ONLY recommend universities, courses, scholarships, and countries that are explicitly listed in the "Context Catalog from DB" below. You are strictly FORBIDDEN from suggesting or hallucinating any school, course, scholarship, or country not present in these lists.
- If the "Universities" list is empty, return an empty array [] for "universities" and "courses". Do not suggest any universities.
- If the "Courses" list is empty, return an empty array [] for "courses".
- If the "Scholarships" list is empty, return an empty array [] for "scholarships".
- If the "Countries & Visas" list is empty, return an empty array [] for "countries".
- Do not mention or recommend standard institutions like MIT, Stanford, TUM, or IITs unless they are explicitly present in the catalogs below.

Context Catalog from DB:
--- Universities ---
${dbUnivs.map(u => `- ${u.name} (Rank: #${u.ranking}, Country: ${u.country_name}, Requirements: ${u.eligibility_requirements || 'Minimum GPA: 3.0, IELTS 6.5'}).`).join('\n') || '(No universities in database)'}

--- Courses ---
${dbCourses.map(c => `- ${c.name} (${c.degree_type}) at ${c.university_name} (Fees: $${Number(c.fees).toLocaleString()}/yr, Duration: ${c.duration}, Dept: ${c.department})`).join('\n') || '(No courses in database)'}

--- Scholarships ---
${dbScholarships.map(s => `- ${s.name} by ${s.provider} (Amount: ${s.amount}, Criteria: ${s.eligibility_criteria})`).join('\n') || '(No scholarships in database)'}

--- Countries & Visas ---
${dbCountries.map(c => `- ${c.name}: Requirements: ${c.requirements || c.visa_info || 'N/A'}, Timeline: ${c.timeline || 'N/A'}, Fee: $${c.fee || 'N/A'}, Avg Cost: $${Number(c.average_living_cost).toLocaleString()}/month (${c.currency})`).join('\n') || '(No countries in database)'}

Return your response in STRICT JSON format matching the following schema:
{
  "universities": [
    { "name": "string", "ranking": number, "country": "string", "reason": "string" }
  ],
  "courses": [
    { "name": "string", "university": "string", "fees": "string", "duration": "string", "matchReason": "string" }
  ],
  "scholarships": [
    { "name": "string", "provider": "string", "amount": "string", "criteria": "string" }
  ],
  "countries": [
    { "name": "string", "visaInfo": "string", "averageCost": "string" }
  ]
}
`;

    const userPrompt = `
Student Preferences & Background:
- Academic Background: ${input.academicBackground}
- CGPA: ${input.cgpa}
- Skills: ${input.skills.join(', ') || 'None listed'}
- Interests: ${input.interests.join(', ') || 'None listed'}
- Career Goals: ${input.careerGoals.join(', ') || 'None listed'}
- Budget Limit: $${input.budget.toLocaleString()}/year
- Preferred Countries: ${input.preferredCountries.join(', ') || 'Any'}
- Target Degree Type: ${input.preferredDegree}
`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${await response.text()}`);
    }

    const data = await response.json();
    const resultText = data?.choices?.[0]?.message?.content || '{}';
    return JSON.parse(resultText) as RecommendationResult;

  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    return {
      universities: [],
      courses: [],
      scholarships: [],
      countries: []
    };
  }
}
