import { BaseResourceDto } from '@commons/resources/base.resource';
import { ResourceWithPaginateDto } from '@commons/resources/paginate.resource';
import { Expose, Type } from 'class-transformer';

export class TodoDto extends BaseResourceDto {
	@Expose()
	name: string;

	@Expose()
	description: string;
}

export class TodoResourceDto extends ResourceWithPaginateDto {
	@Expose()
	@Type(() => TodoDto)
	data: TodoDto[];
}
