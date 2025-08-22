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

/* ---------- Amazon affiliate helpers ---------- */
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

/* ---------- Caches ---------- */
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

/* ---------- UI Components ---------- */
function Splash({ show, onCancel }: { show: boolean; onCancel: () => void }) {
  if (!show) return null;
  return (
    <div className="trl-splash">
      <div className="trl-splash__box">
        <p className="trl-splash__text">Crafting your summary…</p>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function TRLBookSummaryGenerator() {
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<BookLite[]>([]);
  const [selected, setSelected] = useState<BookLite | null>(null);

  function affiliateLinkForSelected(): string | null {
    if (!selected) return null;
    return amazonSearchUrl(selected.title, (selected.authors || [])[0]);
  }

  return (
    <>
      {/* Example output */}
      {selected && (
        <div className="trl-out">
          <div className="trl-summary__bar">
            {/* Amazon pill CTA */}
            {affiliateLinkForSelected() && (
              <div className="trl-bar-center">
                <a
                  className="trl-cta cta-amz"
                  href={affiliateLinkForSelected()!}
                  target="_blank"
                  rel="nofollow noopener"
                  aria-label="Buy on Amazon"
                  title="Buy on Amazon"
                >
                  <div className="buyon-text">Buy on</div>
                  <img src="/amazon-logo.png" alt="Amazon" className="amazon-logo" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        .trl-bar-center {
          display: flex;
          justify-content: center;
          align-items: center;
          flex: 1;
        }
        .trl-cta {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #fff;
          border: 1px solid var(--brand-600);
          border-radius: 9999px; /* pill shape */
          text-decoration: none;
          padding: 6px 14px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          transition: background 0.2s ease, transform 0.1s ease;
        }
        .trl-cta:hover {
          background: #F0FDFF;
          transform: translateY(-1px);
        }
        .buyon-text {
          font-size: 12px;
          font-weight: 600;
          color: var(--brand-800);
          margin-bottom: 3px;
          text-align: center;
        }
        .amazon-logo {
          height: 20px;
          width: auto;
          display: block;
        }
      `}</style>
    </>
  );
}
