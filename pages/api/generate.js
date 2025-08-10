export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { briefTH, visualEN, negativeEN, duration, resolution, model } = req.body || {};
    if (!briefTH) return res.status(400).json({ error: "missing briefTH" });

    const { OPENAI_API_KEY, FAL_API_KEY } = process.env;
    if (!OPENAI_API_KEY || !FAL_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY or FAL_API_KEY" });
    }

    // 1) ทำสคริปต์ไทย + แคปชั่น
    const sys = "คุณเป็นครีเอทีฟ TikTok: เขียนสคริปต์ไทย 90-120 คำสำหรับคลิป 15-25 วิ และต่อท้ายด้วย 'แคปชั่น:' + แคปชั่น 1 บรรทัด + 5 แฮชแท็ก";
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: sys }, { role: "user", content: briefTH }],
        temperature: 0.8
      })
    });
    const j = await r.json();
    if (!r.ok) return res.status(500).json({ error: `OpenAI: ${j?.error?.message || r.statusText}` });

    const content = j?.choices?.[0]?.message?.content || "";
    const parts = content.split(/แคปชั่น[:：]|Caption[:：]/i);
    const script = (parts[0] || content).trim();
    const caption = (parts[1] || "").trim();

    // 2) เตรียม prompt สำหรับวิดีโอ (ภาษาอังกฤษ + คำสั่งไทยประกอบ)
    const visual = (visualEN || "clean product shot, 9:16 vertical, natural look").trim();
    const negative = (negativeEN || "").trim();
    const promptForVideo =
      `VISUAL (EN): ${visual}\n` +
      (negative ? `NEGATIVE (EN): ${negative}\n` : "") +
      `Thai brief: ${briefTH}\nScript (TH): ${script}`;

    // 3) เรียก Fal Queue REST API (ไม่ต้องใช้ไลบรารี)
    const modelId = model || process.env.FAL_MODEL || "fal-ai/hunyuan-video"; // e.g. fal-ai/hunyuan-video
    const frames = Number(duration) >= 13 ? 129 : 85; // map sec → frames (รุ่นนี้รับ 85/129 เฟรม) :contentReference[oaicite:2]{index=2}
    const resSubmit = await fetch(`https://queue.fal.run/${encodeURIComponent(modelId)}`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: promptForVideo,
        aspect_ratio: "9:16",
        resolution: (resolution === "1080x1920" ? "720p" : "720p"), // รุ่นนี้รองรับ 480p/580p/720p
        num_frames: frames
      })
    });
    const submitJson = await resSubmit.json();
    if (!resSubmit.ok) return res.status(500).json({ error: `Fal submit: ${submitJson?.detail || resSubmit.statusText}` });

    return res.json({ ok: true, jobId: submitJson.request_id, script, caption });
  } catch (e) {
    console.error("GEN ERR:", e);
    return res.status(500).json({ error: e?.message || "generate failed" });
  }
}
