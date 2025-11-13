'use client';

import React, { useState } from 'react';

/* ---------------- Types ---------------- */
interface Book {
  id: string;
  title: string;
}

interface Category {
  id: string;
  title: string;
  books: Book[];
}

/* ---------------- Stub Data ---------------- */
const CATEGORIES: Category[] = [
  {
    id: 'self-help',
    title: '100 Best Self-Help Books Summarized for Success',
    books: Array.from({ length: 100 }, (_, i) => ({
      id: `self-help-${i + 1}`,
      title: `Self-Help Book ${i + 1}`,
    })),
  },
  {
    id: 'wealth',
    title: 'Top-100 Best Book Summaries to Get Rich',
    books: Array.from({ length: 100 }, (_, i) => ({
      id: `wealth-${i + 1}`,
      title: `Wealth Book ${i + 1}`,
    })),
  },
  {
    id: 'entrepreneurship',
    title: 'Best Book Summaries on Entrepreneurship',
    books: Array.from({ length: 100 }, (_, i) => ({
      id: `entrepreneurship-${i + 1}`,
      title: `Entrepreneurship Book ${i + 1}`,
    })),
  },
];

/* ---------------- Component ---------------- */
export default function CategoryCards() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const handleCardClick = (category: Category) => {
    setSelectedCategory(category);
  };

  const handleBackClick = () => {
    setSelectedCategory(null);
  };

  const handleBookClick = (book: Book) => {
    // Placeholder function for book summary navigation
    console.log('Navigate to book summary:', book.title);
    alert(`Book summary for "${book.title}" - Coming soon!`);
  };

  if (selectedCategory) {
    return (
      <div className="trl-category-view">
        <div className="trl-category-header">
          <button className="trl-back-btn" onClick={handleBackClick}>
            ← Back
          </button>
          <h2 className="trl-category-title">{selectedCategory.title}</h2>
        </div>
        <div className="trl-books-grid">
          {selectedCategory.books.map((book) => (
            <button
              key={book.id}
              className="trl-book-item"
              onClick={() => handleBookClick(book)}
            >
              {book.title}
            </button>
          ))}
        </div>

        <style jsx>{`
          .trl-category-view {
            margin-top: 32px;
          }
          .trl-category-header {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 24px;
          }
          .trl-back-btn {
            background: var(--brand-600);
            color: white;
            border: none;
            padding: 10px 16px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: background 0.2s ease;
          }
          .trl-back-btn:hover {
            background: var(--brand-700);
          }
          .trl-category-title {
            font-size: 24px;
            font-weight: 800;
            color: var(--brand-800);
            margin: 0;
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
            padding: 16px;
            text-align: left;
            font-size: 15px;
            font-weight: 600;
            color: var(--ink);
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .trl-book-item:hover {
            background: #ECFDFF;
            border-color: var(--brand-500);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(6, 182, 212, 0.15);
          }
          @media (max-width: 768px) {
            .trl-category-header {
              flex-direction: column;
              align-items: flex-start;
            }
            .trl-category-title {
              font-size: 20px;
            }
            .trl-books-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="trl-categories">
      <h2 className="trl-categories-heading">Explore Book Categories</h2>
      <div className="trl-category-cards">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            className="trl-category-card"
            onClick={() => handleCardClick(category)}
          >
            <div className="trl-category-card-content">
              <h3>{category.title}</h3>
              <p>{category.books.length} books available</p>
            </div>
          </button>
        ))}
      </div>

      <style jsx>{`
        .trl-categories {
          margin-top: 48px;
        }
        .trl-categories-heading {
          font-size: 28px;
          font-weight: 800;
          color: var(--brand-800);
          text-align: center;
          margin: 0 0 32px;
        }
        .trl-category-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          max-width: 1100px;
          margin: 0 auto;
        }
        @media (min-width: 768px) {
          .trl-category-cards {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .trl-category-card {
          background: white;
          border: 2px solid var(--line);
          border-radius: 16px;
          padding: 0;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .trl-category-card:hover {
          border-color: var(--brand-500);
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(6, 182, 212, 0.2);
        }
        .trl-category-card-content {
          padding: 24px;
          text-align: center;
        }
        .trl-category-card h3 {
          font-size: 20px;
          font-weight: 800;
          color: var(--brand-800);
          margin: 0 0 12px;
          line-height: 1.3;
        }
        .trl-category-card p {
          font-size: 14px;
          color: var(--muted);
          margin: 0;
          font-weight: 600;
        }
        @media (max-width: 768px) {
          .trl-categories-heading {
            font-size: 22px;
          }
          .trl-category-cards {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .trl-category-card h3 {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
}
