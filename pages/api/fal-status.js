// /pages/api/fal-status.js
export default async function handler(req, res) {
  try {
    const mod = await import("@fal-ai/serverless-client");
    const fal = mod.fal || mod.default || mod;

    const { id } = req.query || {};
    if (!id) return res.status(400).json({ error: "missing id" });

    fal.config({ credentials: process.env.FAL_API_KEY });
    const model = process.env.FAL_MODEL || "fal-ai/hunyuan-video";

    const job = await fal.jobs.get(model, id);
    const status = job?.status || job?.state || "PENDING";
    const output = job?.response?.output || job?.output;
    const videoUrl = output?.video?.url || output?.[0]?.url || output?.url || null;

    if (status === "COMPLETED" && videoUrl) return res.json({ done: true, url: videoUrl });
    if (status === "FAILED") return res.status(500).json({ done: true, error: job?.error || "Fal job failed" });
    return res.json({ done: false, status });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "status failed" });
  }
}
