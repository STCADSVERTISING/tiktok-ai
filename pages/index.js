// /pages/index.js
import { useState } from "react";

const MODEL_OPTIONS = [
  { value: "fal-ai/hunyuan-video", label: "Hunyuan Video (เร็ว/ประหยัด)" },
  { value: "fal-ai/veo3", label: "Google Veo 3 (คุณภาพสูง/ช้ากว่า)" }
];

export default function Home() {
  const [briefTH, setBriefTH] = useState("");
  const [visualEN, setVisualEN] = useState("");
  const [negativeEN, setNegativeEN] = useState("no logo, no watermark, no text, no hands");
  const [duration, setDuration] = useState(12);
  const [resolution, setResolution] = useState("720x1280");
  const [model, setModel] = useState(MODEL_OPTIONS[0].value);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const startJob = async (e) => {
    e.preventDefault();
    if (!briefTH.trim()) return;

    setLoading(true);
    setResult(null);

    const r = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ briefTH, visualEN, negativeEN, duration, resolution, model })
    });
    const j = await r.json();
    if (!j.ok) {
      alert(j.error || "start job failed");
      setLoading(false);
      return;
    }
    setResult({ script: j.script, caption: j.caption, jobId: j.jobId, status: "กำลังเรนเดอร์..." });

    const iv = setInterval(async () => {
      try {
        const s = await fetch(`/api/fal-status?id=${j.jobId}`).then((x) => x.json());
        if (s.done) {
          clearInterval(iv);
          setResult((prev) => ({ ...prev, videoUrl: s.url, status: "เสร็จแล้ว" }));
          setLoading(false);
        } else {
          setResult((prev) => ({ ...prev, status: s.status || "PENDING" }));
        }
      } catch {
        // ignore one-off errors
      }
    }, 5000);
  };

  return (
    <div style={{ maxWidth: 860, margin: "32px auto", padding: 16 }}>
      <h1 style={{ marginBottom: 12 }}>AI Video Generator</h1>

      <form onSubmit={startJob} style={{ display: "grid", gap: 12 }}>
        <label>
          1) โจทย์ (ไทย)
          <textarea rows={3} value={briefTH} onChange={(e) => setBriefTH(e.target.value)} style={{ width: "100%", padding: 10 }} placeholder="เช่น รีวิวรองเท้าแตะโฟมไปทะเล โทนพาสเทล 15–20 วิ" />
        </label>

        <label>
          2) Visual (EN) – คำอธิบายภาพ/กล้อง/แสง (แนะนำให้กรอก)
          <textarea rows={3} value={visualEN} onChange={(e) => setVisualEN(e.target.value)} style={{ width: "100%", padding: 10 }}
            placeholder="product-only close-up of pastel foam beach sandals on sand, bright natural sunlight, gentle left-to-right pan, shallow depth of field, 9:16, no people" />
        </label>

        <label>
          3) Negative (EN)
          <input value={negativeEN} onChange={(e) => setNegativeEN(e.target.value)} style={{ width: "100%", padding: 10 }} />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <label>
            4) ระยะเวลา (วิ)
            <input type="number" min="6" max="30" value={duration} onChange={(e) => setDuration(Number(e.target.value))} style={{ width: "100%", padding: 10 }} />
          </label>
          <label>
            5) ความละเอียด
            <select value={resolution} onChange={(e) => setResolution(e.target.value)} style={{ width: "100%", padding: 10 }}>
              <option value="720x1280">720x1280 (เร็ว)</option>
              <option value="1080x1920">1080x1920</option>
            </select>
          </label>
          <label>
            6) โมเดล
            <select value={model} onChange={(e) => setModel(e.target.value)} style={{ width: "100%", padding: 10 }}>
              {MODEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        </div>

        <button type="submit" disabled={loading} style={{ padding: "10px 16px" }}>
          {loading ? "กำลังสร้าง..." : "สร้างวิดีโอ"}
        </button>
      </form>

      {result && (
        <div style={{ marginTop: 20 }}>
          <p><b>สถานะ:</b> {result.status}</p>
          {result.script && (<><h3>สคริปต์</h3><pre style={{ whiteSpace: "pre-wrap" }}>{result.script}</pre></>)}
          {result.caption && (<><h3>แคปชั่น</h3><pre style={{ whiteSpace: "pre-wrap" }}>{result.caption}</pre></>)}
          {result.videoUrl && (<><h3>วิดีโอ</h3><video src={result.videoUrl} controls style={{ width: "100%" }} /></>)}
        </div>
      )}
    </div>
  );
}
