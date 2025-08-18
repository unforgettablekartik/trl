'use client';

// TRL — Fresh visual refresh: cleaner colors, readable typography, left-corner logo, sticky header
// File: components/TRLBookSummaryGenerator.tsx
// Notes:
//  - No external UI libs. Pure React + small CSS (via styled-jsx) so it looks good even without Tailwind.
//  - Logo sits top-left in a sticky header. Font sizes are responsive via clamp().
//  - Color scheme: Sage green + warm neutral. Buttons/inputs/cards restyled for clarity.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

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
interface SummaryPayload { summary: string; readers_takeaway: string[]; readers_suggestion: Suggestion[] }

// -------------------- HELPERS / BRAND --------------------
const truncate = (t?: string, n = 160) => (t ? (t.length > n ? t.slice(0, n - 1) + '...' : t) : '');
const brand = {
  name: "The Reader's Lawn",
  logoCandidates: ['/trl-logo.png', '/The%20Reader%27s%20Lawn%20Logo.png', "/The Reader's Lawn Logo.png"],
};

const DESIRED_WORDS = 1000; // ~1000 words
const TOLERANCE = 0.15;     // +/- 15%

const useDebounced = (value: string, delay = 450) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return debounced;
};

// -------------------- UI PRIMITIVES --------------------
const Button = ({ children, onClick, disabled, variant = 'primary' }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: 'primary' | 'outline' | 'ghost' }) => (
  <button className={`trl-btn trl-btn--${variant} ${disabled ? 'is-disabled' : ''}`} onClick={onClick} disabled={disabled}>{children}</button>
);

const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', ...props }) => (
  <div className={`trl-card ${className}`} {...props} />
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...props }) => (
  <input className={`trl-input ${className}`} {...props} />
);

// -------------------- SPLASH LOADER --------------------
function Splash({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="trl-splash">
      <div className="trl-splash__box">
        <img
          src="/trl-logo.png"
          alt="The Reader's Lawn Logo"
          className="trl-splash__logo"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if ((img as any).dataset && (img as any).dataset.altSrcTried !== '1') {
              (img as any).dataset.altSrcTried = '1';
              img.src = '/The%20Reader%27s%20Lawn%20Logo.png';
            }
          }}
        />
        <div className="trl-progress">
          <div className="trl-progress__bar" />
        </div>
        <p className="trl-splash__text">Crafting your summary...</p>
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

      {/* Sticky Header */}
      <header className="trl-header">
        <div className="trl-header__inner">
          <div className="trl-logo">
            <img
              src={brand.logoCandidates[logoIdx]}
              alt="The Reader's Lawn Logo"
              onError={() => setLogoIdx((i) => Math.min(i + 1, brand.logoCandidates.length - 1))}
            />
            <div className="trl-titles">
              <h1>The Reader's Lawn</h1>
              <p>AI Book Summary Generator</p>
            </div>
          </div>
          <div className="trl-header__actions">
            <Button variant="outline" onClick={() => window.location.reload()}>New Session</Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="trl-app">
        <div className="trl-container">
          {/* Search */}
          <Card className="p-4">
            <div className="trl-search">
              <label className="trl-search__label">Search</label>
              <Input placeholder="Search by book or author (e.g., 'Sapiens' or 'Haruki Murakami')" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="trl-help">Top 5 suggestions appear below. Use the button to load 5 more.</div>
          </Card>

          {/* Suggestions */}
          <div className="trl-grid">
            {loadingSearch ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="trl-skel">
                    <div className="trl-skel__thumb" />
                    <div className="trl-skel__text">
                      <div className="trl-skel__line w2" />
                      <div className="trl-skel__line w3" />
                      <div className="trl-skel__line w1" />
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              visibleBooks.map((b) => (
                <Card key={b.id} className={`p-4 ${selected?.id === b.id ? 'is-selected' : ''}`}>
                  <div className="trl-item">
                    <img src={b.thumbnail || 'https://placehold.co/128x192?text=No+Cover'} alt={b.title} className="trl-item__thumb" loading="lazy" />
                    <div className="trl-item__body">
                      <div className="trl-item__title">{b.title}</div>
                      <div className="trl-item__meta">{b.authors?.join(', ')}{b.publishedDate ? ' · ' + b.publishedDate : ''}</div>
                      <div className="trl-item__desc">{truncate(b.description, 150)}</div>
                      <div className="trl-item__actions">
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
            <div className="trl-center">
              <Button variant="outline" onClick={() => setVisibleCount((c) => Math.min(c + 5, books.length))}>Load 5 more</Button>
            </div>
          )}

          {/* Output */}
          {selected && (
            <div className="trl-out">
              {/* Visual */}
              <Card className="trl-visual">
                <div className="trl-visual__frame">
                  <div className="trl-visual__ph" />
                  <div className="trl-visual__content">
                    {loadingImage ? (
                      <div className="trl-visual__loading">Generating header image...</div>
                    ) : headerImage ? (
                      <img src={headerImage} alt="Generated header" className="trl-visual__img" />
                    ) : (
                      <div className="trl-visual__empty">
                        <div>No header image yet</div>
                        <div className="trl-visual__hint">Click Generate Summary to create an illustrated header.</div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="trl-visual__meta">
                  <div className="ttl">{selected.title}</div>
                  <div className="meta">{selected.authors?.join(', ')}</div>
                  {selected.categories?.length ? (<div className="cats">{selected.categories.join(' · ')}</div>) : null}
                </div>
              </Card>

              {/* Summary */}
              <Card className="trl-summary">
                <div className="trl-summary__bar">
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
                  <div className="trl-target">Target length: ~{DESIRED_WORDS} words (±{Math.round(TOLERANCE*100)}%)</div>
                </div>

                {!summary && !loadingSummary && (
                  <div className="trl-summary__hint">Click Generate / Regenerate to create a ~1000-word summary with Reader's Takeaway and Reader's Suggestion.</div>
                )}

                {summary && (
                  <div className="trl-prose">
                    <h2>Summary</h2>
                    <ReactMarkdown>{summary.summary}</ReactMarkdown>
                    <h3>Reader's Takeaway</h3>
                    <ul>{summary.readers_takeaway?.map((t, i) => <li key={i}>{t}</li>)}</ul>
                    <h3>Reader's Suggestion</h3>
                    <ul>{summary.readers_suggestion?.map((s, i) => (<li key={i}><span className="emph">{s.title}</span>{s.author ? ' by ' + s.author : ''} — {s.why}</li>))}</ul>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Footer */}
          <div className="trl-footer">Built for <b>{brand.name}</b>. Summaries are AI-generated; verify critical facts.</div>
        </div>
      </main>

      {/* DESIGN SYSTEM (scoped global) */}
      <style jsx global>{`
        :root{
          --bg: #F7FBF9;         /* page background */
          --card: #FFFFFF;       /* card bg */
          --ink: #0F1C17;        /* primary text */
          --muted: #4B5563;      /* secondary text */
          --line: #E6ECE9;       /* borders */
          --brand-400:#34D399;   /* mint */
          --brand-500:#10B981;   /* primary */
          --brand-600:#059669;   /* primary dark */
          --brand-700:#047857;   /* deeper */
          --brand-800:#065F46;   /* headings */
        }
        html,body{ margin:0; padding:0; background: var(--bg); color: var(--ink); font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"; }

        /* Sticky header */
        .trl-header{ position:sticky; top:0; z-index:40; background:rgba(255,255,255,0.85); backdrop-filter:saturate(180%) blur(12px); border-bottom:1px solid var(--line); }
        .trl-header__inner{ max-width:1100px; margin:0 auto; padding:14px 16px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .trl-logo{ display:flex; align-items:center; gap:12px; }
        .trl-logo img{ height:40px; width:auto; display:block; }
        .trl-titles h1{ margin:0; font-weight:700; color:var(--brand-800); font-size: clamp(18px, 2.5vw, 22px); line-height:1.1; }
        .trl-titles p{ margin:2px 0 0; color:var(--muted); font-size: clamp(12px, 1.8vw, 13px); }

        /* App layout */
        .trl-app{ min-height:100vh; background: linear-gradient(180deg, var(--bg) 0%, #fff 60%); }
        .trl-container{ max-width:1100px; margin:0 auto; padding: 24px 16px 80px; }
        .trl-center{ display:flex; justify-content:center; margin-top:16px; }

        /* Buttons */
        .trl-btn{ border-radius:14px; padding:10px 14px; font-size:14px; font-weight:600; border:1px solid transparent; cursor:pointer; transition: transform .03s ease, box-shadow .2s ease; }
        .trl-btn:active{ transform: translateY(1px); }
        .trl-btn.is-disabled{ opacity:.6; cursor:not-allowed; }
        .trl-btn--primary{ background: var(--brand-600); color:#fff; }
        .trl-btn--primary:hover{ background: var(--brand-700); }
        .trl-btn--outline{ background:#fff; color: var(--brand-700); border-color: var(--brand-600); }
        .trl-btn--outline:hover{ background:#F0FFF8; }
        .trl-btn--ghost{ background:transparent; color: var(--brand-700); }

        /* Inputs */
        .trl-input{ width:100%; border:1px solid var(--line); border-radius:14px; padding:12px 14px; font-size:14px; outline:none; }
        .trl-input:focus{ border-color: var(--brand-500); box-shadow: 0 0 0 3px rgba(16,185,129,.15); }

        /* Cards */
        .trl-card{ background: var(--card); border:1px solid var(--line); border-radius:16px; box-shadow: 0 1px 2px rgba(0,0,0,.03); }
        .trl-card.is-selected{ box-shadow: 0 0 0 2px var(--brand-400) inset; border-color: var(--brand-400); }

        /* Search row */
        .trl-search{ display:flex; align-items:center; gap:12px; }
        .trl-search__label{ font-weight:600; color:var(--brand-800); font-size:14px; }
        .trl-help{ margin-top:8px; font-size:12px; color:var(--muted); }

        /* Grid */
        .trl-grid{ display:grid; grid-template-columns: 1fr; gap:12px; margin-top:16px; }
        @media (min-width: 768px){ .trl-grid{ grid-template-columns: 1fr 1fr; } }

        /* Skeleton */
        .trl-skel{ display:flex; gap:12px; }
        .trl-skel__thumb{ width:80px; height:120px; border-radius:10px; background:#EAF6F0; }
        .trl-skel__text{ flex:1; }
        .trl-skel__line{ height:10px; background:#EAF6F0; border-radius:6px; margin-bottom:8px; }
        .trl-skel__line.w1{ width:100%; }
        .trl-skel__line.w2{ width:70%; }
        .trl-skel__line.w3{ width:50%; }

        /* Result item */
        .trl-item{ display:flex; gap:14px; }
        .trl-item__thumb{ width:80px; height:112px; object-fit:cover; border-radius:10px; background:#EAF6F0; }
        .trl-item__body{ flex:1; }
        .trl-item__title{ font-weight:700; font-size:16px; color: var(--ink); }
        .trl-item__meta{ font-size:13px; color: var(--muted); margin:2px 0 8px; }
        .trl-item__desc{ font-size:14px; color: var(--ink); opacity:.8; }
        .trl-item__actions{ display:flex; gap:8px; margin-top:10px; }

        /* Output area */
        .trl-out{ display:grid; grid-template-columns: 1fr; gap:16px; margin-top:24px; }
        @media (min-width: 900px){ .trl-out{ grid-template-columns: 1fr 2fr; } }

        .trl-visual{ overflow:hidden; }
        .trl-visual__frame{ position:relative; }
        .trl-visual__ph{ padding-top:150%; background:#ECFDF5; }
        .trl-visual__content{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; padding:12px; }
        .trl-visual__img{ width:100%; height:100%; object-fit:cover; border-radius:8px; }
        .trl-visual__empty{ text-align:center; color:var(--muted); font-size:13px; }
        .trl-visual__hint{ font-size:12px; opacity:.9; margin-top:4px; }
        .trl-visual__loading{ color:var(--brand-800); font-size:12px; }
        .trl-visual__meta{ padding:12px 14px; }
        .trl-visual__meta .ttl{ font-weight:700; font-size:15px; }
        .trl-visual__meta .meta{ font-size:12px; color:var(--muted); }
        .trl-visual__meta .cats{ margin-top:6px; font-size:12px; color:var(--muted); }

        .trl-summary{ padding:16px; }
        .trl-summary__bar{ display:flex; flex-wrap:wrap; align-items:center; gap:8px 10px; margin-bottom:10px; }
        .trl-target{ font-size:12px; color:var(--muted); margin-left:auto; }
        .trl-summary__hint{ color:var(--muted); font-size:14px; }

        .trl-prose h2{ margin:16px 0 8px; font-size: clamp(18px, 3.2vw, 20px); color: var(--brand-800); }
        .trl-prose h3{ margin:14px 0 6px; font-size: clamp(15px, 2.6vw, 16px); color: var(--brand-800); }
        .trl-prose p, .trl-prose li{ font-size:15px; line-height:1.6; }
        .trl-prose ul{ padding-left: 20px; }
        .trl-prose .emph{ font-style:italic; font-weight:600; }

        /* Footer */
        .trl-footer{ text-align:center; font-size:12px; color:var(--muted); margin-top:28px; }

        /* Splash */
        .trl-splash{ position:fixed; inset:0; z-index:60; display:grid; place-items:center; background:rgba(255,255,255,.9); backdrop-filter: blur(6px); }
        .trl-splash__box{ display:flex; flex-direction:column; align-items:center; gap:12px; }
        .trl-splash__logo{ height:80px; width:auto; filter: drop-shadow(0 2px 6px rgba(0,0,0,.08)); }
        .trl-splash__text{ font-size:12px; color:var(--brand-800); }
        .trl-progress{ height:8px; width:220px; background:#E6F4EA; border-radius:99px; overflow:hidden; }
        .trl-progress__bar{ height:100%; width:33%; background: var(--brand-600); animation: trlbar 1.2s linear infinite; }
        @keyframes trlbar{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}
      `}</style>
