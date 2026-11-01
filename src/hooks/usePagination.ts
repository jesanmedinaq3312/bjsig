import { useState, useMemo, useEffect } from "react";

const DEFAULT_PAGE_SIZE = 50;

export function usePagination<T>(items: T[], pageSize: number = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (page > 1 && items.length <= (page - 1) * pageSize) {
      setPage(1);
    }
  }, [items.length, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = useMemo(() => items.slice(start, end), [items, start, end]);

  return { page: safePage, totalPages, pageItems, setPage, pageSize, total: items.length };
}
