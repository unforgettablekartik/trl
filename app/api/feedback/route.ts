// app/api/feedback/route.ts
import { NextRequest } from 'next/server';

const KV_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const KV_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

async function kvLPush(key: string, value: any) {
  if (!KV_URL || !KV_TOKEN) return;
  const payload = typeof value === 'string' ? value : JSON.stringify(value);
  await fetch(`${KV_URL}/lpush/${encodeURIComponent(key)}/${encodeURIComponent(payload)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: 'no-store',
  });
  // keep 60 days: set TTL if new
  await fetch(`${KV_URL}/expire/${encodeURIComponent(key)}/5184000`, { // 60*24*60*60
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
}

function nowIST() {
  const now = new Date();
  const ist = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(now);
  const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year:'numeric', month:'2-digit', day:'2-digit' }).format(now);
  // yyyy-mm-dd
  return { istString: ist, istDateKey: d, isoUTC: now.toISOString() };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { kind, book, language, query } = body || {};
    if (!kind || !book?.title) return new Response('Missing fields', { status: 400 });

    const country = req.headers.get('x-vercel-ip-country') || '';
    const city = req.headers.get('x-vercel-ip-city') || '';
    const region = req.headers.get('x-vercel-ip-country-region') || '';
    const ua = req.headers.get('user-agent') || '';

    const { istString, istDateKey, isoUTC } = nowIST();
    const record = {
      kind, isoUTC, istString, tz: 'Asia/Kolkata',
      query: query || '',
      language: language || 'en',
      book: { title: book.title, authors: book.authors || [] },
      location: { country, region, city },
      ua,
    };

    const listKey = `trl:fb:${istDateKey}`; // per-day list in IST
    await kvLPush(listKey, record);

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(e?.message || 'error', { status: 500 });
  }
}
