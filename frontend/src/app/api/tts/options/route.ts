import { NextResponse } from 'next/server';

// Proxy endpoint to fetch TTS options from configured backend.
// Set AUDIO_BASE_URL in the Next/Deployment environment to the public backend URL (no trailing slash).

const AUDIO_BASE_URL = process.env.AUDIO_BASE_URL || '';

export async function GET() {
 

  const target = "https://e54c610b5725.ngrok-free.app" + '/tts/options';

  try {
    const resp = await fetch(target, { headers: { Accept: 'application/json' } });

    const ct = resp.headers.get('content-type') || '';
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      return NextResponse.json({ error: 'Upstream returned error', status: resp.status, body: body.substring(0, 200) }, { status: 502 });
    }

    if (!ct.includes('application/json')) {
      const body = await resp.text().catch(() => '');
      return NextResponse.json({ error: 'Upstream returned non-JSON response', contentType: ct, body: body.substring(0, 400) }, { status: 502 });
    }

    const data = await resp.json();
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch upstream', message: String(err?.message || err) }, { status: 502 });
  }
}
