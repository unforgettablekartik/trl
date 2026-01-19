'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

/* ---------------- Types ---------------- */
interface Book {
  id: string;
  title: string;
  authors?: string[];
  thumbnail?: string;
}

interface CategoryPageProps {
  categoryId: string;
  categoryTitle: string;
  books: Book[];
  tags: { text: string; color: string }[];
  onBookSelect?: (bookTitle: string) => void;
}

/* ---------------- Component ---------------- */
export default function CategoryPage({ 
  categoryId, 
  categoryTitle, 
  books: initialBooks, 
  tags,
  onBookSelect 
}: CategoryPageProps) {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Generate an inline SVG placeholder
  const generateSVGPlaceholder = (title: string): string => {
    // Sanitize title to prevent any potential issues
    const sanitizedTitle = title.replace(/[<>&"']/g, '').slice(0, 20);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="180" viewBox="0 0 120 180">
      <rect width="120" height="180" fill="#E6FAFD"/>
      <text x="50%" y="50%" text-anchor="middle" dy="0.3em" fill="#06B6D4" font-family="Arial, sans-serif" font-size="10" font-weight="bold">
        <tspan x="50%" dy="0">${sanitizedTitle.slice(0, 10)}</tspan>
        ${sanitizedTitle.length > 10 ? `<tspan x="50%" dy="1.2em">${sanitizedTitle.slice(10)}</tspan>` : ''}
      </text>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  // Fetch book covers from Google Books API with fallback to placeholders
  const fetchBookCovers = async (booksToFetch: Book[]): Promise<Book[]> => {
    const booksWithCovers = await Promise.all(
      booksToFetch.map(async (book) => {
        try {
          const response = await fetch(
            `/api/books?q=${encodeURIComponent(book.title)}&maxResults=1`,
            { signal: AbortSignal.timeout(3000) }
          );
          if (response.ok) {
            const data = await response.json();
            if (data.items && data.items.length > 0) {
              const volumeInfo = data.items[0].volumeInfo;
              const thumbnail = volumeInfo?.imageLinks?.thumbnail || volumeInfo?.imageLinks?.smallThumbnail || '';
              if (thumbnail) {
                return {
                  ...book,
                  thumbnail: thumbnail.replace(/^http:/, 'https:'),
                  authors: volumeInfo?.authors || book.authors
                };
              }
            }
          }
        } catch (error) {
          // Silently fail and use placeholder
        }
        return {
          ...book,
          thumbnail: generateSVGPlaceholder(book.title)
        };
      })
    );
    
    return booksWithCovers;
  };

  // Fetch book covers on mount
  useEffect(() => {
    const loadBooks = async () => {
      setLoading(true);
      const booksWithCovers = await fetchBookCovers(initialBooks);
      setBooks(booksWithCovers);
      setLoading(false);
    };
    loadBooks();
  }, []);

  const handleBackClick = () => {
    router.push('/');
  };

  const handleBookClick = (book: Book) => {
    // Navigate back to homepage with book title to trigger summary
    router.push(`/?book=${encodeURIComponent(book.title)}`);
  };

  // Filter books based on search query
  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return books;
    
    const lowerQuery = searchQuery.toLowerCase();
    return books.filter((book) => 
      book.title.toLowerCase().includes(lowerQuery) ||
      book.authors?.some((author) => author.toLowerCase().includes(lowerQuery))
    );
  }, [books, searchQuery]);

  return (
    <>
      <header className="trl-header">
        <div className="trl-header__inner">
          <div className="trl-logo" onClick={() => { window.location.href = '/'; }} style={{ cursor: 'pointer' }}>
            <img 
              src="/trl-logo.png" 
              alt="The Reader's Lawn Logo" 
              style={{ height: '32px', width: 'auto', display: 'block' }}
            />
            <div className="trl-titles">
              <h1>The Reader's Lawn®</h1>
              <p>Generate the Best Book Summaries Online</p>
            </div>
          </div>
          <div className="trl-header__actions">
            <button className="trl-btn trl-btn--outline" onClick={handleBackClick}>
              ← Back to Home
            </button>
          </div>
        </div>
      </header>

      <main className="trl-app">
        <div className="trl-container">
          <div className="trl-category-view">
            <div className="trl-category-header">
              <div className="trl-category-tags">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="trl-tag"
                    style={{
                      color: tag.color,
                      borderColor: tag.color
                    }}
                  >
                    {tag.text}
                  </span>
                ))}
              </div>
              <h2 className="trl-category-title">{categoryTitle}</h2>
              <div className="trl-search-wrapper">
                <input
                  type="text"
                  className="trl-book-search"
                  placeholder="Search books in this category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="trl-loading">Loading book collection...</div>
            ) : filteredBooks.length > 0 ? (
              <div className="trl-books-grid">
                {filteredBooks.map((book) => (
                  <button
                    key={book.id}
                    className="trl-book-item"
                    onClick={() => handleBookClick(book)}
                  >
                    {book.thumbnail && (
                      <img 
                        src={book.thumbnail} 
                        alt={book.title}
                        className="book-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="book-info">
                      <div className="book-title">{book.title}</div>
                      {book.authors && book.authors.length > 0 && (
                        <div className="book-authors">{book.authors.join(', ')}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="trl-no-results">
                {searchQuery ? `No books found for "${searchQuery}"` : 'No books available'}
              </div>
            )}
          </div>

          <div className="trl-footer">
            Built for <b>The Reader's Lawn</b>. Click any book to generate an instant AI summary.
          </div>
        </div>
      </main>

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
        .trl-titles h1{ margin:0; font-weight:800; color:#266967; font-size: clamp(18px, 2.5vw, 24px); line-height:1.1; }
        .trl-titles p{ margin:2px 0 0; color:#adcac8; font-size: clamp(12px, 1.8vw, 13px); }
        .trl-header__actions .trl-btn{ border-radius:14px; padding:10px 14px; font-size:14px; font-weight:700; border:1px solid transparent; cursor:pointer; transition: transform .03s ease, box-shadow .2s ease; }
        .trl-btn--outline{ background:#fff; color: var(--brand-700); border-color: var(--brand-600); }
        .trl-btn--outline:hover{ background:#ECFDFF; }

        .trl-app{ min-height:100vh; background: linear-gradient(180deg, var(--bg) 0%, #fff 60%); }
        .trl-container{ max-width:1100px; margin:0 auto; padding: 24px 16px 80px; }

        .trl-category-view {
          margin-top: 32px;
        }
        .trl-category-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
        }
        .trl-category-tags {
          display: flex;
          gap: 8px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .trl-tag {
          display: inline-block;
          padding: 6px 12px;
          border: 2px solid;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }
        .trl-category-title {
          font-size: 28px;
          font-weight: 800;
          color: var(--brand-800);
          margin: 0;
          text-align: center;
        }
        .trl-search-wrapper {
          width: 100%;
          max-width: 400px;
        }
        .trl-book-search {
          width: 100%;
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
        }
        .trl-book-search:focus {
          border-color: var(--brand-500);
          box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.16);
        }
        .trl-loading {
          text-align: center;
          padding: 48px 24px;
          color: var(--muted);
          font-size: 16px;
        }
        .trl-books-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }
        .trl-book-item {
          background: white;
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 12px;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .trl-book-item .book-cover {
          width: 60px;
          height: 90px;
          object-fit: cover;
          border-radius: 6px;
          flex-shrink: 0;
          background: #E6FAFD;
        }
        .trl-book-item .book-info {
          flex: 1;
          min-width: 0;
        }
        .trl-book-item .book-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--ink);
          margin-bottom: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .trl-book-item .book-authors {
          font-size: 13px;
          color: var(--muted);
          font-weight: 400;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .trl-book-item:hover {
          background: #ECFDFF;
          border-color: var(--brand-500);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(6, 182, 212, 0.15);
        }
        .trl-no-results {
          text-align: center;
          padding: 48px 24px;
          color: var(--muted);
          font-size: 16px;
        }
        .trl-footer{ text-align:center; font-size:12px; color:var(--muted); margin-top:28px; }

        @media (max-width: 768px) {
          .trl-category-title {
            font-size: 22px;
          }
          .trl-books-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
