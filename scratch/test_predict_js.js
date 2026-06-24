const fs = require('fs');

let apiKey = '';
if (fs.existsSync('.env.local')) {
  const env = fs.readFileSync('.env.local', 'utf8');
  const match = env.match(/GROQ_API_KEY=(.+)/);
  if (match) {
    apiKey = match[1].trim().replace(/\\/g, '').replace(/"/g, '');
  }
}

const allUnivs = [
  { name: 'Stanford University', ranking: 3, acceptance_rate: 4, country_name: 'United States' },
  { name: 'Technical University of Munich', ranking: 37, acceptance_rate: 8, country_name: 'Germany' },
  { name: 'University of Oxford', ranking: 4, acceptance_rate: 15, country_name: 'United Kingdom' },
  { name: 'University of Toronto', ranking: 21, acceptance_rate: 43, country_name: 'Canada' },
  { name: 'University of Melbourne', ranking: 14, acceptance_rate: 70, country_name: 'Australia' }
];

const targetUniv = {
  name: 'Stanford University',
  ranking: 3,
  acceptance_rate: 4
};

const input = {
  degree: 'BTech',
  department: 'Computer Science',
  cgpa: 9.01,
  ielts: 7.5,
  toefl: 100,
  greScore: '320',
  projects: 3,
  researchPapers: 1,
  workExperience: 12,
  targetCourse: 'MS in botany'
};

async function test() {
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

  console.log('Sending request to Groq...');
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

  console.log('Status:', response.status);
  console.log('Status Text:', response.statusText);
  const data = await response.json();
  console.log('Data:', JSON.stringify(data, null, 2));
}

test().catch(console.error);
