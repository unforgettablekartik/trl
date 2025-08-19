import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.readerslawn.com'),
  title: {
    default: "The Reader's Lawn — AI Book Summary Generator",
    template: "%s · The Reader's Lawn",
  },
  description:
    "Search a book or author, pick a result, and get a 1000-word AI summary with Reader’s Takeaway and similar book suggestions.",
  openGraph: {
    type: 'website',
    url: '/',
    siteName: "The Reader's Lawn",
    title: "The Reader's Lawn — AI Book Summary Generator",
    description:
      "Search a book or author, pick a result, and get a 1000-word AI summary with Reader’s Takeaway and similar book suggestions.",
    images: [
      {
        url: '/og-readerslawn.png', // served as https://www.readerslawn.com/og-readerslawn.png
        width: 1200,
        height: 630,
        alt: "The Reader's Lawn",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "The Reader's Lawn — AI Book Summary Generator",
    description:
      "Search a book or author, pick a result, and get a 1000-word AI summary with Reader’s Takeaway and similar book suggestions.",
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
  alternates: { canonical: '/' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
