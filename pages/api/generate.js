// /pages/api/generate.js
async function readJsonSafe(res) {
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  if (ct.includes("application/json")) {
    try { return { json: JSON.parse(text), text, ct, ok: true }; }
    catch (e) { return { json: null, text, ct, ok: false, parseErr: e.message }; }
  }
  return { json: null, text, ct, ok: false };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { briefTH, visualEN, negativeEN, duration, resolution, model } = req.body || {};
    if (!briefTH) return res.status(400).json({ error: "missing briefTH" });

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const FAL_KEY = process.env.FAL_KEY || process.env.FAL_API_KEY; // รองรับทั้งสองชื่อ
    const MODEL_ID = model || process.env.FAL_MODEL;                 // ต้องมี!

    if (!OPENAI_API_KEY) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    if (!FAL_KEY)        return res.status(500).json({ error: "Missing FAL_KEY" });
    if (!MODEL_ID)       return res.status(500).json({ error: "Missing FAL_MODEL (set it to the exact model path from Fal)" });

    // ---------- 1) OpenAI: ทำสคริปต์ + แคปชั่น ----------
    const sys = "คุณเป็นครีเอทีฟ TikTok: เขียนสคริปต์ไทย 90-120 คำสำหรับคลิป 15-25 วิ และต่อท้ายด้วย 'แคปชั่น:' + แคปชั่น 1 บรรทัด + 5 แฮชแท็ก";
    const oaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: sys }, { role: "user", content: briefTH }],
        temperature: 0.8
      })
    });
    const oai = await readJsonSafe(oaiRes);
    if (!oaiRes.ok) {
      console.error("[GEN] OpenAI HTTP", oaiRes.status, oai.ct, oai.text?.slice(0,200));
      return res.status(500).json({ error: `OpenAI ${oaiRes.status}: ${oai.json?.error?.message || oai.text}` });
    }

    const content = oai.json?.choices?.[0]?.message?.content || "";
    const parts = content.split(/แคปชั่น[:：]|Caption[:：]/i);
    const script = (parts[0] || content).trim();
    const caption = (parts[1] || "").trim();

    // ---------- 2) Fal Queue: ส่งงานแบบแนะนำ (ห่อใน input) ----------
    const visual = (visualEN || "clean product shot, 9:16 vertical, natural look").trim();
    const negative = (negativeEN || "").trim();
    const promptForVideo =
      `VISUAL (EN): ${visual}\n` +
      (negative ? `NEGATIVE (EN): ${negative}\n` : "") +
      `Thai brief: ${briefTH}\nScript (TH): ${script}`;

    const resSubmit = await fetch(`https://queue.fal.run/${encodeURIComponent(MODEL_ID)}`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        input: {
          prompt: promptForVideo
          // หมายเหตุ: โมเดลแต่ละตัวรองรับพารามิเตอร์ไม่เหมือนกัน
          // ถ้าต้องการ ใส่เพิ่มที่นี่ เช่น aspect_ratio/duration/resolution ฯลฯ ตามหน้าโมเดล
        }
      })
    });
    const sub = await readJsonSafe(resSubmit);
    if (!resSubmit.ok) {
      console.error("[GEN] Fal submit HTTP", resSubmit.status, sub.ct, sub.text?.slice(0,200));
      return res.status(500).json({ error: `Fal submit ${resSubmit.status}: ${sub.json?.detail || sub.text}` });
    }
    if (!sub.json?.request_id) {
      console.error("[GEN] Fal submit body unexpected:", sub);
      return res.status(500).json({ error: "Fal submit: missing request_id", raw: sub.text?.slice(0,200) });
    }

    return res.json({ ok: true, jobId: sub.json.request_id, script, caption });
  } catch (e) {
    console.error("[GEN ERR]", e);
    return res.status(500).json({ error: e?.message || "generate failed" });
  }
}
