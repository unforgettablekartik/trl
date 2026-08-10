import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const maxResults = searchParams.get('maxResults') || '30';
    const langRestrict = searchParams.get('langRestrict');
    if (!q || q.trim().length < 4) {
      return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    const url = new URL('https://www.googleapis.com/books/v1/volumes');
    url.searchParams.set('q', q);
    url.searchParams.set('maxResults', maxResults);
    url.searchParams.set('printType', 'books');
    url.searchParams.set('orderBy', 'relevance');
    if (langRestrict) url.searchParams.set('langRestrict', langRestrict);
    if (process.env.GOOGLE_BOOKS_API_KEY) url.searchParams.set('key', process.env.GOOGLE_BOOKS_API_KEY);

    const res = await fetch(url.toString(), { next: { revalidate: 60 } });
    const data = await res.json();
    // Surface upstream failures (rate limits, quota errors, etc.) as an
    // explicit error instead of a silent empty result, so the client can
    // fall back to querying Google Books directly from the browser.
    if (!res.ok || data?.error) {
      return new Response(JSON.stringify({
        error: data?.error?.message || `upstream_${res.status}`,
        source: 'proxy',
        keyConfigured: Boolean(process.env.GOOGLE_BOOKS_API_KEY),
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({
      error: e?.message || 'fetch_failed',
      source: 'proxy',
      keyConfigured: Boolean(process.env.GOOGLE_BOOKS_API_KEY),
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}
