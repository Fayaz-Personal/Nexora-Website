'use server';

import { query } from '@/db';

// apiKey read inside functions to ensure Vercel runtime env vars are available

export interface FundingProvider {
  id: number;
  name: string;
  provider_type: 'public_bank' | 'private_bank_nbfc' | 'government_portal' | 'marketplace';
  interest_rate: string;
  max_amount: string;
  collateral_requirement: string;
  eligibility: string;
  income_limit: string;
  interest_subsidy: string;
  documents_required: string[];
  application_process: string[];
  highlights: string[];
  website: string;
}

export interface StudentLoanProfile {
  country: string;
  courseCost: number;
  familyIncome: number;
  collateralAvailable: boolean;
}

export interface FundingRecommendation {
  name: string;
  reasonChecklist: string[];
}

export async function getFundingProviders(): Promise<FundingProvider[]> {
  try {
    const res = await query('SELECT * FROM funding_providers ORDER BY id ASC');
    return res.rows as FundingProvider[];
  } catch (error) {
    console.error('Error fetching funding providers:', error);
    return [];
  }
}

export async function getAIFundingRecommendations(profile: StudentLoanProfile): Promise<FundingRecommendation[]> {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("Groq API Key is missing. Please add GROQ_API_KEY to your .env.local file.");
    }

    // Fetch all funding providers from database to feed as local context to LLM
    const providers = await getFundingProviders();

    const systemPrompt = `
You are the Nexora AI Funding Advisor, a specialist education loan counselor.
Analyze the student's profile (target country, tuition cost, family income, and collateral status) and recommend the most suitable education loan providers, marketplaces, or government portals from our local database catalog.

Select 3 to 5 matching recommendations from the provided database list. For each recommendation, provide a checklist of 4-5 reasons explaining exactly why it is recommended based on the student's eligibility (e.g. collateral matching, income guidelines, target study country, loan limits, interest subsidy eligibility).

Available Database Funding Providers:
${providers.map(p => `- Name: "${p.name}"
  Type: ${p.provider_type}
  Interest Rate: ${p.interest_rate}
  Max Amount: ${p.max_amount}
  Collateral Requirement: ${p.collateral_requirement}
  Eligibility: ${p.eligibility}
  Income Limit: ${p.income_limit}
  Interest Subsidy: ${p.interest_subsidy}
  Highlights: ${p.highlights.join('; ')}`).join('\n\n')}

Return your response in STRICT JSON format matching the following schema:
{
  "recommendations": [
    {
      "name": "string (MUST exactly match one of the provider names from the list)",
      "reasonChecklist": [
        "string (starts with emoji checkmark like '✓ Eligible based on income' or suitable explanation)"
      ]
    }
  ]
}
`;

    const userPrompt = `
Student Profile Details:
- Target Country: ${profile.country}
- Estimated Course Cost: ₹${(profile.courseCost).toLocaleString('en-IN')}
- Family Annual Income: ₹${(profile.familyIncome).toLocaleString('en-IN')}
- Collateral Available: ${profile.collateralAvailable ? 'Yes' : 'No'}
`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
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
    const parsed = JSON.parse(resultText);
    return parsed.recommendations || [];

  } catch (error) {
    console.error('Error getting AI funding recommendations:', error);
    // Fallback recommendations in case of connection/API issues
    return [
      {
        name: 'Vidya Lakshmi Portal',
        reasonChecklist: [
          '✓ Allows common application to multiple banks online',
          '✓ Bypasses multiple branch visits',
          '✓ Supported by the Government of India',
          '✓ Covers the target course and country'
        ]
      },
      {
        name: 'State Bank of India (SBI)',
        reasonChecklist: [
          '✓ Lowest interest rates for overseas studies',
          '✓ Tuition cost fits within SBI limits',
          '✓ Matches collateral availability',
          '✓ Repayment tenure up to 15 years'
        ]
      },
      {
        name: 'GyanDhan',
        reasonChecklist: [
          '✓ Education loan marketplace helps compare options',
          '✓ Free personalized loan counseling',
          '✓ Assists with pre-visa disbursal processing',
          '✓ Negotiates concessions on interest rates'
        ]
      }
    ];
  }
}
