'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES } from '../data/books';

interface CategoryCardsProps {
  onBookSelect?: (bookTitle: string) => void;
}

/* ---------------- Component ---------------- */
export default function CategoryCards({ onBookSelect }: CategoryCardsProps = {}) {
  const router = useRouter();

  const handleCardClick = (slug: string) => {
    router.push(`/${slug}`);
  };

  return (
    <div className="trl-categories">
      <h2 className="trl-categories-heading">Explore Book Categories</h2>
      <div className="trl-category-cards">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            className="trl-category-card"
            onClick={() => handleCardClick(category.slug)}
          >
            <div className="trl-category-card-content">
              <div className="trl-category-tags">
                {category.tags.map((tag, index) => (
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
              <h3>{category.title}</h3>
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
          aspect-ratio: 5 / 2;
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
          width: 100%;
        }
        .trl-category-tags {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-bottom: 16px;
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
        .trl-category-card h3 {
          font-size: 20px;
          font-weight: 800;
          color: #4c9c95;
          margin: 0;
          line-height: 1.3;
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
