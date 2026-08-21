'use server';

import { query } from '@/db';
import { getCurrentUser } from './auth';

export async function askAIAdvisor(messages: { role: 'user' | 'assistant'; content: string }[]) {
  try {
    let context = 'No student profile context available.';
    let studentId: number | null = null;

    try {
      const user = await getCurrentUser();
      if (user && user.profileId) {
        studentId = user.profileId;
        const studentRes = await query('SELECT * FROM student_profiles WHERE id = $1', [user.profileId]);
        if (studentRes.rows.length > 0) {
          const student = studentRes.rows[0];
          
          if (student.onboarding_completed) {
            const univRes = await query(`
              SELECT u.name, c.name as country, u.ranking, u.tuition_fee_min
              FROM universities u
              JOIN countries c ON u.country_id = c.id
              ORDER BY u.ranking LIMIT 5
            `);
            const universities = univRes.rows.map(r => `- ${r.name} (${r.country}) - Rank: #${r.ranking}, Tuition from $${Number(r.tuition_fee_min).toLocaleString()}/yr`).join('\n');

            const schRes = await query('SELECT name, provider, amount FROM scholarships LIMIT 5');
            const scholarships = schRes.rows.map(r => `- ${r.name} by ${r.provider} (${r.amount})`).join('\n');

            context = `
Student Profile:
- Target Degree: ${student.degree}
- Field/Department: ${student.department}
- CGPA: ${student.cgpa}
- Budget: $${Number(student.budget).toLocaleString()}/year
- Skills: ${student.skills?.join(', ') || 'None listed'}
- Interests: ${student.interests?.join(', ') || 'None listed'}
- Preferred Countries: ${student.preferred_countries?.join(', ') || 'None listed'}
- Career Goals: ${student.career_goals?.join(', ') || 'None listed'}

Database Matching Universities (Top Rank):
${universities}

Database Matching Scholarships (Top):
${scholarships}
            `;
          } else {
            context = 'Student has not completed onboarding yet.';
          }
        }
      }
    } catch (dbErr) {
      console.error('DB context fetch failed (non-fatal):', dbErr);
      // Continue without DB context — Groq still works
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return { response: "Groq API Key is missing. Please add GROQ_API_KEY to your .env.local file." };
    }

    const systemPrompt = `
You are the Nexora AI Career & Higher Studies Advisor, a helpful and knowledgeable counselor.
Your goal is to guide students in planning their international education pathway.
Use the student profile and database context below to provide personalized advice on universities, courses, visa requirements, travel budgets, and study roadmaps.

Student Context:
${context}

Guidelines:
- Present responses in clean markdown format.
- Be direct, professional, and encouraging.
- Highlight specific matching universities or scholarships from the provided database context if applicable.
- Keep responses structured, using bullet points or subheadings where needed.
- If the student profile is missing, encourage them to complete it in the dashboard.
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
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq API returned error:', errText);
      return { response: `AI Error (${response.status}): ${errText.substring(0, 200)}` };
    }

    const data = await response.json();
    const assistantMessage = data?.choices?.[0]?.message?.content || "Sorry, I couldn't compute a response right now. Please try again.";

    // Log chat to DB if user is logged in (non-fatal)
    if (studentId) {
      try {
        const lastUserMsg = messages[messages.length - 1]?.content || '';
        await query(
          'INSERT INTO ai_chat_logs (student_id, query_text, response_text) VALUES ($1, $2, $3)',
          [studentId, lastUserMsg, assistantMessage]
        );
      } catch (logErr) {
        console.error('Chat log insert failed (non-fatal):', logErr);
      }
    }

    return { response: assistantMessage };
  } catch (error) {
    console.error('Error calling Groq API:', error);
    return { response: "An error occurred while reaching the AI Advisor service. Please try again." };
  }
}
