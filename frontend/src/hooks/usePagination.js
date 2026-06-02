import { useState, useMemo } from 'react';

export function usePagination(items, pageSize = 10) {
  const [page, setPage] = useState(1);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;
  const pageItems = useMemo(() => items.slice(offset, offset + pageSize), [items, offset, pageSize]);

  return {
    page: safePage,
    totalPages,
    total,
    pageItems,
    setPage: (p) => setPage(Math.min(Math.max(1, p), totalPages)),
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
    next: () => setPage(p => Math.min(totalPages, p + 1)),
    prev: () => setPage(p => Math.max(1, p - 1)),
    reset: () => setPage(1),
  };
}
