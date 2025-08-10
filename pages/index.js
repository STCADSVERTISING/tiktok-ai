import { useState } from 'react';

/**
 * The main page contains a form for entering a prompt and displays
 * the generated script, video and voiceover.  It calls the
 * `/api/generate` endpoint defined in `pages/api/generate.js`.
 */
export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Handle form submission by posting the prompt to the API route.
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'There was an error generating the content.');
      } else {
        const data = await res.json();
        setResult(data);
      }
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 20px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '24px' }}>AI Video Content Generator</h1>
        <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              'อธิบายคลิปรีวิวสินค้าและสไตล์ที่ต้องการ\n(เช่น "รีวิวรองเท้าแตะโฟมสำหรับเที่ยวทะเล")'
            }
            rows={4}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'inline-block',
              marginTop: '12px',
              padding: '10px 16px',
              background: '#3b82f6',
              color: '#fff',
              borderRadius: '4px',
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.6 : 1,
              border: 'none',
            }}
          >
            {loading ? 'กำลังสร้าง…' : 'สร้างวิดีโอ'}
          </button>
        </form>
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {result.script && (
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                  สคริปต์
                </h2>
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    background: '#f3f4f6',
                    padding: '12px',
                    borderRadius: '4px',
                    lineHeight: 1.5,
                  }}
                >
                  {result.script}
                </pre>
              </div>
            )}
            {result.videoUrl && (
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                  วิดีโอ
                </h2>
                <video
                  src={result.videoUrl}
                  controls
                  style={{ width: '100%', borderRadius: '4px' }}
                />
              </div>
            )}
            {result.audioUrl && (
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                  เสียงพากย์
                </h2>
                <audio src={result.audioUrl} controls style={{ width: '100%' }} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}