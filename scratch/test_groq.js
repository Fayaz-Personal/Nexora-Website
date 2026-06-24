const fs = require('fs');

let apiKey = process.env.GROQ_API_KEY || '';
if (fs.existsSync('.env.local')) {
  const env = fs.readFileSync('.env.local', 'utf8');
  const match = env.match(/DATABASE_URL=(.+)/);
  // Wait, let's match GROQ_API_KEY instead
  const groqMatch = env.match(/GROQ_API_KEY=(.+)/);
  if (groqMatch) {
    apiKey = groqMatch[1].trim();
  }
}

async function test() {
  console.log('Testing Groq connection with API key:', apiKey);
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'user', content: 'Hello' }
      ]
    })
  });

  console.log('Status:', response.status);
  console.log('Status Text:', response.statusText);
  const text = await response.text();
  console.log('Response:', text);
}

test().catch(console.error);
