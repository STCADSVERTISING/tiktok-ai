# Video Content Generator

This project is a minimal **Next.js** web application that demonstrates how to automate the creation of product‑review videos with AI.  The site accepts a natural‑language prompt (for example, “รีวิวกระเป๋าหนังแนวแฟชั่นสำหรับวัยทำงาน”) and produces a short script, a voiceover and a 9:16 video suitable for platforms like TikTok.

> **Note**
>
> This repository only contains the client and server code.  It **does not include any API keys** or secret data.  You will need to supply your own API credentials for OpenAI, Pika and ElevenLabs via a `.env` file.  Without valid keys the `/api/generate` endpoint will return an error.

## Features

- A simple dashboard for entering a prompt.
- Serverless API route (`/api/generate`) that:
1. Generates a Thai review script using OpenAI.
2. Uses the Fal AI API to create a vertical video from the script (via the Hunyuan Video model by default).  See the `FAL_MODEL` environment variable to customise the model.
3. Calls ElevenLabs to synthesise a voiceover.
- Displays the generated script, the video preview and the audio preview on the page.

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create your `.env` file**

   Copy `.env.example` to `.env` and fill in your API keys:

   ```bash
   cp .env.example .env
   # then edit .env and set
   # OPENAI_API_KEY=...
   # FAL_API_KEY=...
   # FAL_MODEL=fal-ai/hunyuan-video   # (optional) change to another supported model
   # ELEVENLABS_API_KEY=...
   # ELEVENLABS_VOICE_ID=...
   ```

3. **Run the development server**

   ```bash
   npm run dev
   ```

   Open `http://localhost:3000` in your browser.  You should see a textarea where you can enter a prompt.  After submitting, the script and media will appear once the API calls finish.

## Deployment

You can deploy this application to any platform that supports Node.js and Next.js (for example Vercel, Netlify or a VPS).  Ensure the following environment variables are set in your hosting provider’s dashboard:

```
OPENAI_API_KEY=<your key>
FAL_API_KEY=<your key>
FAL_MODEL=<model id>
ELEVENLABS_API_KEY=<your key>
ELEVENLABS_VOICE_ID=<voice id>
```

On Vercel you can import the repository from GitHub and add these variables under *Project Settings → Environment Variables*.  Then deploy the app and share the public URL.

## Caveats

- The Pika and ElevenLabs APIs may return errors or rate‑limit requests; handle these cases in production.
- The returned video does **not** include the voiceover.  This example fetches the audio separately.  You can overlay the audio onto the video using an external tool (for example FFmpeg) or by using a more advanced video API that supports audio.
- The server code uses Node’s built‑in `fetch`.  If you deploy to an older Node version that does not implement `fetch`, install `node-fetch` or `undici`.

Feel free to customise the styling and flow to suit your own project.