import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './ui/pagination';
import { cn } from '../lib/utils';

interface AppPaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

type PageSlot = number | 'gap-start' | 'gap-end';

const SIBLINGS = 1;

const range = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, index) => start + index);

const buildPageSlots = (currentPage: number, totalPages: number): PageSlot[] => {
  const fullWidth = SIBLINGS * 2 + 5;
  if (totalPages <= fullWidth) return range(1, totalPages);

  const left = Math.max(currentPage - SIBLINGS, 2);
  const right = Math.min(currentPage + SIBLINGS, totalPages - 1);
  const showStartGap = left > 3;
  const showEndGap = right < totalPages - 2;
  const edgeRun = SIBLINGS * 2 + 3;

  if (!showStartGap) return [...range(1, edgeRun), 'gap-end', totalPages];
  if (!showEndGap) return [1, 'gap-start', ...range(totalPages - edgeRun + 1, totalPages)];
  return [1, 'gap-start', ...range(left, right), 'gap-end', totalPages];
};

const AppPagination = ({ currentPage, totalItems, itemsPerPage, onPageChange }: AppPaginationProps) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) return null;

  const onFirst = currentPage <= 1;
  const onLast = currentPage >= totalPages;

  const goTo = (page: number) => (event: React.MouseEvent) => {
    event.preventDefault();
    if (page !== currentPage) onPageChange(page);
  };

  return (
    <Pagination>
      <PaginationContent className="flex-wrap justify-center">
        <PaginationItem>
          <PaginationPrevious
            href="#"
            aria-disabled={onFirst}
            tabIndex={onFirst ? -1 : undefined}
            className={cn(onFirst && 'pointer-events-none opacity-50')}
            onClick={goTo(Math.max(currentPage - 1, 1))}
          />
        </PaginationItem>

        {buildPageSlots(currentPage, totalPages).map((slot) =>
          typeof slot === 'number' ? (
            <PaginationItem key={slot}>
              <PaginationLink href="#" isActive={slot === currentPage} onClick={goTo(slot)}>
                {slot}
              </PaginationLink>
            </PaginationItem>
          ) : (
            <PaginationItem key={slot}>
              <PaginationEllipsis />
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            href="#"
            aria-disabled={onLast}
            tabIndex={onLast ? -1 : undefined}
            className={cn(onLast && 'pointer-events-none opacity-50')}
            onClick={goTo(Math.min(currentPage + 1, totalPages))}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

export default AppPagination;
