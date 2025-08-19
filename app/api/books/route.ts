import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const maxResults = searchParams.get('maxResults') || '30';
    if (!q || q.trim().length < 2) {
      return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    const url = new URL('https://www.googleapis.com/books/v1/volumes');
    url.searchParams.set('q', q);
    url.searchParams.set('maxResults', maxResults);
    url.searchParams.set('printType', 'books');
    url.searchParams.set('orderBy', 'relevance');

    const res = await fetch(url.toString(), { next: { revalidate: 60 } });
    const data = await res.json();
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ items: [], error: e?.message || 'fetch_failed' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}
