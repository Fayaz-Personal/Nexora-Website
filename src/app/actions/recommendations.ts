'use server';

import { query } from '@/db';

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
    if (!apiKey) throw new Error('GROQ_API_KEY missing');

    // Get only the university name and ranking — no large text fields
    const univRes = await query(
      'SELECT name, ranking, acceptance_rate FROM universities WHERE id = $1',
      [input.targetUnivId]
    );
    if (univRes.rows.length === 0) throw new Error('University not found');
    const u = univRes.rows[0];

    const prompt = `You are a university admissions expert. Based on this student profile, predict admission chance.

Student: ${input.degree} in ${input.department}, CGPA: ${input.cgpa}/10, IELTS: ${input.ielts || 'N/A'}, TOEFL: ${input.toefl || 'N/A'}, GRE: ${input.greScore || 'N/A'}, Projects: ${input.projects}, Research Papers: ${input.researchPapers}, Work Experience: ${input.workExperience} months
Target: ${u.name} (World Rank #${u.ranking}, Acceptance Rate: ${u.acceptance_rate}%), Course: ${input.targetCourse}

Reply ONLY with valid JSON (no markdown):
{"probability":75,"status":"Moderate","explanation":"Your CGPA of X meets the typical requirement. Your GRE score strengthens your application.","safeUniversities":["University A","University B"],"moderateUniversities":["University C"],"dreamUniversities":["University D"]}

Status rules: Safe if probability>=70, Moderate if 40-69, Dream if below 40.
For safe/moderate/dream lists, suggest 2 real well-known universities per category based on ranking difficulty.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'groq/compound',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 512
      })
    });

    if (!response.ok) throw new Error(`Groq API error: ${await response.text()}`);

    const data = await response.json();
    let text = data?.choices?.[0]?.message?.content || '{}';
    // Strip markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(text) as PredictChanceResult;

  } catch (error: any) {
    console.error('Error predicting admission chance:', error);
    return {
      probability: 50,
      status: 'Moderate',
      explanation: `AI analysis failed: ${error?.message || 'Unknown error'}`,
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

export interface CourseRec { name: string; university: string; fees: string; duration: string; matchReason: string; }
export interface UniRec { name: string; ranking: number; country: string; reason: string; }
export interface ScholarshipRec { name: string; provider: string; amount: string; criteria: string; }
export interface CountryRec { name: string; visaInfo: string; averageCost: string; }

export interface RecommendationResult {
  universities: UniRec[];
  courses: CourseRec[];
  scholarships: ScholarshipRec[];
  countries: CountryRec[];
}

export async function generateAIRecommendations(input: RecommendationInput): Promise<RecommendationResult> {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY missing');

    const prompt = `You are a university admissions advisor. Recommend universities, courses, scholarships, and countries for this student.

Student: ${input.academicBackground}, CGPA: ${input.cgpa}/10
Skills: ${input.skills.slice(0, 5).join(', ') || 'Not specified'}
Interests: ${input.interests.slice(0, 5).join(', ') || 'Not specified'}
Goals: ${input.careerGoals.slice(0, 3).join(', ') || 'Not specified'}
Budget: $${input.budget}/year, Countries: ${input.preferredCountries.slice(0, 3).join(', ') || 'Any'}, Degree: ${input.preferredDegree}

Reply ONLY with valid JSON (no markdown):
{"universities":[{"name":"TU Munich","ranking":37,"country":"Germany","reason":"Strong CS program within budget"}],"courses":[{"name":"MSc Computer Science","university":"TU Munich","fees":"$3000/yr","duration":"2 years","matchReason":"Matches AI interest"}],"scholarships":[{"name":"DAAD Scholarship","provider":"DAAD Germany","amount":"Full funding","criteria":"Academic excellence"}],"countries":[{"name":"Germany","visaInfo":"Student visa required, 3 months processing","averageCost":"$800/month"}]}

Provide 3 items per category. Base recommendations on the student profile and budget.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'groq/compound',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 800
      })
    });

    if (!response.ok) throw new Error(`Groq API error: ${await response.text()}`);

    const data = await response.json();
    let text = data?.choices?.[0]?.message?.content || '{}';
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(text) as RecommendationResult;

  } catch (error: any) {
    console.error('Error generating AI recommendations:', error);
    return { universities: [], courses: [], scholarships: [], countries: [] };
  }
}
