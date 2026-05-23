// api/generate.js
export default async function handler(req, res) {
  const { name, dob, time, place, answers } = req.body;

  try {
    // 1. CALL BODYGRAPH API
    const bodygraphResponse = await fetch('https://api.bodygraph.com/v1/calculate', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BODYGRAPH_API_KEY}`
      },
      body: JSON.stringify({
        date: dob,
        time: time,
        location: place
      })
    });
    
    const hdData = await bodygraphResponse.json();

    // 2. CONSTRUCT THE PROMPT
    const prompt = `
      You are Karina Jolly, generating a Nervous System Fingerprint for ${name}.
      
      BODYGRAPH DATA:
      - Human Design Type: ${hdData.type}
      - Profile: ${hdData.profile}
      - Authority: ${hdData.inner_authority}
      - Defined Centers: ${hdData.defined_centers?.join(', ')}

      USER'S CURRENT STATE (from survey):
      ${JSON.stringify(answers)}

      Write 9 chapters in your signature warm, direct voice. 
      Use markers [CHAPTER_X_TITLE] and [CHAPTER_X_CONTENT].
    `;

    // 3. CALL CLAUDE
    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const finalData = await aiResponse.json();
    res.status(200).json(finalData);

  } catch (error) {
    res.status(500).json({ error: "Connection to Bodygraph failed." });
  }
}
