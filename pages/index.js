// /pages/index.js
import { useEffect, useMemo, useRef, useState } from "react";

const MODEL_OPTIONS = [
  { value: "fal-ai/hunyuan-video", label: "Hunyuan Video (เร็ว/ประหยัด)" },
  { value: "fal-ai/veo3", label: "Google Veo 3 (คุณภาพสูง/ช้ากว่า/แพงกว่า)" },
];

const RES_OPTIONS = [
  { value: "720x1280", label: "720x1280 (เร็ว)" },
  { value: "1080x1920", label: "1080x1920" },
];

export default function Home() {
  // ฟอร์ม
  const [briefTH, setBriefTH] = useState(
    "รีวิวรองเท้าแตะโฟมโทนพาสเทล ไปทะเล ฟีลสดใส 15–20 วิ"
  );
  const [visualEN, setVisualEN] = useState(
    "product-only close-up of pastel foam beach sandals on clean sand, bright natural sunlight, gentle left-to-right pan, shallow depth of field, 9:16, center composition, no people"
  );
  const [negativeEN, setNegativeEN] = useState(
    "no logo, no watermark, no text, no hands, no glitch, no cartoon"
  );
  const [duration, setDuration] = useState(12);
  const [resolution, setResolution] = useState(RES_OPTIONS[0].value);
  const [model, setModel] = useState(MODEL_OPTIONS[0].value);

  // สถานะงาน
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [script, setScript] = useState("");
  const [caption, setCaption] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const pollRef = useRef(null);

  const disabled = useMemo(
    () => loading || !briefTH.trim(),
    [loading, briefTH]
  );

  // ฟังก์ชันช่วย: อ่าน JSON อย่างปลอดภัย (กรณี API ตอบ html/text)
  async function safeJson(res) {
    try {
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) return await res.json();
      const text = await res.text();
      return { ok: false, error: text || `Non-JSON response (HTTP ${res.status})` };
    } catch (e) {
      return { ok: false, error: e?.message || `Non-JSON response (HTTP ${res.status})` };
    }
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setStatusMsg("กำลังเริ่มงาน...");
    setVideoUrl("");
    setScript("");
    setCaption("");

    // เรียกเริ่มงาน
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        briefTH,
        visualEN,
        negativeEN,
        duration,
        resolution,
        model,
      }),
    });

    const data = await safeJson(res);
    if (!res.ok || !data?.ok) {
      setLoading(false);
      setStatusMsg("");
      setErrorMsg(data?.error || `HTTP ${res.status}`);
      alert(data?.error || `HTTP ${res.status}`);
      return;
    }

    setScript(data.script || "");
    setCaption(data.caption || "");
    setStatusMsg("ส่งงานสำเร็จ กำลังเรนเดอร์วิดีโอ...");

    // โพลสถานะทุก 5 วิ
    const jobId = data.jobId;
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/fal-status?id=${encodeURIComponent(jobId)}`);
        const s = await safeJson(r);
        if (!r.ok) {
          throw new Error(s?.error || `HTTP ${r.status}`);
        }
        if (s.done) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setLoading(false);
          if (s.url) {
            setVideoUrl(s.url);
            setStatusMsg("เสร็จแล้ว ✅");
          } else {
            setStatusMsg("");
            setErrorMsg(s.error || "งานเสร็จแต่ไม่พบ URL วิดีโอ");
          }
        } else {
          setStatusMsg(`สถานะ: ${s.status || "PENDING"} (กำลังเรนเดอร์...)`);
        }
      } catch (err) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setLoading(false);
        setStatusMsg("");
        setErrorMsg(err?.message || "เช็กสถานะล้มเหลว");
      }
    }, 5000);
  }

  return (
    <div style={{ maxWidth: 900, margin: "32px auto", padding: 16 }}>
      <h1 style={{ marginBottom: 16 }}>AI Video Generator</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          <b>1) โจทย์ (ไทย)</b>
          <textarea
            rows={3}
            value={briefTH}
            onChange={(e) => setBriefTH(e.target.value)}
            style={{ width: "100%", padding: 10 }}
            placeholder="เช่น รีวิวรองเท้าแตะโฟมไปทะเล โทนพาสเทล 15–20 วิ"
          />
        </label>

        <label>
          <b>2) Visual (EN)</b> – คำอธิบายภาพ/กล้อง/แสง (ใส่เป็นอังกฤษ โมเดลเข้าใจภาพแม่นกว่า)
          <textarea
            rows={3}
            value={visualEN}
            onChange={(e) => setVisualEN(e.target.value)}
            style={{ width: "100%", padding: 10 }}
            placeholder="close-up of product on clean sand, bright daylight, shallow depth, gentle left-to-right pan, 9:16, no people"
          />
        </label>

        <label>
          <b>3) Negative (EN)</b>
          <input
            value={negativeEN}
            onChange={(e) => setNegativeEN(e.target.value)}
            style={{ width: "100%", padding: 10 }}
            placeholder="no logo, no watermark, no text, no hands"
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <label>
            <b>4) ระยะเวลา (วิ)</b>
            <input
              type="number"
              min="6"
              max="30"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              style={{ width: "100%", padding: 10 }}
            />
          </label>

          <label>
            <b>5) ความละเอียด</b>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              style={{ width: "100%", padding: 10 }}
            >
              {RES_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <b>6) โมเดล</b>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{ width: "100%", padding: 10 }}
            >
              {MODEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button type="submit" disabled={disabled} style={{ padding: "10px 16px" }}>
          {loading ? "กำลังสร้าง..." : "สร้างวิดีโอ"}
        </button>
      </form>

      {/* สถานะ / ข้อผิดพลาด */}
      <div style={{ marginTop: 16 }}>
        {statusMsg && <p><b>สถานะ:</b> {statusMsg}</p>}
        {errorMsg && (
          <p style={{ color: "crimson" }}>
            <b>ผิดพลาด:</b> {errorMsg}
          </p>
        )}
      </div>

      {/* ผลลัพธ์ */}
      {(script || caption || videoUrl) && (
        <div style={{ marginTop: 24 }}>
          {script && (
            <>
              <h3>สคริปต์</h3>
              <pre style={{ whiteSpace: "pre-wrap", background: "#f7f7f7", padding: 12 }}>
                {script}
              </pre>
            </>
          )}
          {caption && (
            <>
              <h3>แคปชั่น</h3>
              <pre style={{ whiteSpace: "pre-wrap", background: "#f7f7f7", padding: 12 }}>
                {caption}
              </pre>
            </>
          )}
          {videoUrl && (
            <>
              <h3>วิดีโอ</h3>
              <video src={videoUrl} controls style={{ width: "100%", borderRadius: 8 }} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
