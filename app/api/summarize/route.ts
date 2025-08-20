// app/api/summarize/route.ts
import OpenAI from 'openai';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ----- Upstash REST helpers -----
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

const LANG_MAP: Record<string, string> = {
  en: 'English', hi: 'Hindi', es: 'Spanish', fr: 'French', de: 'German',
  pt: 'Portuguese', it: 'Italian', ru: 'Russian', ja: 'Japanese', 'zh-Hans': 'Chinese (Simplified)', ar: 'Arabic',
};

type SuggestionOut = { title: string; author?: string };

function normalizeSuggestions(val: any): SuggestionOut[] {
  if (!Array.isArray(val)) return [];
  const out: SuggestionOut[] = [];
  for (const item of val) {
    if (!item) continue;
    if (typeof item === 'string') { const t = item.trim(); if (t) out.push({ title: t }); continue; }
    if (typeof item === 'object') {
      const map: Record<string, any> = {};
      Object.keys(item).forEach(k => { map[k.toLowerCase().replace(/[-\s]/g, '_')] = (item as any)[k]; });
      const t = map['title'] || map['book'] || map['name'] || '';
      const a = map['author'] || (Array.isArray(map['authors']) ? map['authors'][0] : undefined);
      if (t && String(t).trim()) out.push({ title: String(t).trim(), author: a ? String(a) : undefined });
    }
  }
  // de-dup by title
  const seen = new Set<string>();
  const uniq = out.filter(s => { const k = s.title.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  return uniq.slice(0, 3);
}

function normalize(raw: any) {
  if (!raw || typeof raw !== 'object') return null;
  const map: Record<string, any> = {};
  Object.keys(raw).forEach(k => { map[k.toLowerCase().replace(/[-\s]/g, '_')] = (raw as any)[k]; });
  const summary = typeof map['summary'] === 'string' ? map['summary'] : '';
  const readers_takeaway = Array.isArray(map['readers_takeaway']) ? map['readers_takeaway']
    : (Array.isArray(map["reader_s_takeaway"]) ? map["reader_s_takeaway"] : []);
  const readers_suggestion = normalizeSuggestions(map['readers_suggestion'] ?? map['reader_s_suggestion'] ?? []);
  let readers_treat = '';
  if (typeof map['readers_treat'] === 'string') readers_treat = map['readers_treat'];
  else if (Array.isArray(map['readers_treat'])) readers_treat = map['readers_treat'].join(' ');
  if (!summary) return null;
  return { summary, readers_takeaway, readers_suggestion, readers_treat };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title, authors, publishedDate, description, categories,
      desiredWords = 2000, tolerance = 0.15, language = 'en',
    } = body || {};

    if (!title) return new Response('Missing title', { status: 400 });

    const langCode = (language || 'en').toString();
    const targetLanguage =
      LANG_MAP[langCode] || LANG_MAP[langCode.toLowerCase?.()] ||
      (typeof language === 'string' ? language : 'English');

    const cacheKey = `trl:sum:${hashKey({ title, authors, publishedDate, desiredWords, language: targetLanguage })}`;
    const cached = await kvGet(cacheKey);
    if (cached && cached.summary) {
      return new Response(JSON.stringify(cached), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const sys =
      "You are TRL Summarizer for The Reader's Lawn®.\n" +
      `Write the MAIN SUMMARY in ${targetLanguage}. It must be exactly three substantial paragraphs separated by one blank line, ` +
      `totaling about ${desiredWords} words (±${Math.round(tolerance*100)}%). Avoid spoilers where possible.\n` +
      "After the three paragraphs, also include:\n" +
      "1) Reader's Takeaway — 5–8 crisp bullets.\n" +
      "2) Reader's Treat — 4–5 lines introducing the author and mentioning a few of their important works.\n" +
      "3) Reader's Suggestion — EXACTLY 3 similar books (same topic/genre). Return only titles and optional author names; no reasons.\n" +
      "Return STRICT JSON with keys: summary, readers_takeaway, readers_treat, readers_suggestion.\n" +
      "Format readers_suggestion as an array of objects: [{\"title\": string, \"author\"?: string}].\n" +
      "Put ONLY the three paragraphs (separated by blank lines) inside the `summary` string.";

    const userPayload = {
      title, authors, publishedDate, categories,
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

    out.readers_suggestion = (out.readers_suggestion || []).slice(0, 3);

    await kvSet(cacheKey, out);
    return new Response(JSON.stringify(out), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error(e);
    return new Response(e?.message || 'OpenAI error', { status: 500 });
  }
}
