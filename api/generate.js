export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { name, dob, time, place, answers } = req.body;

  try {
    const bgRes = await fetch('https://api.bodygraphchart.com/v1/charts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.BODYGRAPH_API_KEY}` },
      body: JSON.stringify({ date: dob, time: time, location: place })
    });

    const bgData = await bgRes.json();

    const antRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY.trim(), // Added .trim() to catch hidden spaces
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-latest", // Using the 'latest' alias
        max_tokens: 4000,
        messages: [{
          role: "user",
          content: `You are Karina (Velvet & Steel). Human Design: ${JSON.stringify(bgData)}. User: ${JSON.stringify(answers)}. Generate 9 chapters.`
        }]
      })
    });

    const result = await antRes.json();
    if (!antRes.ok) throw new Error(result.error ? result.error.message : "Claude Error");
    return res.status(200).json(result);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
