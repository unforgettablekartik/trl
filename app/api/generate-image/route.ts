import OpenAI from 'openai';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Upstash helpers
const KV_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const KV_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
async function kvGet(key: string): Promise<any | null> {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const r = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      cache: 'no-store',
    });
    const j = await r.json();
    return j?.result ? JSON.parse(j.result) : null;
  } catch { return null; }
}
async function kvSet(key: string, value: any, ttlSeconds = 2592000): Promise<void> {
  if (!KV_URL || !KV_TOKEN) return;
  try {
    await fetch(`${KV_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(value))}?EX=${ttlSeconds}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
    });
  } catch {}
}
function hashKey(obj: any) {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 24);
}

export async function POST(req: NextRequest) {
  try {
    const { title, authors } = await req.json();
    if (!title) return new Response('Missing title', { status: 400 });

    const cacheKey = `trl:img:${hashKey({ title, authors })}`;
    const cached = await kvGet(cacheKey);
    if (cached && cached.image) {
      return new Response(JSON.stringify({ image: cached.image }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const authorText = Array.isArray(authors) && authors.length ? (" by " + authors.join(", ")) : "";
    const prompt =
      'Create a vertical 1024x1536 animated/illustrative book-cover-style header inspired by the tone and motifs of "' +
      title + '"' + authorText + '. ' +
      'Use clean modern vector/illustration style, soft gradients, and symbolic imagery. ' +
      'Avoid copying the exact copyrighted cover art, logos, or layout.';

    const result = await client.images.generate({
      model: 'gpt-image-1',
      prompt,
      size: '1024x1536',
      n: 1,
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) return new Response('No image returned', { status: 500 });

    const payload = { image: `data:image/png;base64,${b64}` };

    // Cache image (30 days)
    await kvSet(cacheKey, payload);

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(e?.message || 'OpenAI image error', { status: 500 });
  }
}
