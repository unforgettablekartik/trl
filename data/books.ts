/* ---------------- Book Data ---------------- */

export interface Book {
  id: string;
  title: string;
  authors?: string[];
  thumbnail?: string;
}

export interface Category {
  id: string;
  title: string;
  slug: string;
  books: Book[];
  tags: { text: string; color: string }[];
}

/* ---------------- Book Titles ---------------- */
export const SELF_HELP_BOOKS = [
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

export const WEALTH_BOOKS = [
  'Rich Dad Poor Dad', 'Think and Grow Rich', 'The Millionaire Next Door', 'The Richest Man in Babylon',
  'The Total Money Makeover', 'Your Money or Your Life', 'The Intelligent Investor', 'A Random Walk Down Wall Street',
  'The Little Book of Common Sense', 'I Will Teach You to Be Rich', 'The Automatic Millionaire', 'Money Master the Game',
  'Secrets of the Millionaire Mind', 'The Millionaire Fastlane', 'The 4-Hour Workweek', 'Profit First',
  'The E-Myth Revisited', 'The Little Book That Still Beats', 'Unshakeable', 'The Simple Path to Wealth',
  'The Bogleheads\' Guide to Investing', 'The Index Card', 'Get Good with Money', 'The Psychology of Money',
  'The Barefoot Investor', 'Financial Freedom', 'Broke Millennial', 'You Are a Badass at Making Money',
  'The Wealthy Barber', 'The One Page Financial Plan', 'Smart Women Finish Rich', 'The Richest Engineer',
  'Set for Life', 'The 10X Rule', 'Rich Brother Rich Sister', 'Financial Intelligence', 'Multiple Streams of Income',
  'The Wealthy Gardener', 'Retire Inspired', 'The Latte Factor', 'The Money Manual', 'Everyday Millionaires',
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

export const ENTREPRENEURSHIP_BOOKS = [
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
  'Turn the Ship Around!', 'Leaders Eat Last', 'The Leadership Challenge', 'The Infinite Game', 'Dare to Lead',
  'Extreme Ownership', 'The Obstacle Is the Way', 'Ego Is the Enemy', 'The Culture Code', 'Drive: The Surprising Truth',
  'Deep Work', 'Essentialism', 'The One Thing', 'Atomic Habits', 'The Compound Effect', 'The Power of Habit',
  'Measure What Matters', 'OKRs', 'Scaling Up', 'The Advantage', 'Traction: A Startup Guide'
];

function createBooksFromTitles(titles: string[], categoryId: string): Book[] {
  return titles.map((title, index) => ({
    id: `${categoryId}-${index + 1}`,
    title,
    authors: [],
  }));
}

/* ---------------- Category Configurations ---------------- */
export const CATEGORIES: Category[] = [
  {
    id: 'self-help',
    title: '100 Best Self-Help Books Summarized for Success',
    slug: 'best-self-help-books-summary',
    books: createBooksFromTitles(SELF_HELP_BOOKS, 'self-help'),
    tags: [
      { text: 'Motivation', color: '#C45508' },
      { text: 'Success', color: '#C45508' }
    ]
  },
  {
    id: 'wealth',
    title: 'Top-100 Best Book Summaries to Get Rich',
    slug: 'best-get-rich-books-summary',
    books: createBooksFromTitles(WEALTH_BOOKS, 'wealth'),
    tags: [
      { text: 'Wealth', color: '#D4A537' },
      { text: 'Money', color: '#D4A537' }
    ]
  },
  {
    id: 'entrepreneurship',
    title: 'Best Book Summaries on Entrepreneurship',
    slug: 'best-entrepreneurship-book-summary',
    books: createBooksFromTitles(ENTREPRENEURSHIP_BOOKS, 'entrepreneurship'),
    tags: [
      { text: 'StartUp', color: '#2E6F40' },
      { text: 'Business', color: '#2E6F40' }
    ]
  },
];
