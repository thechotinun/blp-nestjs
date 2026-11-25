export interface PaginationMeta {
  itemCount: number;
  totalItems?: number;
  itemsPerPage: number;
  totalPages?: number;
  currentPage: number;
}

export interface PaginationLinks {
  first?: string;
  previous?: string;
  next?: string;
  last?: string;
}

export interface Pagination<T> {
  items: T[];
  meta: PaginationMeta;
  links?: PaginationLinks;
}
