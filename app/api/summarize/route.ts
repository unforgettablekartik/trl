import OpenAI from 'openai';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ----- Minimal Upstash REST helpers (no extra deps) -----
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
async function kvSet(key: string, value: any, ttlSeconds = 2592000 /*30d*/): Promise<void> {
  if (!KV_URL || !KV_TOKEN) return;
  try {
    await fetch(`${KV_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(value))}?EX=${ttlSeconds}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
    });
  } catch { /* ignore */ }
}

function hashKey(obj: any) {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 24);
}

// Normalize model output into the exact shape we render
function normalize(raw: any) {
  if (!raw || typeof raw !== 'object') return null;
  const map: Record<string, any> = {};
  Object.keys(raw).forEach(k => { map[k.toLowerCase().replace(/[-\s]/g, '_')] = (raw as any)[k]; });
  const summary = typeof map['summary'] === 'string' ? map['summary'] : '';
  const readers_takeaway = Array.isArray(map['readers_takeaway']) ? map['readers_takeaway'] : (Array.isArray(map["reader_s_takeaway"]) ? map["reader_s_takeaway"] : []);
  const readers_suggestion = Array.isArray(map['readers_suggestion']) ? map['readers_suggestion'] : (Array.isArray(map["reader_s_suggestion"]) ? map["reader_s_suggestion"] : []);
  if (!summary) return null;
  return { summary, readers_takeaway, readers_suggestion };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      authors,
      publishedDate,
      description,
      categories,
      desiredWords = 1000,
      tolerance = 0.15,
    } = body || {};

    if (!title) return new Response('Missing title', { status: 400 });

    // ---- CACHE LOOKUP (summary) ----
    const cacheKey = `trl:sum:${hashKey({ title, authors, publishedDate })}`;
    const cached = await kvGet(cacheKey);
    if (cached && cached.summary) {
      return new Response(JSON.stringify(cached), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const sys =
      "You are TRL Summarizer for The Reader's Lawn. " +
      "Produce an insightful, neutral summary of the selected book. " +
      "After the summary, include two sections: (1) Reader's Takeaway with 5-8 crisp bullets, " +
      "(2) Reader's Suggestion recommending 2-3 similar books with one-line reasons. " +
      "Avoid spoilers where possible. " +
      `Aim for ${desiredWords} words with a +/- ${Math.round(tolerance * 100)}% tolerance. ` +
      "Output STRICT JSON with keys: summary, readers_takeaway, readers_suggestion.";

    const userPayload = {
      title,
      authors,
      publishedDate,
      categories,
      descriptionSnippet: (description || '').slice(0, 1200),
    };

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: "BOOK METADATA (JSON):\n" + JSON.stringify(userPayload, null, 2) + "\n\nReturn only JSON." },
      ],
      response_format: { type: 'json_object' },
    });

    // Parse & coerce
    let obj: any = null;
    try { obj = JSON.parse(completion.choices[0]?.message?.content || '{}'); } catch {
      const raw = completion.choices[0]?.message?.content || '';
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) { try { obj = JSON.parse(m[0]); } catch {} }
    }
    const out = normalize(obj);
    if (!out) return new Response('Model returned an empty or invalid summary', { status: 502 });

    // Save to cache (30 days)
    await kvSet(cacheKey, out);

    return new Response(JSON.stringify(out), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error(e);
    return new Response(e?.message || 'OpenAI error', { status: 500 });
  }
}
