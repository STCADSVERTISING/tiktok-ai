/**
 * API route for generating video content.  It expects a JSON body
 * containing a `prompt` string and returns a JSON object with
 * the generated script, video URL and audio URL.
 *
 * Environment variables required:
 * - OPENAI_API_KEY: Key for OpenAI chat completions
 * - PIKA_API_KEY:  Key for Pika video generation
 * - ELEVENLABS_API_KEY: Key for ElevenLabs voice synthesis
 * - ELEVENLABS_VOICE_ID: Voice ID for ElevenLabs
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Prompt is required' });
    return;
  }

  // Check for necessary API keys
  const openaiKey = process.env.OPENAI_API_KEY;
  const falKey = process.env.FAL_API_KEY;
  const elevenKey = process.env.ELEVENLABS_API_KEY;
  const elevenVoice = process.env.ELEVENLABS_VOICE_ID;
  // Choose a model for Fal AI. Use environment variable FAL_MODEL or fall back to
  // the open-source Hunyuan Video model.  See https://fal.ai/models for other options.
  const falModel = process.env.FAL_MODEL || 'fal-ai/hunyuan-video';
  if (!openaiKey || !falKey || !elevenKey || !elevenVoice) {
    res.status(500).json({ error: 'Server not configured: missing API keys' });
    return;
  }

  try {
    // 1. Generate the review script using OpenAI
    const scriptPrompt = `คุณเป็นครีเอเตอร์ TikTok ที่เชี่ยวชาญการรีวิวสินค้า\nคำสั่ง: ${prompt}\n\nเขียนสคริปต์รีวิวแบบย่อ ๆ (ประมาณ 4–6 ประโยค) เป็นภาษาไทย มีสไตล์สดใสเป็นกันเอง พร้อมชวนให้คลิกดูสินค้าที่ปุ่มตะกร้า\nตอบกลับเฉพาะสคริปต์ที่เขียนได้เลย`;
    const chatBody = {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'คุณคือผู้ช่วยสร้างสคริปต์รีวิวสินค้าในภาษาไทย' },
        { role: 'user', content: scriptPrompt },
      ],
      temperature: 0.7,
    };

    const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify(chatBody),
    });
    if (!chatRes.ok) {
      const err = await chatRes.json();
      console.error('OpenAI error', err);
      throw new Error(err.error?.message || 'OpenAI API error');
    }
    const chatData = await chatRes.json();
    const script = chatData.choices?.[0]?.message?.content?.trim() || '';

    // 2. Generate video via Fal API
    // Import the official client dynamically. Using dynamic import ensures the module
    // is only loaded when this route executes, which avoids bundling issues.
    const { fal } = await import('@fal-ai/client');
    // Configure the client with your API key. This must be done once per process.
    fal.config({
      credentials: falKey,
    });
    // Submit the video generation request. We set the aspect ratio to 9:16
    // to produce a vertical video suitable for social media. You can add
    // additional fields (such as resolution or num_frames) inside the input
    // object based on the model's capabilities. See the fal.ai docs for details.
    const falResult = await fal.subscribe(falModel, {
      input: {
        prompt: script,
        aspect_ratio: '9:16',
      },
    });
    // The returned result contains a nested data property with the video URL.
    const videoUrl = falResult?.data?.video?.url || '';

    // 3. Generate voiceover via ElevenLabs
    const voiceBody = {
      text: script,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.75,
      },
    };
    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${elevenVoice}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': elevenKey,
        },
        body: JSON.stringify(voiceBody),
      },
    );
    if (!elevenRes.ok) {
      const errText = await elevenRes.text();
      console.error('ElevenLabs error', errText);
      throw new Error('ElevenLabs API error');
    }
    const audioBuffer = await elevenRes.arrayBuffer();
    // Convert audio to base64 data URI.  This avoids storing files on the server.
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

    res.status(200).json({ script, videoUrl, audioUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
}