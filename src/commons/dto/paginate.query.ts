import { Expose, Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

const DEFAULT_PER_PAGE = 10;
const MAX_PER_PAGE = 100;

function defaultPerPage(): number {
  const value = Number(process.env.PER_PAGE);
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_PER_PAGE;
}

export class PaginateQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Expose({ name: 'perPage' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PER_PAGE)
  limit = defaultPerPage();
}