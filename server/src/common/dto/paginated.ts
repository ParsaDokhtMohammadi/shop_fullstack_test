import { PaginationDto } from './pagination.dto';

export interface Paginated<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    pageCount: number;
  };
}

// Pairs with repository.findAndCount(), which returns [items, total]:
//   const [items, total] = await repo.findAndCount({ skip: dto.skip, take: dto.take });
//   return paginated(items, total, dto);
export function paginated<T>(
  items: T[],
  total: number,
  dto: PaginationDto,
): Paginated<T> {
  return {
    items,
    meta: {
      page: dto.page,
      limit: dto.limit,
      total,
      // An empty table is one empty page, not zero pages — keeps the frontend
      // from rendering "page 1 of 0".
      pageCount: Math.max(1, Math.ceil(total / dto.limit)),
    },
  };
}
