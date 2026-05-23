export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { name, dob, time, place, answers } = req.body;

  try {
    // 1. Get Human Design Data
    const bgRes = await fetch('https://api.bodygraphchart.com/v1/charts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.BODYGRAPH_API_KEY}` },
      body: JSON.stringify({ date: dob, time: time, location: place })
    });
    const bgData = await bgRes.json();

    // 2. The Smart Call: Try Sonnet first, then fall back to 2.1
    const callClaude = async (modelName) => {
      return await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY.trim(),
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: modelName,
          max_tokens: 4000,
          messages: [{
            role: "user",
            content: `You are Karina (Velvet & Steel). Human Design: ${JSON.stringify(bgData)}. User Answers: ${JSON.stringify(answers)}. Generate the 9-chapter report.`
          }]
        })
      });
    };

    let antRes = await callClaude("claude-3-5-sonnet-20240620");
    
    // If Sonnet fails (Model Not Found/Tier issue), try the reliable Haiku
    if (!antRes.ok) {
       console.log("Sonnet locked. Trying Haiku...");
       antRes = await callClaude("claude-3-haiku-20240307");
    }

    // If Haiku also fails, use the "Old Faithful" Claude 2.1
    if (!antRes.ok) {
       console.log("Haiku locked. Falling back to Claude 2.1...");
       antRes = await callClaude("claude-2.1");
    }

    const result = await antRes.json();
    if (!antRes.ok) throw new Error("All Claude models failed.");

    return res.status(200).json(result);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
