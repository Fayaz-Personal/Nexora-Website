'use server';

import { query } from '@/db';
import { getCurrentUser } from './auth';

const apiKey = process.env.GROQ_API_KEY;

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
    if (!apiKey) {
      throw new Error("Groq API Key is missing. Please add GROQ_API_KEY to your .env.local file.");
    }

    // 1. Fetch Target University Details
    const univRes = await query('SELECT * FROM universities WHERE id = $1', [input.targetUnivId]);
    if (univRes.rows.length === 0) {
      throw new Error('Target university not found in database.');
    }
    const targetUniv = univRes.rows[0];

    // 2. Fetch all other universities in database to provide real matching lists
    const allUnivsRes = await query(`
      SELECT u.name, c.name as country_name, u.ranking, u.acceptance_rate 
      FROM universities u
      JOIN countries c ON u.country_id = c.id
    `);
    const allUnivs = allUnivsRes.rows;

    const systemPrompt = `
You are the Nexora Admission Chance Predictor, an expert university admissions audit system.
Analyze the student's profile details and target choices below and compute:
1. Admission Probability (from 10% to 95%).
2. Eligibility Status (one of "Safe", "Moderate", or "Dream").
3. A detailed analysis explanation explaining the reasoning behind the prediction (strengths/gaps in GPA, exam scores, papers, etc., relative to the target university ranking and acceptance rate).
4. Select 2-3 suitable alternative universities from the provided database list categorized under "Safe", "Moderate", and "Dream".

Available Database Universities:
${allUnivs.map(u => `- ${u.name} (Rank: #${u.ranking}, Acceptance: ${u.acceptance_rate}%, Country: ${u.country_name})`).join('\n')}

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
`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
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

  } catch (error) {
    console.error('Error predicting admission chance:', error);
    return {
      probability: 50,
      status: 'Moderate',
      explanation: 'Could not perform AI analysis due to API timeout or local connection issues. Please check your GROQ_API_KEY environment settings.',
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
    if (!apiKey) {
      throw new Error("Groq API Key is missing. Please add GROQ_API_KEY to your .env.local file.");
    }

    // 1. Fetch DB Universities
    const univsRes = await query(`
      SELECT u.id, u.name, u.ranking, u.acceptance_rate, c.name as country_name 
      FROM universities u
      JOIN countries c ON u.country_id = c.id
    `);
    const dbUnivs = univsRes.rows;

    // 2. Fetch DB Courses
    const coursesRes = await query(`
      SELECT c.id, c.name, c.degree_type, c.department, c.fees, c.duration, u.name as university_name
      FROM courses c
      JOIN universities u ON c.university_id = u.id
    `);
    const dbCourses = coursesRes.rows;

    // 3. Fetch DB Scholarships
    const scholarshipsRes = await query('SELECT name, provider, amount, eligibility_criteria FROM scholarships');
    const dbScholarships = scholarshipsRes.rows;

    const systemPrompt = `
You are the Nexora AI Higher Studies Recommendation Engine.
Match the student's background against the local database context of Universities, Courses, and Scholarships.
Return highly personalized recommendations.

Context Lenders Catalog from DB:
--- Universities ---
${dbUnivs.map(u => `- ${u.name} (Rank: #${u.ranking}, Country: ${u.country_name})`).join('\n')}

--- Courses ---
${dbCourses.map(c => `- ${c.name} (${c.degree_type}) at ${c.university_name} (Fees: $${Number(c.fees).toLocaleString()}/yr, Duration: ${c.duration}, Dept: ${c.department})`).join('\n')}

--- Scholarships ---
${dbScholarships.map(s => `- ${s.name} by ${s.provider} (Amount: ${s.amount}, Criteria: ${s.eligibility_criteria})`).join('\n')}

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
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
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
      universities: [
        { name: 'Technical University of Munich', ranking: 37, country: 'Germany', reason: 'TUM matches your target department and tuition fees fit your budget preference.' }
      ],
      courses: [
        { name: 'MSc in Informatics', university: 'Technical University of Munich', fees: '$0/yr', duration: '2 Years', matchReason: 'Tuition is free and major alignment is ideal.' }
      ],
      scholarships: [
        { name: 'DAAD Scholarship (EPOS)', provider: 'German Academic Exchange', amount: 'Full Funding', criteria: 'Requires relevant degree and CGPA matching.' }
      ],
      countries: [
        { name: 'Germany', visaInfo: 'Blocked account showing €11,908 required.', averageCost: '€950/month' }
      ]
    };
  }
}
