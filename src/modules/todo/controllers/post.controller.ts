import {
	Body,
	Controller,
	Post,
	Get,
	Query,
	Param,
	Patch,
	Delete,
	HttpStatus,
} from '@nestjs/common';
import { PaginateQuery } from '@commons/dto/paginate.query';
import { TodoService } from '@modules/todo/services/todo.service';
import { ApiResource } from '@commons/reponses/api-resource';
import { CreateTodoDto } from '@modules/todo/dto/create-todo.dto';
import { UpdateTodoDto } from '@modules/todo/dto/update-todo.dto';
import { UseResources } from '@interceptors/use-resources.interceptor';
import { TodoResourceDto } from '@modules/todo/resources/todo.resource';

@Controller('todos')
export class TodoController {
	constructor(private readonly todoService: TodoService) {}

	@Post()
	async create(@Body() payload: CreateTodoDto): Promise<ApiResource> {
		try {
			const response = await this.todoService.create(payload);

			return ApiResource.successResponse(response, HttpStatus.CREATED);
		} catch (error) {
			return ApiResource.errorResponse(error);
		}
	}

	@Get()
	@UseResources(TodoResourceDto)
	async paginate(
		@Query() { page, limit }: PaginateQuery,
		@Query()
		query: {
			name?: string;
		},
	): Promise<ApiResource> {
		try {
			const reponse = await this.todoService.paginate(
				{
					page,
					limit,
				},
				query,
			);

			return ApiResource.successResponse(reponse);
		} catch (error) {
			return ApiResource.errorResponse(error);
		}
	}

	@Get(':id')
	async findOneById(@Param('id') id: string): Promise<ApiResource> {
		try {
			const response = await this.todoService.findOneById(id);

			return ApiResource.successResponse(response);
		} catch (error) {
			return ApiResource.errorResponse(error);
		}
	}

	@Patch(':id')
	async update(@Param('id') id: string, @Body() payload: UpdateTodoDto): Promise<ApiResource> {
		try {
			const response = await this.todoService.update(id, payload);

			return ApiResource.successResponse(response);
		} catch (error) {
			return ApiResource.errorResponse(error);
		}
	}

	@Delete(':id')
	async remove(@Param('id') id: string): Promise<ApiResource> {
		try {
			const response = await this.todoService.remove(id);

			return ApiResource.successResponse(response);
		} catch (error) {
			return ApiResource.errorResponse(error);
		}
	}
}
