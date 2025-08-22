'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface BookLite {
  id: string;
  title: string;
  authors: string[];
  publishedDate?: string;
  description?: string;
  categories?: string[];
  thumbnail?: string;
}
interface Suggestion { title: string; author?: string }
interface SummaryPayload {
  summary: string;
  readers_takeaway: string[];
  readers_suggestion: Suggestion[];
  readers_treat?: string;
}

const DESIRED_WORDS = 2000;
const TOLERANCE = 0.15;

const SUMMARY_LANGS = [
  { code: 'en', label: 'Default : English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'it', label: 'Italian' },
  { code: 'ru', label: 'Russian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh-Hans', label: 'Chinese (Simplified)' },
  { code: 'ar', label: 'Arabic' },
];
const RTL_LANGS = new Set(['ar', 'he', 'fa', 'ur']);

const brand = {
  name: "The Reader's Lawn®",
  logoCandidates: [
    '/trl-logo.png','/trl-logo.jpg','/trl-logo.jpeg','/trl-logo.webp',
    '/The%20Reader%27s%20Lawn%20Logo.png','/The%20Reader%27s%20Lawn%20Logo.jpg',
    "/The Reader's Lawn Logo.png","/The Reader's Lawn Logo.jpg",
  ],
};

/* ---------- Amazon affiliate helpers (global-aware) ---------- */
const AMAZON_LOCALE_MODE = (process.env.NEXT_PUBLIC_AMAZON_LOCALE || 'auto').toLowerCase();
const AMAZON_ALLOWED = (process.env.NEXT_PUBLIC_AMAZON_ALLOWED_LOCALES || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

function parseTags(jsonStr?: string): Record<string, string> {
  try { return jsonStr ? JSON.parse(jsonStr) : {}; } catch { return {}; }
}
const AMAZON_TAGS = parseTags(process.env.NEXT_PUBLIC_AMAZON_TAGS);
const AMAZON_FALLBACK_TAG = process.env.NEXT_PUBLIC_AMAZON_TAG || '';

function detectTLDFromBrowser(): string {
  if (typeof window === 'undefined') return 'com';
  const lang = (navigator.language || 'en').toLowerCase();
  if (lang.startsWith('en-in') || lang.endsWith('-in')) return 'in';
  if (lang.startsWith('en-gb')) return 'co.uk';
  if (lang.startsWith('de')) return 'de';
  if (lang.startsWith('fr')) return 'fr';
  if (lang.startsWith('es')) return 'es';
  if (lang.startsWith('it')) return 'it';
  if (lang.startsWith('pt-br')) return 'com.br';
  if (lang.startsWith('en-ca') || lang.endsWith('-ca')) return 'ca';
  if (lang.startsWith('en-au') || lang.endsWith('-au')) return 'com.au';
  if (lang.startsWith('ja')) return 'jp';
  return 'com';
}
function pickAmazonTLD(): string {
  if (AMAZON_LOCALE_MODE && AMAZON_LOCALE_MODE !== 'auto') return AMAZON_LOCALE_MODE;
  const detected = detectTLDFromBrowser();
  if (AMAZON_ALLOWED.length > 0) return AMAZON_ALLOWED.includes(detected) ? detected : (AMAZON_ALLOWED[0] || 'com');
  return detected;
}
function tagForTLD(tld: string): string | null {
  return AMAZON_TAGS[tld] || AMAZON_FALLBACK_TAG || null;
}
function amazonSearchUrl(q: string, author?: string): string | null {
  const tld = pickAmazonTLD();
  const tag = tagForTLD(tld);
  if (!tag) return null;
  const query = encodeURIComponent(q + (author ? ' ' + author : ''));
  return `https://www.amazon.${tld}/s?k=${query}&i=stripbooks&tag=${encodeURIComponent(tag)}`;
}

/* ---------- tiny client-side cache (avoid repeat token spend) ---------- */
const summaryCache = {
  get(key: string): SummaryPayload | null {
    try { const s = localStorage.getItem(`trl:sum:${key}`); return s ? JSON.parse(s) : null; } catch { return null; }
  },
  set(key: string, value: SummaryPayload) {
    try { localStorage.setItem(`trl:sum:${key}`, JSON.stringify(value)); } catch {}
  }
};
const searchCache = {
  get(q: string): BookLite[] | null {
    try { const s = sessionStorage.getItem(`trl:search:${q.toLowerCase()}`); return s ? JSON.parse(s) : null; } catch { return null; }
  },
  set(q: string, v: BookLite[]) {
    try { sessionStorage.setItem(`trl:search:${q.toLowerCase()}`, JSON.stringify(v)); } catch {}
  }
};

/* ---------- UI primitives ---------- */
const Button = ({
  children, onClick, disabled, variant = 'primary',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'ghost' | 'search' | 'danger' | 'cancel';
}) => (
  <button
    className={`trl-btn trl-btn--${variant} ${disabled ? 'is-disabled' : ''}`}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
);

const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', ...props }) => (
  <div className={`trl-card ${className}`} {...props} />
);
const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...props }) => (
  <input className={`trl-input ${className}`} {...props} />
);

function Logo({ className = '' }: { className?: string }) {
  const [idx, setIdx] = React.useState(0);
  const src = brand.logoCandidates[idx] || brand.logoCandidates[0];
  return (
    <img
      src={src}
      alt={`${brand.name} Logo`}
      className={className}
      onError={() => setIdx(i => Math.min(i + 1, brand.logoCandidates.length - 1))}
    />
  );
}

const useDebounced = (value: string, delay = 450) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

function Splash({ show, onCancel }: { show: boolean; onCancel: () => void }) {
  if (!show) return null;
  return (
    <div className="trl-splash">
      <div className="trl-splash__box">
        <Logo className="trl-splash__logo" />
        <div className="trl-progress"><div className="trl-progress__bar" /></div>
        <p className="trl-splash__text">Crafting your summary…</p>
        <Button variant="cancel" onClick={onCancel}>Cancel Request</Button>
      </div>
    </div>
  );
}

export default function TRLBookSummaryGenerator() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query);
  const [searchAllLangs, setSearchAllLangs] = useState(false);
  const [summaryLang, setSummaryLang] = useState('en');

  const [books, setBooks] = useState<BookLite[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(5);

  const [selected, setSelected] = useState<BookLite | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summary, setSummary] = useState<SummaryPayload | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // image generation paused
  const headerImage: string | null = null; // eslint-disable-line @typescript-eslint/no-unused-vars
  const loadingImage = false; // eslint-disable-line @typescript-eslint/no-unused-vars

  const abortSearchRef = useRef<AbortController | null>(null);
  const abortSummaryRef = useRef<AbortController | null>(null);
  const summaryBlockRef = useRef<HTMLDivElement | null>(null);

  const isRtl = RTL_LANGS.has(summaryLang);

  function resetToHome() {
    setQuery('');
    setBooks([]);
    setVisibleCount(5);
    setSelected(null);
    setHasGenerated(false);
    setSummary(null);
    setSummaryError(null);
    setLoadingSearch(false);
    setLoadingSummary(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function doSearch(q: string) {
    if (!q || q.trim().length < 2) {
      setBooks([]); setVisibleCount(5); setSearchError(null);
      return;
    }
    try {
      const cached = searchCache.get(q);
      if (cached) {
        setBooks(cached);
        setVisibleCount(5);
        setSearchError(null);
        return;
      }

      setLoadingSearch(true); setSearchError(null);
      abortSearchRef.current?.abort();
      const ac = new AbortController();
      abortSearchRef.current = ac;

      let data: any | null = null;
      try {
        const proxy = new URL('/api/books', window.location.origin);
        proxy.searchParams.set('q', q);
        proxy.searchParams.set('maxResults', '30');
        if (!searchAllLangs) proxy.searchParams.set('langRestrict', 'en');
        const pres = await fetch(proxy.toString(), { signal: ac.signal });
        if (pres.ok) data = await pres.json();
      } catch { /* fall through */ }

      if (!data) {
        const gurl = new URL('https://www.googleapis.com/books/v1/volumes');
        gurl.searchParams.set('q', q);
        gurl.searchParams.set('maxResults', '30');
        gurl.searchParams.set('printType', 'books');
        gurl.searchParams.set('orderBy', 'relevance');
        if (!searchAllLangs) gurl.searchParams.set('langRestrict', 'en');
        const gres = await fetch(gurl.toString(), { signal: ac.signal });
        data = await gres.json();
      }

      const items: BookLite[] = (data.items || []).map((it: any) => {
        const v = it.volumeInfo || {};
        const thumb = (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace(/^http:/, 'https:');
        return {
          id: it.id,
          title: v.title,
          authors: v.authors || [],
          publishedDate: v.publishedDate,
          description: v.description,
          categories: v.categories,
          thumbnail: thumb,
        } as BookLite;
      });

      setBooks(items);
      setVisibleCount(5);
      searchCache.set(q, items);

      if (!items.length) setSearchError('No results found. Try a shorter query or different spelling.');
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.error(e);
        setSearchError('Could not reach the books service. Please try again.');
      }
    } finally {
      setLoadingSearch(false);
    }
  }

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) {
      setBooks([]); setVisibleCount(5);
      return;
    }
    setHasGenerated(false);
    setSelected(null);
    // fire & forget
    void doSearch(debouncedQuery);
  }, [debouncedQuery, searchAllLangs]);

  function normalizeSuggestions(rs: any): Suggestion[] {
    if (!Array.isArray(rs)) return [];
    const out: Suggestion[] = [];
    for (const item of rs) {
      if (!item) continue;
      if (typeof item === 'string') {
        const t = item.trim(); if (t) out.push({ title: t });
        continue;
      }
      const map: Record<string, any> = {};
      Object.keys(item).forEach(k => {
        map[k.toLowerCase().replace(/[-\s]/g, '_')] = (item as any)[k];
      });
      const t = map['title'] || map['book'] || map['name'] || '';
      const a = map['author'] || (Array.isArray(map['authors']) ? map['authors'][0] : undefined);
      if (t && String(t).trim()) out.push({ title: String(t).trim(), author: a ? String(a) : undefined });
    }
    const seen = new Set<string>();
    const uniq = out.filter(s => {
      const k = s.title.toLowerCase();
      if (seen.has(k)) return false; seen.add(k); return true;
    });
    return uniq.slice(0, 3);
  }

  function normalizeSummary(raw: any): SummaryPayload | null {
    if (!raw || typeof raw !== 'object') return null;
    const m: any = {};
    Object.keys(raw).forEach(k => { m[k.toLowerCase().replace(/[-\s]/g, '_')] = (raw as any)[k]; });
    const summaryText = typeof m.summary === 'string' ? m.summary : '';
    const take = Array.isArray(m.readers_takeaway) ? m.readers_takeaway
      : (Array.isArray(m['reader_s_takeaway']) ? m['reader_s_takeaway'] : []);
    const rs = m.readers_suggestion ?? m['reader_s_suggestion'] ?? [];
    const sugg = normalizeSuggestions(rs);
    const treat = typeof m.readers_treat === 'string' ? m.readers_treat
      : (Array.isArray(m.readers_treat) ? m.readers_treat.join(' ') : '');
    if (!summaryText) return null;
    return { summary: summaryText, readers_takeaway: take, readers_suggestion: sugg, readers_treat: treat };
  }

  async function handleGenerate() {
    if (!selected) return;
    setHasGenerated(true);
    setLoadingSummary(true);
    setSummary(null);
    setSummaryError(null);

    const cacheKey = `${selected.title}::${(selected.authors || [])[0] || ''}::${summaryLang}`;
    const cached = summaryCache.get(cacheKey);
    if (cached) {
      setSummary(cached);
      setLoadingSummary(false);
      return;
    }

    abortSummaryRef.current?.abort();
    const ac = new AbortController();
    abortSummaryRef.current = ac;

    const body = {
      title: selected.title,
      authors: selected.authors,
      publishedDate: selected.publishedDate,
      description: selected.description,
      categories: selected.categories,
      desiredWords: DESIRED_WORDS,
      tolerance: TOLERANCE,
      language: summaryLang,
    };

    try {
      const sumRes = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ac.signal,
      });

      if (sumRes.ok) {
        let raw: any = null;
        try { raw = await sumRes.json(); } catch { /* ignore */ }
        if (raw && typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { /* ignore */ } }
        const normalized = normalizeSummary(raw);
        if (normalized) {
          setSummary(normalized);
          summaryCache.set(cacheKey, normalized);
        } else {
          setSummaryError('The summary came back in an unexpected format. Please try again.');
        }
      } else {
        if (sumRes.status !== 499) {
          setSummaryError((await sumRes.text()) || 'Summary service returned an error.');
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.error(e);
        setSummaryError('Request failed. Please check your connection and try again.');
      }
    } finally {
      setLoadingSummary(false);
    }
  }

  function cancelSummary() {
    abortSummaryRef.current?.abort();
    resetToHome();
  }

  function affiliateLinkForSelected(): string | null {
    if (!selected) return null;
    return amazonSearchUrl(selected.title, (selected.authors || [])[0]);
  }
  function affiliateLinkForSuggestion(s: Suggestion): string | null {
    return amazonSearchUrl(s.title, s.author);
  }

  const displayedBooks = useMemo(() => {
    if (hasGenerated && selected) return [selected];
    return books.slice(0, visibleCount);
  }, [hasGenerated, selected, books, visibleCount]);

  // anti-copy inside summary
  useEffect(() => {
    const el = summaryBlockRef.current;
    if (!el) return;
    const onCopy = (e: ClipboardEvent) => { e.preventDefault(); };
    const onCut = (e: ClipboardEvent) => { e.preventDefault(); };
    const onCtx = (e: MouseEvent) => { e.preventDefault(); };
    const onDrag = (e: DragEvent) => { e.preventDefault(); };
    el.addEventListener('copy', onCopy);
    el.addEventListener('cut', onCut);
    el.addEventListener('contextmenu', onCtx);
    el.addEventListener('dragstart', onDrag);
    return () => {
      el.removeEventListener('copy', onCopy);
      el.removeEventListener('cut', onCut);
      el.removeEventListener('contextmenu', onCtx);
      el.removeEventListener('dragstart', onDrag);
    };
  }, [summary]);

  async function sendFeedback(kind: 'up'|'down') {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ kind, book: selected, language: summaryLang, query }),
      });
      alert('Thanks for the feedback!');
    } catch {
      /* silent */
    }
  }

  function clickSuggestion(title: string) {
    setQuery(title);
    setSelected(null);
    setHasGenerated(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    void doSearch(title);
  }

  return (
    <>
      <Splash show={loadingSummary} onCancel={cancelSummary} />

      {/* Header */}
      <header className="trl-header">
        <div className="trl-header__inner">
          <div className="trl-logo">
            <Logo />
            <div className="trl-titles">
              <h1>{brand.name}</h1>
              <p>AI Book Summary Generator</p>
            </div>
          </div>
          <div className="trl-header__actions">
            <Button variant="outline" onClick={() => { if (typeof window !== 'undefined') window.location.reload(); }}>
              New Session
            </Button>
          </div>
        </div>
      </header>

      {/* SEO intro */}
      <section className="trl-hero-seo">
        <p>
          <strong>{brand.name}</strong> offers AI book summaries: Search any book or author and get a
          2,000-word crisp summary with bonus Reader&apos;s Takeaway and Reader&apos;s Suggestion.
        </p>
      </section>

      {/* Main */}
      <main className="trl-app">
        <div className="trl-container">

          {/* Search */}
          <Card className="p-4">
            <div className="trl-search">
              <Input
                lang="en"
                dir="auto"
                aria-label="Search books or authors"
                placeholder="Search by book or author (e.g., 'Sapiens' or 'Haruki Murakami')"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void doSearch(query); }}
              />
            </div>
            <div className="trl-search__row">
              <label className="trl-check">
                <input
                  type="checkbox"
                  checked={searchAllLangs}
                  onChange={(e)=>setSearchAllLangs(e.target.checked)}
                /> Search all languages (Default : English)
              </label>
            </div>
            <div className="trl-search__actions">
              <Button variant="search" onClick={() => void doSearch(query)} disabled={query.trim().length < 2 || loadingSearch}>
                SEARCH
              </Button>
            </div>
            <div className="trl-help">Top 5 suggestions appear below. Use the button to load 5 more.</div>
            {searchError && <div className="trl-error">{searchError}</div>}
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
              displayedBooks.map((b) => {
                const isSelected = selected?.id === b.id;
                return (
                  <Card key={b.id} className={`p-4 ${isSelected ? 'is-selected' : ''}`}>
                    <div className="trl-item">
                      <img src={b.thumbnail || 'https://placehold.co/128x192?text=No+Cover'} alt={b.title} className="trl-item__thumb" loading="lazy" />
                      <div className="trl-item__body">
                        <div className="trl-item__title">{b.title}</div>
                        <div className="trl-item__meta">{b.authors?.join(', ')}{b.publishedDate ? ' · ' + b.publishedDate : ''}</div>
                        <div className="trl-item__desc">{(b.description || '').slice(0, 150)}{(b.description || '').length > 150 ? '…' : ''}</div>
                        <div className="trl-item__actions">
                          {!isSelected && !hasGenerated && (
                            <Button onClick={() => { setSelected(b); }}>
                              Select
                            </Button>
                          )}
                          {isSelected && !hasGenerated && (
                            <Button variant="outline" onClick={() => void handleGenerate()} disabled={loadingSummary}>
                              {loadingSummary ? 'Generating…' : 'Generate Summary'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {!hasGenerated && books.length > visibleCount && (
            <div className="trl-center">
              <Button variant="outline" onClick={() => setVisibleCount((c) => Math.min(c + 5, books.length))}>
                Load 5 more
              </Button>
            </div>
          )}

          {/* Output */}
          {selected && (
            <div className="trl-out" dir={isRtl ? 'rtl' : 'ltr'}>
              {/* Visual placeholder */}
              <Card className="trl-visual">
                <div className="trl-visual__frame">
                  <div className="trl-visual__ph" />
                  <div className="trl-visual__content">
                    {false ? (
                      <div className="trl-visual__loading">Preparing…</div>
                    ) : (
                      <div className="trl-visual__coming">
                        <div className="big">Coming Soon</div>
                        <div>Excellent Cover Images from {brand.name} are under prep.</div>
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
                  <div className="trl-lang">
                    <label>Summary language:</label>
                    <select value={summaryLang} onChange={(e)=>setSummaryLang(e.target.value)}>
                      {SUMMARY_LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                    </select>
                  </div>

                  <div className="trl-bar-actions">
                    {!loadingSummary ? (
                      <Button onClick={() => void handleGenerate()}>{hasGenerated ? 'Regenerate' : 'Generate'}</Button>
                    ) : (
                      <Button variant="cancel" onClick={cancelSummary}>Cancel Request</Button>
                    )}
                  </div>

                  {/* Buy on [Amazon logo] */}
                  {affiliateLinkForSelected() && (
                    <a className="trl-cta" href={affiliateLinkForSelected()!} target="_blank" rel="nofollow noopener" aria-label="Buy on Amazon" title="Buy on Amazon">
                      <span className="buyon">Buy on</span>
                      <img src="/amazon.svg" alt="Amazon" width={60} height={18} />
                    </a>
                  )}

                  <div className="trl-target">Target: ~{DESIRED_WORDS} words • 3 paragraphs</div>
                </div>

                {summaryError && <div className="trl-error">{summaryError}</div>}

                {!summary && !loadingSummary && (
                  <div className="trl-summary__hint">
                    Choose a language and click Generate to create a 3‑paragraph (~2,000 words) summary with Takeaways, Reader’s Treat & Suggestions.
                  </div>
                )}

                {summary && (
                  <div
                    ref={summaryBlockRef}
                    className="trl-prose no-copy"
                    onCopy={(e)=>e.preventDefault()}
                    onCut={(e)=>e.preventDefault()}
                    onContextMenu={(e)=>e.preventDefault()}
                    onDragStart={(e)=>e.preventDefault()}
                  >
                    <h2>Summary</h2>
                    <ReactMarkdown>{summary.summary}</ReactMarkdown>

                    {summary.readers_treat ? (
                      <>
                        <h3>Reader&apos;s Treat</h3>
                        <p style={{marginTop: '-4px'}}>{summary.readers_treat}</p>
                      </>
                    ) : null}

                    <h3>Reader&apos;s Takeaway</h3>
                    <ul>{summary.readers_takeaway?.map((t, i) => <li key={i}>{t}</li>)}</ul>

                    <h3>Reader&apos;s Suggestion</h3>
                    <ul>
                      {(summary.readers_suggestion || []).slice(0,3).map((s, i) => {
                        const url = affiliateLinkForSuggestion(s);
                        return (
                          <li key={i}>
                            <button className="linklike" onClick={() => clickSuggestion(s.title)}>
                              <span className="emph">{s.title}</span>
                            </button>
                            {s.author ? <> by {s.author}</> : null}
                            {url && <> — <a href={url} target="_blank" rel="nofollow noopener">Buy</a></>}
                          </li>
                        );
                      })}
                    </ul>

                    <div className="trl-feedback">
                      <span>Was this helpful?</span>
                      <button className="thumb up" aria-label="Thumbs up" onClick={() => void sendFeedback('up')}>👍</button>
                      <button className="thumb down" aria-label="Thumbs down" onClick={() => void sendFeedback('down')}>👎</button>
                    </div>

                    <div className="trl-disclaimer">
                      Disclaimer: Summaries are generated by AI for reading inspiration. We do not reproduce the original book’s text or exact cover artwork. Please verify critical facts with the book itself. © Respective rights holders.
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          <div className="trl-footer">Built for <b>{brand.name}</b>. Summaries are AI-generated; verify critical facts.</div>
        </div>
      </main>

      {/* DESIGN SYSTEM */}
      <style jsx global>{`
        :root{
          --bg: #F4FBFE; --card: #FFFFFF; --ink: #0D1B22; --muted: #4B5563; --line: #E4F2F6;
          --brand-400:#67E8F9; --brand-500:#22D3EE; --brand-600:#06B6D4; --brand-700:#0891B2; --brand-800:#0E7490;
        }
        html,body{ margin:0; padding:0; background: var(--bg); color: var(--ink); font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"; }

        .trl-header{ position:sticky; top:0; z-index:40; background:rgba(255,255,255,0.9); backdrop-filter:saturate(180%) blur(12px); border-bottom:1px solid var(--line); box-shadow: 0 8px 22px rgba(0, 128, 149, 0.10); }
        .trl-header__inner{ max-width:1100px; margin:0 auto; padding:14px 16px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .trl-logo{ display:flex; align-items:center; gap:12px; }
        .trl-logo img{ height:32px; width:auto; display:block; }
        .trl-titles h1{ margin:0; font-weight:800; color:var(--brand-800); font-size: clamp(18px, 2.5vw, 24px); line-height:1.1; }
        .trl-titles p{ margin:2px 0 0; color:var(--muted); font-size: clamp(12px, 1.8vw, 13px); }

        .trl-hero-seo { max-width:1100px; margin:18px auto 0; padding:0 16px; }
        .trl-hero-seo p { margin:8px 0 0; color:#334155; font-size:14px; line-height:1.5; }

        .trl-app{ min-height:100vh; background: linear-gradient(180deg, var(--bg) 0%, #fff 60%); }
        .trl-container{ max-width:1100px; margin:0 auto; padding: 24px 16px 80px; }
        .trl-center{ display:flex; justify-content:center; margin-top:16px; }

        .p-4{ padding:14px; }
        .trl-btn{ border-radius:14px; padding:10px 14px; font-size:14px; font-weight:700; border:1px solid transparent; cursor:pointer; transition: transform .03s ease, box-shadow .2s ease; }
        .trl-btn:active{ transform: translateY(1px); }
        .trl-btn.is-disabled{ opacity:.6; cursor:not-allowed; }
        .trl-btn--primary{ background: var(--brand-600); color:#fff; }
        .trl-btn--primary:hover{ background: var(--brand-700); }
        .trl-btn--outline{ background:#fff; color: var(--brand-700); border-color: var(--brand-600); }
        .trl-btn--outline:hover{ background:#ECFDFF; }
        .trl-btn--ghost{ background:transparent; color: var(--brand-700); }
        .trl-btn--danger{ background: #ef4444; color:#fff; }
        .trl-btn--danger:hover{ background:#dc2626; }
        .trl-btn--cancel{ background:#ECFDFF; color: var(--brand-800); border-color: var(--brand-500); }
        .trl-btn--cancel:hover{ background:#DDF8FF; }
        .trl-btn--search{ background:#fff; color: var(--brand-800); border-color: var(--brand-700); border-width:2px; letter-spacing:.3px; padding:12px 18px; }
        .trl-btn--search:hover{ background:#ECFDFF; }

        .trl-input{ width:80%; border:1px solid var(--line); border-radius:14px; padding:12px 14px; font-size:14px; outline:none; }
        .trl-input:focus{ border-color: var(--brand-500); box-shadow: 0 0 0 3px rgba(6,182,212,.16); }

        .trl-card{ background: var(--card); border:1px solid var(--line); border-radius:16px; box-shadow: 0 1px 2px rgba(0,0,0,.03); }
        .trl-card.is-selected{ box-shadow: 0 0 0 2px var(--brand-400) inset; border-color: var(--brand-400); }

        .trl-search{ display:flex; align-items:center; justify-content:center; gap:12px; padding-top:10px; padding-bottom:12px; }
        .trl-search__row{ margin-top:8px; display:flex; justify-content:center; }
        .trl-check{ font-size:13px; color: var(--muted); user-select:none; }
        .trl-search__actions{ display:flex; justify-content:center; margin-top:12px; }
        .trl-help{ margin-top:8px; font-size:12px; color:var(--muted); text-align:center; }
        .trl-error{ margin-top:10px; font-size:13px; color:#B91C1C; background:#FEF2F2; border:1px solid #FECACA; padding:10px 12px; border-radius:12px; }

        .trl-grid{ display:grid; grid-template-columns: 1fr; gap:10px; margin-top:16px; }
        @media (min-width: 768px){ .trl-grid{ grid-template-columns: 1fr 1fr; } }

        .trl-skel{ display:flex; gap:12px; }
        .trl-skel__thumb{ width:80px; height:120px; border-radius:10px; background:#E8F8FC; }
        .trl-skel__text{ flex:1; }
        .trl-skel__line{ height:10px; background:#E8F8FC; border-radius:6px; margin-bottom:8px; }
        .trl-skel__line.w1{ width:100%; } .trl-skel__line.w2{ width:70%; } .trl-skel__line.w3{ width:50%; }

        .trl-item{ display:flex; gap:14px; }
        .trl-item__thumb{ width:80px; height:112px; object-fit:cover; border-radius:10px; background:#E6FAFD; }
        .trl-item__body{ flex:1; }
        .trl-item__title{ font-weight:700; font-size:16px; color: var(--ink); }
        .trl-item__meta{ font-size:13px; color: var(--muted); margin:2px 0 8px; }
        .trl-item__desc{ font-size:14px; color: var(--ink); opacity:.85; }
        .trl-item__actions{ display:flex; gap:8px; margin-top:10px; }

        .trl-out{ display:grid; grid-template-columns: 1fr; gap:16px; margin-top:24px; }
        @media (min-width: 900px){ .trl-out{ grid-template-columns: 1fr 2fr; } }

        .trl-visual__frame{ position:relative; }
        .trl-visual__ph{ padding-top:150%; background:#E6F7FB; }
        .trl-visual__content{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; padding:12px; text-align:center; }
        .trl-visual__coming .big{ font-size:18px; font-weight:800; color:var(--brand-800); }
        .trl-visual__loading{ color:var(--brand-800); font-size:12px; }
        .trl-visual__meta{ padding:12px 14px; }
        .trl-visual__meta .ttl{ font-weight:700; font-size:15px; }
        .trl-visual__meta .meta{ font-size:12px; color:var(--muted); }
        .trl-visual__meta .cats{ margin-top:6px; font-size:12px; color:var(--muted); }

        .trl-summary{ padding:14px; }
        .trl-summary__bar{ display:grid; grid-template-columns: auto 1fr auto; align-items:center; gap:10px; margin-bottom:12px; }
        .trl-lang{ display:flex; align-items:center; gap:8px; font-size:13px; color: var(--muted); }
        .trl-lang select{ border:1px solid var(--line); border-radius:10px; padding:6px 8px; }
        .trl-bar-actions{ display:flex; gap:8px; }
        .trl-cta{ justify-self:end; display:inline-flex; align-items:center; gap:6px; background: #fff; color:var(--brand-800); text-decoration:none; font-weight:800; padding:8px 12px; border-radius:12px; border:2px solid var(--brand-700); }
        .trl-cta .buyon{ font-weight:700; }
        .trl-cta:hover{ background:#ECFDFF; }
        .trl-target{ grid-column: 1 / -1; font-size:12px; color:var(--muted); }

        .trl-summary__hint{ color:var(--muted); font-size:14px; }

        .trl-prose h2{ margin:16px 0 8px; font-size: clamp(18px, 3.2vw, 20px); color: var(--brand-800); font-weight:800; }
        .trl-prose h3{ margin:14px 0 6px; font-size: clamp(15px, 2.6vw, 16px); color: var(--brand-800); font-weight:700; }
        .trl-prose p, .trl-prose li{ font-size:15px; line-height:1.7; }
        .trl-prose p{ text-align: justify; text-justify: inter-word; hyphens: auto; }
        .trl-prose ul{ padding-left: 20px; }
        .trl-prose .emph{ font-style:italic; font-weight:600; }
        .linklike{ background:none; border:none; padding:0; margin:0; color:var(--brand-700); text-decoration:underline; cursor:pointer; }

        .trl-feedback{ margin-top:14px; display:flex; align-items:center; gap:8px; font-size:13px; color:var(--muted); }
        .trl-feedback .thumb{ border:1px solid var(--line); background:#fff; border-radius:10px; padding:6px 10px; cursor:pointer; }
        .trl-feedback .thumb:hover{ background:#ECFDFF; }

        .trl-aff a{ color: var(--brand-700); text-decoration: underline; }
        .trl-disclaimer{ margin-top:18px; font-size:12px; color:var(--muted); background:#F8FAFC; border:1px solid #EEF2F7; padding:10px 12px; border-radius:12px; }

        .no-copy { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; -webkit-touch-callout: none; }

        .trl-footer{ text-align:center; font-size:12px; color:var(--muted); margin-top:28px; }

        .trl-splash{ position:fixed; inset:0; z-index:60; display:grid; place-items:center; background:rgba(255,255,255,.9); backdrop-filter: blur(6px); }
        .trl-splash__box{ display:flex; flex-direction:column; align-items:center; gap:12px; }
        .trl-splash__logo{ height:80px; width:auto; filter: drop-shadow(0 2px 6px rgba(0,0,0,.08)); }
        .trl-splash__text{ font-size:12px; color:var(--brand-800); }
        .trl-progress{ height:8px; width:220px; background:#E6F7FB; border-radius:99px; overflow:hidden; }
        .trl-progress__bar{ height:100%; width:33%; background: var(--brand-600); animation: trlbar 1.2s linear infinite; }
        @keyframes trlbar{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}
      `}</style>
    </>
  );
}
