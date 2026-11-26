import { HttpStatus } from '@nestjs/common';
import { HttpStatusMessages } from '@exceptions/constants/http-status-messages.constant';
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
   * @param [statusCode] must match the HTTP status the route responds with
   * @returns SuccessResponseInterface
   */
  static successResponse(
    data?: unknown,
    statusCode: HttpStatus = HttpStatus.OK,
  ): SuccessResponseInterface {
    const status = {
      code: statusCode,
      message: HttpStatusMessages[statusCode],
    };

    if (!data) {
      return { status };
    }

    if (isPagination(data)) {
      const { items, links, meta } = data;

      return { data: items, links, meta, status };
    }

    return { data, status };
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
