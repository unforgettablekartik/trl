import { Analytics } from "@vercel/analytics/next"

import type { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.readerslawn.com'),
  title: {
    default: "The Reader’s Lawn — AI Book Summary Generator",
    template: "%s · The Reader’s Lawn",
  },
  // Keep this ~150–160 chars and make it match brand queries.
  description:
    "The Reader’s Lawn — AI book summaries. Search any book or author and get a 3-paragraph (~2,000 words) summary with Reader’s Takeaway and three similar books.",
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: "The Reader’s Lawn",
    title: "The Reader’s Lawn — AI Book Summary Generator",
    description:
      "Search any book or author and get a 3-paragraph (~2,000 words) summary with Reader’s Takeaway and three similar books.",
    images: [{ url: '/og-readerslawn.png', width: 1200, height: 630, alt: "The Reader’s Lawn" }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "The Reader’s Lawn — AI Book Summary Generator",
    description:
      "Search any book or author and get a 3-paragraph (~2,000 words) summary with Reader’s Takeaway and three similar books.",
    images: ['/og-readerslawn.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // JSON-LD: WebSite + Organization, with alternate names to match brand variants
  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "The Reader’s Lawn",
    "url": "https://www.readerslawn.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://www.readerslawn.com/?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "The Reader’s Lawn",
    "alternateName": ["Reader's Lawn", "Readers Lawn", "The Readers Lawn"],
    "url": "https://www.readerslawn.com",
    "logo": "https://www.readerslawn.com/og-readerslawn.png",
    // Optional: add your live socials when you have them
    "sameAs": []
  };

  return (
    <html lang="en">
      <head>
        {/* Explicit robots snippet allowances (optional but nice) */}
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
        {/* Redundant explicit meta description to match brand query */}
        <meta
          name="description"
          content="The Reader’s Lawn — AI book summaries. Search any book or author and get a 3-paragraph (~2,000 words) summary with Reader’s Takeaway and three similar books."
        />
      </head>
      <body>
        {children}
        <Script id="ld-website" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify(websiteLd)}
        </Script>
        <Script id="ld-org" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify(orgLd)}
        </Script>
      </body>
    </html>
  );
}
