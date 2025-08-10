// /pages/api/generate.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    // ✅ โหลดแพ็กเกจแบบ dynamic และครอบทุกกรณีของ export
    const mod = await import("@fal-ai/serverless-client");
    const fal = mod.fal || mod.default || mod;

    const { briefTH, visualEN, negativeEN, duration, resolution, model } = req.body || {};
    if (!briefTH) return res.status(400).json({ error: "missing briefTH" });

    const { OPENAI_API_KEY, FAL_API_KEY } = process.env;
    if (!OPENAI_API_KEY || !FAL_API_KEY) {
      return res.status(500).json({ error: "Server not configured: missing API keys" });
    }

    // --- OpenAI: ทำสคริปต์ไทย + แคปชั่น ---
    const sys = "คุณเป็นครีเอทีฟ TikTok: เขียนสคริปต์ภาษาไทย 90-120 คำสำหรับคลิป 15-25 วินาที และต่อท้ายด้วยบรรทัด 'แคปชั่น:' พร้อมแคปชั่น 1 บรรทัด + 5 แฮชแท็ก";
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: briefTH }
        ],
        temperature: 0.8
      })
    });
    const j = await r.json();
    if (!r.ok) return res.status(500).json({ error: `OpenAI: ${j.error?.message || "failed"}` });

    const content = j?.choices?.[0]?.message?.content || "";
    const parts = content.split(/แคปชั่น[:：]|Caption[:：]/i);
    const script = (parts[0] || content).trim();
    const caption = (parts[1] || "").trim();

    // --- Fal: ส่งงานแบบ async ---
    fal.config({ credentials: FAL_API_KEY });
    const modelId = model || process.env.FAL_MODEL || "fal-ai/hunyuan-video";

    const visual = (visualEN || "").trim();
    const negative = (negativeEN || "").trim();
    const promptForVideo =
      `VISUAL (EN): ${visual || "clean product shot, 9:16 vertical, natural look"}\n` +
      (negative ? `NEGATIVE (EN): ${negative}\n` : "") +
      `Thai brief: ${briefTH}\nScript (TH): ${script}`;

    const job = await fal.jobs.submit(modelId, {
      input: {
        prompt: promptForVideo,
        ratio: "9:16",
        duration: Number(duration) || 12,
        resolution: resolution || "720x1280"
      }
    });

    return res.json({ ok: true, jobId: job.request_id, script, caption });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "generate failed" });
  }
}
