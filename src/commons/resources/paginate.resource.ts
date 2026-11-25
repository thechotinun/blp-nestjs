import { Expose } from 'class-transformer';
import type {
  PaginationLinks,
  PaginationMeta,
} from '../interfaces/pagination.interface';

export class ResourceDto {
  @Expose()
  status: {
    code: number;
    message: string;
  };
}

export class ResourceWithPaginateDto {
  @Expose()
  status: {
    code: number;
    message: string;
  };

  @Expose()
  meta: PaginationMeta;

  @Expose()
  links: PaginationLinks;
}
