'use client';

import CategoryPage from '../../../components/CategoryPage';
import { CATEGORIES } from '../../../data/books';

export default function GetRichBooksPage() {
  const category = CATEGORIES.find(c => c.slug === 'best-get-rich-books-summary');
  
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
