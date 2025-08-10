export default async function handler(req, res) {
  try {
    const { id } = req.query || {};
    if (!id) return res.status(400).json({ error: "missing id" });

    const model = process.env.FAL_MODEL || "fal-ai/hunyuan-video";
    const key = process.env.FAL_API_KEY;
    if (!key) return res.status(500).json({ error: "Missing FAL_API_KEY" });

    // 1) เช็กสถานะ
    const st = await fetch(`https://queue.fal.run/${encodeURIComponent(model)}/requests/${id}/status`, {
      headers: { "Authorization": `Key ${key}` }
    }).then(r => r.json());

    if (st?.status === "COMPLETED") {
      // 2) ดึงผลลัพธ์จริง
      const rr = await fetch(`https://queue.fal.run/${encodeURIComponent(model)}/requests/${id}`, {
        headers: { "Authorization": `Key ${key}` }
      }).then(r => r.json());

      const resp = rr?.response || rr;
      const url =
        resp?.video?.url || resp?.output?.video?.url || resp?.data?.video?.url || null; // ตาม schema ของ Hunyuan มี video.url :contentReference[oaicite:3]{index=3}

      if (!url) return res.status(500).json({ done: true, error: "No video url in response" });
      return res.json({ done: true, url });
    }

    if (st?.status === "FAILED") return res.status(500).json({ done: true, error: st?.error || "Fal job failed" });
    return res.json({ done: false, status: st?.status || "PENDING" });
  } catch (e) {
    console.error("STATUS ERR:", e);
    return res.status(500).json({ error: e?.message || "status failed" });
  }
}
