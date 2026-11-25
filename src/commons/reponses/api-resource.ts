import { HttpStatus } from '@nestjs/common';
import {
  Pagination,
  PaginationLinks,
  PaginationMeta,
} from '../interfaces/pagination.interface';

function isPagination(data: unknown): data is Pagination<unknown> {
  return (
    typeof data === 'object' &&
    data !== null &&
    Array.isArray((data as { items?: unknown }).items)
  );
}

export class ApiResource {
  /**
   * Success response
   * @param [data]
   * @returns SuccessResponseInterface
   */
  static successResponse(data?: unknown): SuccessResponseInterface {
    if (!data) {
      return { status: { code: HttpStatus.OK, message: 'OK' } };
    }

    if (isPagination(data)) {
      const { items, links, meta } = data;

      return {
        data: items,
        links,
        meta,
        status: { code: HttpStatus.OK, message: 'OK' },
      };
    }

    return { data, status: { code: HttpStatus.OK, message: 'OK' } };
  }

  /**
   * Errors response
   * @param error
   */
  static errorResponse(error: unknown): never {
    // All exception will be handle by exception filters
    throw error;
  }
}

export interface SuccessResponseInterface {
  status: { code: number; message: string };
  data?: unknown;
  links?: PaginationLinks;
  meta?: PaginationMeta;
}

export interface ErrorResponseInterface {
  status: { code: number; message: string };
  error: { code: number; message: string; errors: string[] };
}
