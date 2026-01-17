'use client';

import CategoryPage from '../../components/CategoryPage';
import { CATEGORIES } from '../../data/books';

export default function EntrepreneurshipBooksPage() {
  const category = CATEGORIES.find(c => c.slug === 'best-entrepreneurship-book-summary');
  
  if (!category) {
    return <div>Category not found</div>;
  }

  return (
    <CategoryPage
      categoryId={category.id}
      categoryTitle={category.title}
      books={category.books}
      tags={category.tags}
    />
  );
}
