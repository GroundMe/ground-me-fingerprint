export default async function handler(req, res) {
  // 1. Check if the request is valid
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, dob, time, place, answers } = req.body;

  // 2. Check for API Keys
  if (!process.env.ANTHROPIC_API_KEY || !process.env.BODYGRAPH_API_KEY) {
    console.error("MISSING KEYS: Ensure ANTHROPIC_API_KEY and BODYGRAPH_API_KEY are in Vercel Settings.");
    return res.status(500).json({ error: 'API keys are not configured in Vercel.' });
  }

  try {
    // 3. Talk to Bodygraph (Get Human Design Data)
    console.log("Calling Bodygraph for:", place);
    const bgRes = await fetch('https://api.bodygraphchart.com/v1/charts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.BODYGRAPH_API_KEY}` },
      body: JSON.stringify({ date: dob, time: time, location: place })
    });

    if (!bgRes.ok) {
      const bgErr = await bgRes.text();
      console.error("Bodygraph Error:", bgErr);
      throw new Error("Bodygraph calculation failed. Check your Bodygraph API key.");
    }

    const bgData = await bgRes.json();

    // 4. Talk to Claude (Generate the Blueprint)
    console.log("Calling Anthropic...");
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
          Tone: Deeply insightful, short sentences, no fluff.`
        }]
      })
    });

    if (!antRes.ok) {
      const antErr = await antRes.text();
      console.error("Anthropic Error:", antErr);
      throw new Error("Claude connection failed. Check your Anthropic API key and billing/credits.");
    }

    const finalData = await antRes.json();
    return res.status(200).json(finalData);

  } catch (error) {
    console.error("CRASH ERROR:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
