'use client';

import React, { useEffect, useRef, useState } from 'react';

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

export default function TRLBookSummaryGenerator() {
  const [selected, setSelected] = useState<BookLite | null>(null);

  function affiliateLinkForSelected(): string | null {
    if (!selected) return null;
    return amazonSearchUrl(selected.title, (selected.authors || [])[0]);
  }

  return (
    <>
      {selected && (
        <div className="trl-out">
          <div className="trl-summary__bar">
            {/* Amazon CTA: Bold text only */}
            {affiliateLinkForSelected() && (
              <div className="trl-bar-center">
                <a
                  className="trl-cta-text"
                  href={affiliateLinkForSelected()!}
                  target="_blank"
                  rel="nofollow noopener"
                  aria-label="Buy on Amazon"
                  title="Buy on Amazon"
                >
                  Buy on Amazon
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
        .trl-cta-text {
          font-size: 14px;
          font-weight: 700;
          color: var(--brand-700); /* matches palette */
          text-decoration: none;
          padding: 6px 14px;
          border: 1px solid var(--brand-600);
          border-radius: 9999px; /* pill style */
          transition: background 0.2s ease, transform 0.1s ease;
        }
        .trl-cta-text:hover {
          background: #F0FDFF;
          transform: translateY(-1px);
        }
      `}</style>
    </>
  );
}
