// Shared primitives that mirror the Go backend's JSON conventions.
// Every list endpoint returns a `pagination` object with these exact keys.

export type ID = number;

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export const EMPTY_PAGINATION: Pagination = {
  page: 1,
  limit: 20,
  total: 0,
  total_pages: 0,
};
