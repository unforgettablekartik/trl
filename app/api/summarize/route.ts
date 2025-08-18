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
      "Aim for " + desiredWords + " words with a +/- " + Math.round(tolerance * 100) + "% tolerance. " +
      "Output STRICT JSON with keys: summary, readers_takeaway, readers_suggestion.";

    const userPayload = {
      title,
      authors,
      publishedDate,
      categories,
      descriptionSnippet: (description || '').slice(0, 1000),
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

    const json = completion.choices[0]?.message?.content || '{}';
    return new Response(json, { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error(e);
    return new Response(e?.message || 'OpenAI error', { status: 500 });
  }
}
