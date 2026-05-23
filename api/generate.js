export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { name, dob, time, place, answers } = req.body;

  if (!process.env.ANTHROPIC_API_KEY || !process.env.BODYGRAPH_API_KEY) {
    return res.status(500).json({ error: 'API keys are missing in Vercel Settings.' });
  }

  try {
    // 1. Get Human Design Data
    const bgRes = await fetch('https://api.bodygraphchart.com/v1/charts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.BODYGRAPH_API_KEY}` },
      body: JSON.stringify({ date: dob, time: time, location: place })
    });

    if (!bgRes.ok) {
      const bgErr = await bgRes.text();
      throw new Error("Bodygraph Error: " + bgErr);
    }
    const bgData = await bgRes.json();

    // 2. Talk to Claude
    const antRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 4000,
        messages: [{
          role: "user",
          content: `You are Karina (Velvet & Steel). Generate a 9-chapter 'Nervous System Fingerprint' for ${name}. 
          Human Design Data: ${JSON.stringify(bgData)}. 
          User Answers: ${JSON.stringify(answers)}.
          Use format: [CHAPTER_1_TITLE]...[/CHAPTER_1_TITLE] [CHAPTER_1_CONTENT]...[/CHAPTER_1_CONTENT] for all 9 chapters.
          Tone: Deeply insightful, short sentences, no clinical language.`
        }]
      })
    });

    const result = await antRes.json();

    if (!antRes.ok) {
      // THIS IS THE KEY: We are sending the actual Claude error back to the browser
      throw new Error("Claude says: " + (result.error ? result.error.message : JSON.stringify(result)));
    }

    return res.status(200).json(result);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
