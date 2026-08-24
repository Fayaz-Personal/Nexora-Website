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

// Helper to call Groq with any available model, falling back if needed
async function callGroq(apiKey: string, prompt: string, maxTokens: number = 600): Promise<string> {
  const models = [
    'llama-3.1-8b-instant',
    'groq/compound',
    'llama3-8b-8192',
  ];

  for (const model of models) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,
          max_tokens: maxTokens,
        })
      });

      if (!res.ok) {
        const err = await res.text();
        // If model not found or decommissioned, try next
        if (res.status === 404 || res.status === 400) continue;
        throw new Error(`Groq ${model} error: ${err}`);
      }

      const data = await res.json();
      return data?.choices?.[0]?.message?.content || '';
    } catch (e: any) {
      if (e.message?.includes('model_not_found') || e.message?.includes('decommissioned')) continue;
      throw e;
    }
  }
  throw new Error('All Groq models failed');
}

// Extract JSON from AI response (handles markdown code blocks)
function extractJSON(text: string): any {
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();

  // Try direct parse
  try { return JSON.parse(cleaned); } catch {}

  // Try to extract JSON object from text
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }

  return null;
}

export async function predictAdmissionChance(input: PredictChanceInput): Promise<PredictChanceResult> {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY missing');

    // Get university name and basic info only
    const univRes = await query(
      'SELECT name, ranking, acceptance_rate FROM universities WHERE id = $1',
      [input.targetUnivId]
    );
    if (univRes.rows.length === 0) throw new Error('University not found');
    const u = univRes.rows[0];

    const prompt = `You are a university admissions expert. Predict admission chances.

Student profile:
- Degree: ${input.degree} in ${input.department}
- CGPA: ${input.cgpa}/10
- IELTS: ${input.ielts || 'Not taken'}, TOEFL: ${input.toefl || 'Not taken'}, GRE: ${input.greScore || 'Not taken'}
- Projects: ${input.projects}, Research Papers: ${input.researchPapers}
- Work Experience: ${input.workExperience} months
- Target Course: ${input.targetCourse}
- Target University: ${u.name} (Global Rank #${u.ranking}, Acceptance Rate: ${u.acceptance_rate}%)

Respond ONLY with this JSON (no extra text, no markdown):
{"probability":72,"status":"Moderate","explanation":"Your CGPA of ${input.cgpa} is competitive for ${u.name}. Strong project portfolio helps. Limited research experience may be a concern.","safeUniversities":["University of Toronto","TU Munich"],"moderateUniversities":["${u.name}","University of Edinburgh"],"dreamUniversities":["MIT","Stanford University"]}

Replace the example values with your actual analysis. Status must be: Safe (probability 70+), Moderate (40-69), Dream (below 40).`;

    const text = await callGroq(apiKey, prompt, 500);
    const parsed = extractJSON(text);

    if (!parsed || typeof parsed.probability !== 'number') {
      throw new Error('Invalid JSON response from AI');
    }

    return parsed as PredictChanceResult;

  } catch (error: any) {
    console.error('Error predicting admission chance:', error);
    // Return computed fallback based on actual inputs
    const cgpa = Number(input.cgpa);
    const prob = Math.min(90, Math.max(15, Math.round(cgpa * 10)));
    return {
      probability: prob,
      status: prob >= 70 ? 'Safe' : prob >= 40 ? 'Moderate' : 'Dream',
      explanation: `Based on your CGPA of ${cgpa}, your estimated admission probability is ${prob}%. Please try again for a detailed AI analysis.`,
      safeUniversities: ['University of Toronto', 'TU Munich'],
      moderateUniversities: ['University of Edinburgh', 'University of Melbourne'],
      dreamUniversities: ['MIT', 'Stanford University']
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

    const countries = input.preferredCountries.slice(0, 3).join(', ') || 'Any';
    const skills = input.skills.slice(0, 5).join(', ') || 'Not specified';
    const interests = input.interests.slice(0, 4).join(', ') || 'Not specified';
    const goals = input.careerGoals.slice(0, 2).join(', ') || 'Not specified';

    const prompt = `You are a university admissions counselor. Recommend universities, courses, scholarships and countries.

Student:
- Background: ${input.academicBackground}
- CGPA: ${input.cgpa}/10
- Skills: ${skills}
- Interests: ${interests}
- Goals: ${goals}
- Budget: $${input.budget}/year
- Preferred Countries: ${countries}
- Degree Type: ${input.preferredDegree}

Respond ONLY with this JSON structure (no markdown, no extra text):
{"universities":[{"name":"TU Munich","ranking":37,"country":"Germany","reason":"Top CS program, affordable tuition under budget"},{"name":"University of Toronto","ranking":25,"country":"Canada","reason":"Strong AI research matching your interests"},{"name":"University of Edinburgh","ranking":27,"country":"United Kingdom","reason":"Excellent data engineering courses"}],"courses":[{"name":"MSc Artificial Intelligence","university":"TU Munich","fees":"$3,000/yr","duration":"2 years","matchReason":"Directly matches AI interest and ML skills"},{"name":"MSc Data Science","university":"University of Toronto","fees":"$18,000/yr","duration":"1.5 years","matchReason":"Aligns with SQL and data engineering skills"},{"name":"MSc Machine Learning","university":"University of Edinburgh","fees":"$25,000/yr","duration":"1 year","matchReason":"Perfect for ML and Python background"}],"scholarships":[{"name":"DAAD Scholarship","provider":"German Academic Exchange","amount":"Full funding + living stipend","criteria":"Academic excellence, CGPA 3.5+"},{"name":"Vanier Canada Graduate","provider":"Government of Canada","amount":"$50,000/year","criteria":"Leadership and academic achievement"},{"name":"Edinburgh Global Scholarship","provider":"University of Edinburgh","amount":"$10,000","criteria":"International students with strong academics"}],"countries":[{"name":"Germany","visaInfo":"Student visa required, 6-8 weeks processing, blocked account needed","averageCost":"$800-1200/month"},{"name":"Canada","visaInfo":"Study permit required, 8-12 weeks processing","averageCost":"$1200-1800/month"},{"name":"United Kingdom","visaInfo":"Student visa required, 3 weeks processing","averageCost":"$1500-2000/month"}]}

Replace ALL example data with REAL recommendations based on this student's actual profile. Make it specific to their CGPA of ${input.cgpa}, skills (${skills}), and budget of $${input.budget}/year.`;

    const text = await callGroq(apiKey, prompt, 900);
    const parsed = extractJSON(text);

    if (!parsed || !Array.isArray(parsed.universities)) {
      throw new Error(`Invalid response: ${text.substring(0, 200)}`);
    }

    return parsed as RecommendationResult;

  } catch (error: any) {
    console.error('Error generating AI recommendations:', error);
    // Return meaningful fallback based on actual profile
    const cgpa = Number(input.cgpa);
    const budget = Number(input.budget);
    const countries = input.preferredCountries.join(', ') || 'Germany, USA';

    return {
      universities: [
        { name: 'TU Munich', ranking: 37, country: 'Germany', reason: `Good fit for ${input.academicBackground} with CGPA ${cgpa}` },
        { name: 'University of Toronto', ranking: 25, country: 'Canada', reason: `Strong program matching your interests in ${input.interests.slice(0,2).join(', ')}` },
        { name: 'University of Edinburgh', ranking: 27, country: 'UK', reason: `Excellent research opportunities within $${budget}/yr budget` }
      ],
      courses: [
        { name: `${input.preferredDegree} in ${input.interests[0] || 'Computer Science'}`, university: 'TU Munich', fees: '$3,000/yr', duration: '2 years', matchReason: `Matches your skills: ${input.skills.slice(0,2).join(', ')}` },
        { name: `${input.preferredDegree} Data Science`, university: 'University of Toronto', fees: '$18,000/yr', duration: '1.5 years', matchReason: `Aligns with career goal: ${input.careerGoals[0] || 'Research'}` }
      ],
      scholarships: [
        { name: 'DAAD Scholarship', provider: 'German Academic Exchange Service', amount: 'Full Funding', criteria: `Academic excellence, suitable for CGPA ${cgpa}` },
        { name: 'Vanier Canada Graduate Scholarships', provider: 'Government of Canada', amount: '$50,000/year', criteria: 'Leadership and academic achievement' }
      ],
      countries: [
        { name: 'Germany', visaInfo: 'Student visa required, blocked account of €11,208 needed', averageCost: '$800-1,200/month' },
        { name: 'Canada', visaInfo: 'Study permit required, 8-12 weeks processing', averageCost: '$1,200-1,800/month' }
      ]
    };
  }
}
