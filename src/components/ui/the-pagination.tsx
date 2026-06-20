import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PROPERTIES_PAGE_SIZE = 10;

export interface PropertyPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function getVisiblePages(page: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result: (number | 'ellipsis')[] = [];

  sorted.forEach((p, index) => {
    if (index > 0 && p - sorted[index - 1] > 1) {
      result.push('ellipsis');
    }
    result.push(p);
  });

  return result;
}

export function PropertyPagination({
  page,
  totalPages,
  totalItems,
  pageSize = PROPERTIES_PAGE_SIZE,
  onPageChange,
  className,
}: PropertyPaginationProps) {
  if (totalPages <= 1) return null;

  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <nav
      aria-label="Property results pagination"
      className={cn('flex flex-col items-center gap-4 pt-2', className)}
    >
      <p className="text-center text-[12px] text-gray-500">
        Showing{' '}
        <span className="font-semibold text-black">
          {start}-{end}
        </span>{' '}
        of <span className="font-semibold text-black">{totalItems}</span> properties
      </p>

      <div className="flex w-full max-w-md flex-wrap items-center justify-center gap-1 sm:gap-1.5">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex min-h-[44px] touch-manipulation items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-[12px] font-medium uppercase tracking-wide text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} aria-hidden />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="flex items-center gap-1">
          {visiblePages.map((item, index) =>
            item === 'ellipsis' ? (
              <span
                key={`ellipsis-${index}`}
                className="px-1 text-[13px] text-gray-400"
                aria-hidden
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-label={`Page ${item}`}
                aria-current={item === page ? 'page' : undefined}
                className={cn(
                  'inline-flex h-10 min-w-[40px] touch-manipulation items-center justify-center rounded-lg border px-3 text-[13px] font-semibold transition-colors',
                  item === page
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50',
                )}
              >
                {item}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex min-h-[44px] touch-manipulation items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-[12px] font-medium uppercase tracking-wide text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>
    </nav>
  );
}

/** Demo/basic export matching integration task naming. */
export function PaginationBasic() {
  return (
    <PropertyPagination
      page={1}
      totalPages={3}
      totalItems={30}
      onPageChange={() => undefined}
    />
  );
}

export default PropertyPagination;
