import { NextResponse } from 'next/server';

const AUDIO_BASE_URL = process.env.AUDIO_BASE_URL || '';

export async function POST(req: Request) {
 

  try {
    const body = await req.json();
    const target = "https://e54c610b5725.ngrok-free.app" + '/tts';

    const upstream = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'audio/*, application/json' },
      body: JSON.stringify(body),
    });

    // If upstream returned non-OK, try to read JSON and forward
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      return NextResponse.json({ error: 'Upstream error', status: upstream.status, body: text.substring(0, 400) }, { status: 502 });
    }

    const ct = upstream.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const data = await upstream.json();
      return NextResponse.json(data);
    }

    // Stream binary audio back to client
    const arrayBuffer = await upstream.arrayBuffer();
    return new NextResponse(arrayBuffer, { status: 200, headers: { 'Content-Type': ct || 'audio/wav' } });
  } catch (err: any) {
    return NextResponse.json({ error: 'Proxy failed', message: String(err?.message || err) }, { status: 502 });
  }
}
