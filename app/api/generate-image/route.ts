import OpenAI from 'openai';
import { NextRequest } from 'next/server';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { title, authors } = await req.json();
    if (!title) return new Response('Missing title', { status: 400 });

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

    return new Response(JSON.stringify({ image: `data:image/png;base64,${b64}` }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(e?.message || 'OpenAI image error', { status: 500 });
  }
}
