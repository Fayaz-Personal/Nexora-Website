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

    // Combine and deduplicate — limit to 8 total to keep prompt size small
    const combined = [...dreamRes.rows, ...moderateRes.rows, ...safeRes.rows];
    const seen = new Set();
    const allUnivs = [];
    for (const u of combined) {
      if (!seen.has(u.name) && allUnivs.length < 8) {
        seen.add(u.name);
        allUnivs.push(u);
      }
    }

    const systemPrompt = `You are the Nexora Admission Chance Predictor. Analyze the student profile vs target university requirements. Return STRICT JSON only:
{
  "probability": number (10-95),
  "status": "Safe" | "Moderate" | "Dream",
  "explanation": "2-3 sentence analysis comparing student credentials to requirements",
  "safeUniversities": ["name1", "name2"],
  "moderateUniversities": ["name1", "name2"],
  "dreamUniversities": ["name1", "name2"]
}

Rules:
- Safe = prob >= 70%, Moderate = 40-70%, Dream = < 40%
- Base probability on acceptance rate, CGPA gap, and test scores
- Pick alternatives ONLY from the provided university list

Universities list (pick alternatives from here):
${allUnivs.map(u => `${u.name} | Rank #${u.ranking} | ${u.country_name} | Accept: ${u.acceptance_rate}%`).join('\n')}`;

    const userPrompt = `Student: ${input.degree} in ${input.department}, CGPA: ${input.cgpa}, IELTS: ${input.ielts || 'N/A'}, TOEFL: ${input.toefl || 'N/A'}, GRE: ${input.greScore || 'N/A'}, Projects: ${input.projects}, Papers: ${input.researchPapers}, Work Exp: ${input.workExperience} months
Target: ${targetUniv.name} (Rank #${targetUniv.ranking}, Acceptance: ${targetUniv.acceptance_rate}%, Requirements: ${(targetUniv.eligibility_requirements || 'GPA 3.0, IELTS 6.5').substring(0, 200)})
Course: ${input.targetCourse}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'groq/compound',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1024
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
    uniSql += ` ORDER BY u.ranking ASC LIMIT 10 `;
    const univsRes = await query(uniSql, uniParams);
    const dbUnivs = univsRes.rows;

    // 2. Fetch DB Courses matching budget, degree type, and country if specified (limit to 10)
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

    courseSql += ` ORDER BY u.ranking ASC, c.fees ASC LIMIT 10 `;
    let coursesRes = await query(courseSql, courseParams);
    let dbCourses = coursesRes.rows;

    if (dbCourses.length === 0 && dbUnivs.length > 0) {
      const fallbackRes = await query(`
        SELECT c.id, c.name, c.degree_type, c.department, c.fees, c.duration, u.name as university_name
        FROM courses c
        JOIN universities u ON c.university_id = u.id
        ORDER BY u.ranking ASC LIMIT 10
      `);
      dbCourses = fallbackRes.rows;
    }

    // 3. Fetch DB Scholarships (limit to 8)
    const scholarshipsRes = await query('SELECT name, provider, amount, eligibility_criteria FROM scholarships LIMIT 8');
    const dbScholarships = scholarshipsRes.rows;

    // 4. Fetch DB Countries (limit to preferred ones only)
    const countriesRes = await query(`
      SELECT c.name, c.average_living_cost, c.currency, v.fee
      FROM countries c
      LEFT JOIN visas v ON v.country_id = c.id
      LIMIT 10
    `);
    const dbCountries = countriesRes.rows;

    const systemPrompt = `You are the Nexora AI Recommendation Engine. Match student profile to DB data. Return STRICT JSON only:
{
  "universities": [{"name":"string","ranking":0,"country":"string","reason":"string"}],
  "courses": [{"name":"string","university":"string","fees":"string","duration":"string","matchReason":"string"}],
  "scholarships": [{"name":"string","provider":"string","amount":"string","criteria":"string"}],
  "countries": [{"name":"string","visaInfo":"string","averageCost":"string"}]
}
ONLY use data from these lists. Max 3 items per category.

Universities: ${dbUnivs.map(u => `${u.name}|#${u.ranking}|${u.country_name}`).join('; ') || 'none'}
Courses: ${dbCourses.map(c => `${c.name}|${c.degree_type}|${c.university_name}|$${Number(c.fees).toLocaleString()}/yr|${c.duration}`).join('; ') || 'none'}
Scholarships: ${dbScholarships.map(s => `${s.name}|${s.provider}|${s.amount}`).join('; ') || 'none'}
Countries: ${dbCountries.map(c => `${c.name}|$${Number(c.average_living_cost).toLocaleString()}/mo`).join('; ') || 'none'}`;
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
        model: 'groq/compound',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 1024
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
