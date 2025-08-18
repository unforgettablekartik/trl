import OpenAI from 'openai';
import { NextRequest } from 'next/server';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    const content = completion.choices[0]?.message?.content || '{}';

    // Parse and coerce the shape strictly
    let obj: any = null;
    try { obj = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) { try { obj = JSON.parse(m[0]); } catch {} }
    }
    const out = {
      summary: typeof obj?.summary === 'string' ? obj.summary : '',
      readers_takeaway: Array.isArray(obj?.readers_takeaway) ? obj.readers_takeaway : [],
      readers_suggestion: Array.isArray(obj?.readers_suggestion) ? obj.readers_suggestion : [],
    };

    if (!out.summary) {
      return new Response('Model returned an empty summary', { status: 502 });
    }

    return new Response(JSON.stringify(out), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(e?.message || 'OpenAI error', { status: 500 });
  }
}
