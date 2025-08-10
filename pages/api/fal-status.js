// /pages/api/fal-status.js
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
  try {
    const { id } = req.query || {};
    if (!id) return res.status(400).json({ error: "missing id" });

    const model = process.env.FAL_MODEL || "fal-ai/hunyuan-video";
    const key = process.env.FAL_API_KEY;
    if (!key) return res.status(500).json({ error: "Missing FAL_API_KEY" });

    // 1) สถานะ
    const stRes = await fetch(`https://queue.fal.run/${encodeURIComponent(model)}/requests/${id}/status`, {
      headers: { "Authorization": `Key ${key}`, "Accept": "application/json" }
    });
    const st = await readJsonSafe(stRes);
    if (!stRes.ok) {
      console.error("[STATUS] HTTP", stRes.status, st.ct, st.text?.slice(0,200));
      return res.status(500).json({ error: `Fal status ${stRes.status}: ${st.text}` });
    }

    if (st.json?.status === "COMPLETED") {
      // 2) ผลลัพธ์จริง
      const rrRes = await fetch(`https://queue.fal.run/${encodeURIComponent(model)}/requests/${id}`, {
        headers: { "Authorization": `Key ${key}`, "Accept": "application/json" }
      });
      const rr = await readJsonSafe(rrRes);
      if (!rrRes.ok) {
        console.error("[STATUS] result HTTP", rrRes.status, rr.ct, rr.text?.slice(0,200));
        return res.status(500).json({ error: `Fal result ${rrRes.status}: ${rr.text}` });
      }
      const resp = rr.json?.response || rr.json;
      const url =
        resp?.video?.url ||
        resp?.output?.video?.url ||
        resp?.data?.video?.url ||
        null;

      if (!url) {
        console.error("[STATUS] no video url", rr.json);
        return res.status(500).json({ done: true, error: "No video url in response" });
      }
      return res.json({ done: true, url });
    }

    if (st.json?.status === "FAILED") return res.status(500).json({ done: true, error: st.json?.error || "Fal job failed" });
    return res.json({ done: false, status: st.json?.status || "PENDING" });
  } catch (e) {
    console.error("[STATUS ERR]", e);
    return res.status(500).json({ error: e?.message || "status failed" });
  }
}
