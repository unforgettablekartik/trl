'use client';

// Fresh, simplified TRL component (ASCII-only, no extra libs)
// File: components/TRLBookSummaryGenerator.tsx
// Works in a plain Next.js app (App Router). No framer-motion or icon packages.
// Keep /app/api/summarize/route.ts and /app/api/generate-image/route.ts from earlier.
// Place your logo at /public/trl-logo.png

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

// -------------------- UI PRIMITIVES --------------------
const btnBase = 'inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium focus:outline-none';
const Button = (
  { children, onClick, disabled, variant = 'primary' as 'primary' | 'outline' | 'ghost' }:
  { children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: 'primary' | 'outline' | 'ghost' }
) => {
  let cls = btnBase;
  if (variant === 'primary') cls += ' bg-emerald-600 text-white';
  if (variant === 'outline') cls += ' border border-emerald-600 text-emerald-700';
  if (variant === 'ghost') cls += ' text-emerald-700';
  if (disabled) cls += ' opacity-60 cursor-not-allowed';
  return <button className={cls} onClick={onClick} disabled={disabled}>{children}</button>;
};

const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', ...props }) => (
  <div className={`rounded-2xl border border-emerald-200 bg-white ${className}`} {...props} />
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...props }) => (
  <input className={`w-full rounded-2xl border border-emerald-300 px-4 py-3 text-sm ${className}`} {...props} />
);

// -------------------- TYPES --------------------
interface BookLite {
  id: string;
  title: string;
  authors: string[];
  publishedDate?: string;
  description?: string;
  categories?: string[];
  thumbnail?: string;
}

interface Suggestion { title: string; author?: string; why: string }
interface SummaryPayload {
  summary: string;
  readers_takeaway: string[];
  readers_suggestion: Suggestion[];
}

// -------------------- HELPERS / BRAND --------------------
const truncate = (t?: string, n = 160) => (t ? (t.length > n ? t.slice(0, n - 1) + '...' : t) : '');
const brand = {
  name: "The Reader's Lawn",
  gradient: 'bg-gradient-to-br from-emerald-100 via-emerald-50 to-white',
  logoCandidates: ['/trl-logo.png', '/The%20Reader%27s%20Lawn%20Logo.png', "/The Reader's Lawn Logo.png"],
};

// Summary sizing preferences
const DESIRED_WORDS = 1000; // aim for ~1000 words
const TOLERANCE = 0.15;     // +/- 15% tolerance

const useDebounced = (value: string, delay = 450) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return debounced;
};

// -------------------- SPLASH LOADER --------------------
function Splash({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div style={{position:'fixed', inset:0 as any, zIndex:50, display:'grid', placeItems:'center', background:'rgba(255,255,255,0.9)'}}>
      <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:12}}>
        <img
          src="/trl-logo.png"
          alt="The Reader's Lawn Logo"
          style={{height:80, width:'auto'}}
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if ((img as any).dataset && (img as any).dataset.altSrcTried !== '1') {
              (img as any).dataset.altSrcTried = '1';
              img.src = '/The%20Reader%27s%20Lawn%20Logo.png';
            }
          }}
        />
        <div style={{height:8, width:220, background:'#E6F4EA', overflow:'hidden', borderRadius:9999}}>
          <div className="trl-progress-bar" style={{height:'100%', width:'33%', background:'#059669', animation:'trlbar 1.2s linear infinite'}} />
        </div>
        <style>{`@keyframes trlbar{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
        <p style={{fontSize:12, color:'#065F46'}}>Crafting your summary...</p>
      </div>
    </div>
  );
}

// -------------------- MAIN COMPONENT --------------------
export default function TRLBookSummaryGenerator() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query);

  const [books, setBooks] = useState<BookLite[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);

  const [selected, setSelected] = useState<BookLite | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summary, setSummary] = useState<SummaryPayload | null>(null);

  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);

  const [logoIdx, setLogoIdx] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // ---- Google Books Search ----
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) {
      setBooks([]); setVisibleCount(5); return;
    }
    (async () => {
      try {
        setLoadingSearch(true);
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        const url = new URL('https://www.googleapis.com/books/v1/volumes');
        url.searchParams.set('q', debouncedQuery);
        url.searchParams.set('maxResults', '30');
        url.searchParams.set('printType', 'books');
        url.searchParams.set('orderBy', 'relevance');
        const res = await fetch(url.toString(), { signal: ac.signal });
        const data = await res.json();
        const items: BookLite[] = (data.items || []).map((it: any) => {
          const v = it.volumeInfo || {};
          const thumb = (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace(/^http:/, 'https:');
          return { id: it.id, title: v.title, authors: v.authors || [], publishedDate: v.publishedDate, description: v.description, categories: v.categories, thumbnail: thumb } as BookLite;
        });
        setBooks(items); setVisibleCount(5);
      } catch (e: any) { if (e?.name !== 'AbortError') console.error(e); } finally { setLoadingSearch(false); }
    })();
  }, [debouncedQuery]);

  const visibleBooks = useMemo(() => books.slice(0, visibleCount), [books, visibleCount]);

  // ---- Generate Summary + Image ----
  async function handleGenerate() {
    if (!selected) return;
    setLoadingSummary(true); setSummary(null);
    setLoadingImage(true); setHeaderImage(null);

    const body = { title: selected.title, authors: selected.authors, publishedDate: selected.publishedDate, description: selected.description, categories: selected.categories, desiredWords: DESIRED_WORDS, tolerance: TOLERANCE };
    try {
      const [sumRes, imgRes] = await Promise.all([
        fetch('/api/summarize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
        fetch('/api/generate-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: selected.title, authors: selected.authors }) })
      ]);
      if (sumRes.ok) setSummary(await sumRes.json()); else console.error('Summarize error', await sumRes.text());
      if (imgRes.ok) { const j = await imgRes.json(); setHeaderImage(j.image); } else console.error('Image error', await imgRes.text());
    } catch (e) { console.error(e); } finally { setLoadingSummary(false); setLoadingImage(false); }
  }

  // ---- Compose MD ----
  const composedMarkdown = useMemo(() => {
    if (!summary || !selected) return '';
    const head = '# ' + selected.title + '\n\n' + (selected.authors?.length ? '**By ' + selected.authors.join(', ') + '**\\n\\n' : '');
    const sum = '## Summary\n\n' + summary.summary + '\n\n';
    const takeLines = (summary.readers_takeaway || []).map((t) => '- ' + t).join('\n');
    const take = '## Reader\'s Takeaway\n\n' + (takeLines ? takeLines + '\n\n' : '- —\n\n');
    const suggLines = (summary.readers_suggestion || []).map((s) => '- *' + s.title + '*' + (s.author ? ' by ' + s.author : '') + ' — ' + s.why).join('\n');
    const sugg = '## Reader\'s Suggestion\n\n' + (suggLines ? suggLines + '\n' : '- —\n');
    return head + sum + take + sugg;
  }, [summary, selected]);

  // -------------------- RENDER --------------------
  return (
    <>
      <Splash show={loadingSummary || loadingImage} />
      <div className={`${brand.gradient} min-h-screen text-black`}>
        <div className="mx-auto max-w-5xl px-4 pb-24 pt-10">
          {/* Brand Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={brand.logoCandidates[logoIdx]}
                alt="The Reader's Lawn Logo"
                className="h-14 w-auto"
                onError={() => setLogoIdx((i) => Math.min(i + 1, brand.logoCandidates.length - 1))}
              />
              <div>
                <h1 className="text-2xl font-bold leading-tight text-emerald-700">AI Book Summary Generator</h1>
                <p className="text-sm text-emerald-800/70">Type a book or author, pick a result, get a 1000-word insight plus takeaways and similar reads</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => window.location.reload()}>New Session</Button>
          </div>

          {/* Search */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <span style={{color:'#065F46'}}>Search</span>
              <Input placeholder="Search by book or author (e.g., 'Sapiens' or 'Haruki Murakami')" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="mt-4 text-xs text-emerald-800/60">Top 5 suggestions appear below. Use the button to load 5 more.</div>
          </Card>

          {/* Suggestions */}
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {loadingSearch ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="flex gap-4">
                    <div className="h-24 w-16 rounded-lg bg-emerald-100" />
                    <div className="flex-1">
                      <div className="mb-2 h-4 w-2/3 rounded bg-emerald-100" />
                      <div className="mb-1 h-3 w-1/2 rounded bg-emerald-100" />
                      <div className="h-3 w-full rounded bg-emerald-100" />
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              visibleBooks.map((b) => (
                <Card key={b.id} className={`p-4 ${selected?.id === b.id ? 'ring-2 ring-emerald-500' : ''}`}>
                  <div className="flex gap-4">
                    <img src={b.thumbnail || 'https://placehold.co/128x192?text=No+Cover'} alt={b.title} className="h-28 w-20 rounded-lg object-cover" loading="lazy" />
                    <div className="flex-1">
                      <div className="mb-1 text-base font-semibold">{b.title}</div>
                      <div className="mb-2 text-sm text-emerald-900/80">{b.authors?.join(', ')}{b.publishedDate ? ' · ' + b.publishedDate : ''}</div>
                      <div className="text-sm text-emerald-900/80">{truncate(b.description, 150)}</div>
                      <div className="mt-3 flex gap-2">
                        <Button onClick={() => setSelected(b)}>Select</Button>
                        {selected?.id === b.id && (<Button variant="outline" onClick={handleGenerate} disabled={loadingSummary}>{loadingSummary ? 'Generating...' : 'Generate Summary'}</Button>)}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Load more */}
          {books.length > visibleCount && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={() => setVisibleCount((c) => Math.min(c + 5, books.length))}>Load 5 more</Button>
            </div>
          )}

          {/* Output */}
          {selected && (
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Visual */}
              <Card className="overflow-hidden md:col-span-1">
                <div className="relative">
                  <div className="aspect-[2/3] w-full bg-emerald-50" />
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    {loadingImage ? (
                      <div style={{color:'#065F46', fontSize:12}}>Generating header image...</div>
                    ) : headerImage ? (
                      <img src={headerImage} alt="Generated header" className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-center text-sm" style={{color:'#065F46'}}>
                        <div>No header image yet</div>
                        <div className="text-xs">Click Generate Summary to create an illustrated header.</div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-sm font-semibold">{selected.title}</div>
                  <div className="text-xs text-emerald-900/80">{selected.authors?.join(', ')}</div>
                  {selected.categories?.length ? (<div className="mt-2 text-xs text-emerald-800/70">{selected.categories.join(' · ')}</div>) : null}
                </div>
              </Card>

              {/* Summary */}
              <Card className="p-5 md:col-span-2">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Button onClick={handleGenerate} disabled={loadingSummary}>{loadingSummary ? 'Crafting your 1000-word insight...' : 'Generate / Regenerate'}</Button>
                  {summary && (
                    <>
                      <Button variant="outline" onClick={() => {
                        const blob = new Blob([composedMarkdown], { type:'text/markdown' });
                        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = (selected.title || 'summary') + ' - TRL Summary.md'; a.click(); URL.revokeObjectURL(url);
                      }}>Download .md</Button>
                      <Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(composedMarkdown); alert('Copied to clipboard'); } catch {} }}>Copy</Button>
                    </>
                  )}
                  <div className="text-xs" style={{color:'#065F46'}}>Target length: ~{DESIRED_WORDS} words (±{Math.round(TOLERANCE*100)}%)</div>
                </div>

                {!summary && !loadingSummary && (
                  <div className="text-sm" style={{color:'#065F46'}}>Click Generate / Regenerate to create a ~1000-word summary with Reader's Takeaway and Reader's Suggestion.</div>
                )}

                {summary && (
                  <div className="prose prose-sm max-w-none">
                    <h2>Summary</h2>
                    <ReactMarkdown>{summary.summary}</ReactMarkdown>
                    <h3>Reader's Takeaway</h3>
                    <ul className="list-disc pl-6">{summary.readers_takeaway?.map((t, i) => <li key={i}>{t}</li>)}</ul>
                    <h3>Reader's Suggestion</h3>
                    <ul className="list-disc pl-6">{summary.readers_suggestion?.map((s, i) => (<li key={i}><span style={{fontStyle:'italic', fontWeight:600}}>{s.title}</span>{s.author ? ' by ' + s.author : ''} — {s.why}</li>))}</ul>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Footer */}
          <div className="mt-14 text-center text-xs" style={{color:'#065F46'}}>Built for <b>{brand.name}</b>. Summaries are AI-generated; verify critical facts.</div>
        </div>
      </div>
    </>
  );
}

/* =======================
   MANUAL TEST CASES
   =======================
1) Logo loads: place /public/trl-logo.png and open /. If missing, it tries URL-encoded then spaced filename.
2) Search: type "Sapiens". See up to 5 results; "Load 5 more" appends 5 more (if available).
3) Generate: select a result, click Generate / Regenerate. Expect summary + takeaways + suggestions and an image.
4) Download/Copy: after generation, buttons work.
5) Regenerate: click Generate / Regenerate again to replace content.
If any step fails, check browser console and confirm /app/api/summarize/route.ts and /app/api/generate-image/route.ts exist.
*/
