export interface PageParams {
  pageNumber: number;
  pageSize: number;
  term: string;
}

export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
