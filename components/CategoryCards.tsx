'use client';

import React, { useState, useEffect, useMemo } from 'react';

/* ---------------- Types ---------------- */
interface Book {
  id: string;
  title: string;
  authors?: string[];
  thumbnail?: string;
}

interface Category {
  id: string;
  title: string;
  books: Book[];
  tags: { text: string; color: string }[];
}

interface CategoryCardsProps {
  onBookSelect?: (bookTitle: string) => void;
}

/* ---------------- Curated Book Data ---------------- */
const SELF_HELP_BOOKS = [
  'The 7 Habits of Highly Effective People', 'How to Win Friends and Influence People', 'Think and Grow Rich',
  'Atomic Habits', 'The Power of Positive Thinking', 'Man\'s Search for Meaning', 'The Alchemist',
  'Mindset: The New Psychology of Success', 'The Four Agreements', 'You Are a Badass',
  'The Subtle Art of Not Giving a F*ck', 'Daring Greatly', 'The Power of Now', 'Awaken the Giant Within',
  'The Magic of Thinking Big', 'Rich Dad Poor Dad', 'The Miracle Morning', 'Grit: The Power of Passion',
  'The Life-Changing Magic of Tidying Up', 'Start With Why', 'The 5 Love Languages', 'Feeling Good',
  'The Happiness Project', 'The Compound Effect', 'Drive: The Surprising Truth', 'Deep Work',
  'Essentialism: The Disciplined Pursuit', 'The One Thing', 'Who Moved My Cheese?', 'Good Vibes Good Life',
  'Can\'t Hurt Me', 'The Gifts of Imperfection', 'Big Magic', 'The Power of Habit', 'Radical Acceptance',
  'The Untethered Soul', 'The War of Art', 'Mindfulness in Plain English', 'Man Up', 'The Road Less Traveled',
  'The Art of Happiness', 'The Courage to Be Disliked', 'The Six Pillars of Self-Esteem', 'Feel the Fear',
  'The Success Principles', 'Learned Optimism', 'Flow: The Psychology of Optimal', 'The Biology of Belief',
  'The Purpose Driven Life', 'Ikigai: The Japanese Secret', 'The Obstacle Is the Way', 'Extreme Ownership',
  'No Excuses!', 'The Total Money Makeover', 'Unfu*k Yourself', 'Everything Is Figureoutable', 'The Gap and The Gain',
  'The Mountain Is You', 'Year of Yes', 'Attached', 'Boundaries', 'Boundaries Updated', 'The Body Keeps the Score',
  'When Things Fall Apart', 'Rising Strong', 'The Last Lecture', 'Tuesdays with Morrie', 'The Celestine Prophecy',
  'The Four Hour Workweek', 'Way of the Peaceful Warrior', 'The Secret', 'Ask and It Is Given', 'Secrets of the Millionaire Mind',
  'Breaking the Habit of Being Yourself', 'The Energy Bus', 'Love Yourself Like Your Life', 'The Confidence Gap',
  'Make Your Bed', 'The Power of Positive Leadership', 'The Chimp Paradox', 'The Life You Were Born to Live',
  'The Artist\'s Way', 'Start Where You Are', 'Maybe You Should Talk to Someone', 'Designing Your Life',
  'The Defining Decade', 'The Upside of Stress', 'Presence: Bringing Your Boldest', 'Option B',
  'Solve for Happy', 'Love For Imperfect Things', 'How to Stop Worrying', 'The Slight Edge',
  'The Champion\'s Mind', 'Change Your Brain Change Your Life', 'The Paradox of Choice', 'Switch: How to Change',
  'The Power of Vulnerability', 'Ego Is the Enemy', 'Stillness Is the Key', 'The Daily Stoic'
];

const WEALTH_BOOKS = [
  'Rich Dad Poor Dad', 'Think and Grow Rich', 'The Millionaire Next Door', 'The Richest Man in Babylon',
  'The Total Money Makeover', 'Your Money or Your Life', 'The Intelligent Investor', 'A Random Walk Down Wall Street',
  'The Little Book of Common Sense', 'I Will Teach You to Be Rich', 'The Automatic Millionaire', 'Money Master the Game',
  'Secrets of the Millionaire Mind', 'The Millionaire Fastlane', 'The 4-Hour Workweek', 'Profit First',
  'The E-Myth Revisited', 'The Richest Man in Babylon', 'Unshakeable', 'The Simple Path to Wealth',
  'The Bogleheads\' Guide to Investing', 'The Index Card', 'Get Good with Money', 'The Psychology of Money',
  'The Barefoot Investor', 'Financial Freedom', 'Broke Millennial', 'You Are a Badass at Making Money',
  'The Wealthy Barber', 'The One Page Financial Plan', 'Smart Women Finish Rich', 'The Richest Engineer',
  'Set for Life', 'The 10X Rule', 'Rich Brother Rich Sister', 'Financial Intelligence', 'Multiple Streams of Income',
  'The Wealthy Gardener', 'Retire Inspired', 'The Latte Factor', 'Financial Freedom', 'Everyday Millionaires',
  'The Millionaire Booklet', 'Playing with FIRE', 'Work Optional', 'Quit Like a Millionaire', 'The Money Book',
  'Thou Shall Prosper', 'Money: A Love Story', 'Happy Money', 'The Soul of Money', 'The Energy of Money',
  'Overcoming Underearning', 'The Behavior Gap', 'The Wealth Money Can\'t Buy', 'Think and Trade Like a Champion',
  'One Up On Wall Street', 'Common Stocks and Uncommon Profits', 'The Warren Buffett Way', 'Security Analysis',
  'A Random Walk Guide to Investing', 'The Essays of Warren Buffett', 'The Snowball', 'Rich Dad\'s Cashflow Quadrant',
  'The Science of Getting Rich', 'The 21 Success Secrets', 'The Thin Green Line', 'Cashflow Quadrant',
  'Tax-Free Wealth', 'Real Estate Loopholes', 'The Book on Rental Property', 'Long-Distance Real Estate',
  'The Millionaire Real Estate Investor', 'The Wealth of Nations', 'Capital in the Twenty-First', 'Freakonomics',
  'Naked Economics', 'Basic Economics', 'Economics in One Lesson', 'The Armchair Economist', 'The Undercover Economist',
  'Poor Charlie\'s Almanack', 'Seeking Wisdom', 'The Most Important Thing', 'The Little Book That Beats', 'Margin of Safety',
  'Value Investing', 'The Dhandho Investor', 'The Little Book of Valuation', 'Investment Valuation', 'Financial Shenanigans',
  'The Interpretation of Financial', 'The Art of Value Investing', 'Concentrated Investing', 'The Joys of Compounding'
];

const ENTREPRENEURSHIP_BOOKS = [
  'The Lean Startup', 'Zero to One', 'The Hard Thing About Hard Things', 'The E-Myth Revisited',
  'Start with Why', 'Good to Great', 'Built to Last', 'The Innovator\'s Dilemma', 'Blue Ocean Strategy',
  'Crossing the Chasm', 'The Mom Test', 'Traction: Get a Grip', 'Hooked: How to Build', 'The Startup Owner\'s Manual',
  'Running Lean', 'The Lean Product Playbook', 'Inspired: How to Create Tech', 'Sprint: How to Solve Big Problems',
  'The Four Steps to the Epiphany', 'Business Model Generation', 'Value Proposition Design', 'The Personal MBA',
  'The $100 Startup', 'Company of One', 'Rework', 'It Doesn\'t Have to Be Crazy', 'Getting Real',
  'Remote: Office Not Required', 'The Art of the Start', 'The Innovator\'s Solution', 'The Innovator\'s DNA',
  'How to Get Rich', 'Shoe Dog', 'The Everything Store', 'Elon Musk', 'Steve Jobs', 'Creativity Inc.',
  'The Ride of a Lifetime', 'Principles: Life and Work', 'The Fifth Risk', 'Bad Blood', 'The Founder\'s Dilemmas',
  'Venture Deals', 'The Startup Checklist', 'High Output Management', 'The Effective Executive', 'Only the Paranoid Survive',
  'The Outsiders', 'Good Strategy Bad Strategy', 'Playing to Win', 'Competitive Strategy', 'Competitive Advantage',
  'The 22 Immutable Laws of Marketing', 'Positioning: The Battle for', 'Made to Stick', 'Contagious: Why Things Catch On',
  'Influence: The Psychology of', 'Pre-Suasion', 'Predictably Irrational', 'Thinking Fast and Slow', 'Nudge',
  'The Tipping Point', 'Outliers', 'David and Goliath', 'What the Dog Saw', 'Blink', 'The Power of Moments',
  'Switch: How to Change Things', 'Chip and Dan Heath', 'Never Split the Difference', 'Getting to Yes',
  'Crucial Conversations', 'Difficult Conversations', 'Thanks for the Feedback', 'The 7 Habits of Highly Effective',
  'How to Win Friends and Influence', 'Radical Candor', 'The Five Dysfunctions of a Team', 'Multipliers',
  'Turn the Ship Around!', 'Leaders Eat Last', 'Start with Why', 'The Infinite Game', 'Dare to Lead',
  'Extreme Ownership', 'The Obstacle Is the Way', 'Ego Is the Enemy', 'The Culture Code', 'Drive: The Surprising Truth',
  'Deep Work', 'Essentialism', 'The One Thing', 'Atomic Habits', 'The Compound Effect', 'The Power of Habit',
  'Measure What Matters', 'OKRs', 'Scaling Up', 'The Advantage', 'Traction: A Startup Guide'
];

function createBooksFromTitles(titles: string[], categoryId: string): Book[] {
  return titles.map((title, index) => ({
    id: `${categoryId}-${index + 1}`,
    title,
    authors: [], // Authors will be fetched later if needed
  }));
}

/* ---------------- Category Definitions ---------------- */
const CATEGORY_CONFIGS = [
  {
    id: 'self-help',
    title: '100 Best Self-Help Books Summarized for Success',
    books: createBooksFromTitles(SELF_HELP_BOOKS, 'self-help'),
    tags: [
      { text: 'Motivation', color: '#C45508' },
      { text: 'Success', color: '#C45508' }
    ]
  },
  {
    id: 'wealth',
    title: 'Top-100 Best Book Summaries to Get Rich',
    books: createBooksFromTitles(WEALTH_BOOKS, 'wealth'),
    tags: [
      { text: 'Wealth', color: '#D4A537' },
      { text: 'Money', color: '#D4A537' }
    ]
  },
  {
    id: 'entrepreneurship',
    title: 'Best Book Summaries on Entrepreneurship',
    books: createBooksFromTitles(ENTREPRENEURSHIP_BOOKS, 'entrepreneurship'),
    tags: [
      { text: 'StartUp', color: '#2E6F40' },
      { text: 'Business', color: '#2E6F40' }
    ]
  },
];

/* ---------------- Component ---------------- */
export default function CategoryCards({ onBookSelect }: CategoryCardsProps = {}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Generate an inline SVG placeholder
  const generateSVGPlaceholder = (title: string): string => {
    const shortTitle = title.slice(0, 20);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="180" viewBox="0 0 120 180">
      <rect width="120" height="180" fill="#E6FAFD"/>
      <text x="50%" y="50%" text-anchor="middle" dy="0.3em" fill="#06B6D4" font-family="Arial, sans-serif" font-size="10" font-weight="bold">
        <tspan x="50%" dy="0">${shortTitle.slice(0, 10)}</tspan>
        ${shortTitle.length > 10 ? `<tspan x="50%" dy="1.2em">${shortTitle.slice(10)}</tspan>` : ''}
      </text>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  // Fetch book covers from Google Books API with fallback to placeholders
  const fetchBookCovers = async (books: Book[]): Promise<Book[]> => {
    // For efficiency, only fetch covers for first 20 books initially
    const booksWithCovers = await Promise.all(
      books.slice(0, 20).map(async (book) => {
        try {
          const response = await fetch(
            `/api/books?q=${encodeURIComponent(book.title)}&maxResults=1`,
            { signal: AbortSignal.timeout(3000) } // 3 second timeout
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
        // Use inline SVG placeholder
        return {
          ...book,
          thumbnail: generateSVGPlaceholder(book.title)
        };
      })
    );
    
    // Add placeholders for remaining books
    const remainingBooks = books.slice(20).map(book => ({
      ...book,
      thumbnail: generateSVGPlaceholder(book.title)
    }));
    
    return [...booksWithCovers, ...remainingBooks];
  };

  // Initialize categories and fetch book covers
  useEffect(() => {
    const initializeCategories = async () => {
      setLoading(true);
      const categoriesWithCovers = await Promise.all(
        CATEGORY_CONFIGS.map(async (config) => ({
          ...config,
          books: await fetchBookCovers(config.books)
        }))
      );
      setCategories(categoriesWithCovers);
      setLoading(false);
    };

    initializeCategories();
  }, []);

  const handleCardClick = (category: Category) => {
    setSelectedCategory(category);
    setSearchQuery('');
  };

  const handleBackClick = () => {
    setSelectedCategory(null);
    setSearchQuery('');
  };

  const handleBookClick = (book: Book) => {
    // Use the callback to trigger summary generation in parent component
    if (onBookSelect) {
      onBookSelect(book.title);
    } else {
      // Fallback to alert if no callback provided
      console.log('Navigate to book summary:', book.title);
      alert(`Book summary for "${book.title}" - Coming soon!`);
    }
  };

  // Filter books based on search query
  const filteredBooks = useMemo(() => {
    if (!selectedCategory) return [];
    if (!searchQuery.trim()) return selectedCategory.books;
    
    const lowerQuery = searchQuery.toLowerCase();
    return selectedCategory.books.filter((book) => 
      book.title.toLowerCase().includes(lowerQuery) ||
      book.authors?.some((author) => author.toLowerCase().includes(lowerQuery))
    );
  }, [selectedCategory, searchQuery]);

  if (selectedCategory) {
    return (
      <div className="trl-category-view">
        <div className="trl-category-header">
          <button className="trl-back-btn" onClick={handleBackClick}>
            ← Back
          </button>
          <h2 className="trl-category-title">{selectedCategory.title}</h2>
          <div className="trl-search-wrapper">
            <input
              type="text"
              className="trl-book-search"
              placeholder="Search books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        {filteredBooks.length > 0 ? (
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

        <style jsx>{`
          .trl-category-view {
            margin-top: 32px;
          }
          .trl-category-header {
            display: grid;
            grid-template-columns: auto 1fr auto;
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
            white-space: nowrap;
          }
          .trl-back-btn:hover {
            background: var(--brand-700);
          }
          .trl-category-title {
            font-size: 24px;
            font-weight: 800;
            color: var(--brand-800);
            margin: 0;
            text-align: center;
          }
          .trl-search-wrapper {
            display: flex;
            justify-content: flex-end;
          }
          .trl-book-search {
            width: 250px;
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
          @media (max-width: 768px) {
            .trl-category-header {
              grid-template-columns: 1fr;
              gap: 12px;
            }
            .trl-category-title {
              font-size: 20px;
              text-align: left;
            }
            .trl-search-wrapper {
              justify-content: stretch;
            }
            .trl-book-search {
              width: 100%;
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
      {loading ? (
        <div className="trl-loading">Loading book collections...</div>
      ) : (
        <div className="trl-category-cards">
          {categories.map((category) => (
            <button
              key={category.id}
              className="trl-category-card"
              onClick={() => handleCardClick(category)}
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
      )}

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
        .trl-loading {
          text-align: center;
          padding: 48px 24px;
          color: var(--muted);
          font-size: 16px;
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
