import 'reflect-metadata';
import { HttpStatus } from '@nestjs/common';
import { Todo } from '@entities/todo.entity';
import { TodoException } from '@exceptions/app/todo.exception';
import { SerializeInterceptor } from '@interceptors/use-resources.interceptor';
import { TodoService } from '../services/todo.service';
import { TodoController } from './post.controller';

const todoFactory = (overrides: Partial<Todo> = {}): Todo =>
	Object.assign(new Todo(), {
		id: '7c2f1e0a-0000-4000-8000-000000000001',
		name: 'buy milk',
		description: 'two bottles',
		...overrides,
	});

describe('TodoController', () => {
	const service = {
		create: jest.fn(),
		paginate: jest.fn(),
		findOneById: jest.fn(),
		update: jest.fn(),
		remove: jest.fn(),
	};
	let controller: TodoController;

	beforeEach(() => {
		jest.resetAllMocks();
		controller = new TodoController(service as unknown as TodoService);
	});

	describe('routing metadata', () => {
		it('should be mounted on /todos', () => {
			expect(Reflect.getMetadata('path', TodoController)).toBe('todos');
		});

		it('should serialize only the paginate route with a SerializeInterceptor', () => {
			const onPaginate = Reflect.getMetadata(
				'__interceptors__',
				TodoController.prototype.paginate,
			) as unknown[];

			expect(onPaginate).toHaveLength(1);
			expect(onPaginate[0]).toBeInstanceOf(SerializeInterceptor);
			expect(
				Reflect.getMetadata('__interceptors__', TodoController.prototype.create),
			).toBeUndefined();
		});
	});

	describe('create', () => {
		it('should pass the payload to the service', async () => {
			const payload = { name: 'buy milk', description: 'two bottles' };
			service.create.mockResolvedValue(todoFactory());

			await controller.create(payload);

			expect(service.create).toHaveBeenCalledWith(payload);
		});

		it('should answer 201 Created with the new todo as data', async () => {
			const todo = todoFactory();
			service.create.mockResolvedValue(todo);

			const result = await controller.create({ name: 'buy milk', description: 'x' });

			expect(result).toEqual({
				data: todo,
				status: { code: HttpStatus.CREATED, message: 'Created' },
			});
		});

		it('should rethrow the error from the service', async () => {
			const error = TodoException.exist();
			service.create.mockRejectedValue(error);

			await expect(controller.create({ name: 'a', description: 'b' })).rejects.toBe(error);
		});
	});

	describe('paginate', () => {
		it('should pass page and limit as options and the whole query as filter', async () => {
			service.paginate.mockResolvedValue({ items: [], meta: { itemCount: 0 } });
			const query = { name: 'milk' };

			await controller.paginate({ page: 2, limit: 5 }, query);

			expect(service.paginate).toHaveBeenCalledWith({ page: 2, limit: 5 }, query);
		});

		it('should answer 200 and unwrap the page into data, meta and links', async () => {
			const items = [todoFactory()];
			const meta = { itemCount: 1, itemsPerPage: 10, currentPage: 1 };
			const links = { first: '/api/v1/todos?page=1&perPage=10' };
			service.paginate.mockResolvedValue({ items, meta, links });

			const result = await controller.paginate({ page: 1, limit: 10 }, {});

			expect(result).toEqual({
				data: items,
				meta,
				links,
				status: { code: HttpStatus.OK, message: 'OK' },
			});
		});

		it('should rethrow the error from the service', async () => {
			const failure = new Error('connection lost');
			service.paginate.mockRejectedValue(failure);

			await expect(controller.paginate({ page: 1, limit: 10 }, {})).rejects.toBe(failure);
		});
	});

	describe('findOneById', () => {
		it('should answer 200 with the todo found by id', async () => {
			const todo = todoFactory();
			service.findOneById.mockResolvedValue(todo);

			const result = await controller.findOneById(todo.id);

			expect(service.findOneById).toHaveBeenCalledWith(todo.id);
			expect(result).toEqual({
				data: todo,
				status: { code: HttpStatus.OK, message: 'OK' },
			});
		});

		it('should rethrow TODO_NOT_FOUND from the service', async () => {
			const error = TodoException.notFound();
			service.findOneById.mockRejectedValue(error);

			await expect(controller.findOneById('missing')).rejects.toBe(error);
		});
	});

	describe('update', () => {
		it('should pass id and payload and answer 200 with the updated todo', async () => {
			const payload = { name: 'new', description: 'new' };
			const todo = todoFactory(payload);
			service.update.mockResolvedValue(todo);

			const result = await controller.update('abc', payload);

			expect(service.update).toHaveBeenCalledWith('abc', payload);
			expect(result).toEqual({
				data: todo,
				status: { code: HttpStatus.OK, message: 'OK' },
			});
		});

		it('should rethrow the error from the service', async () => {
			const error = TodoException.notFound();
			service.update.mockRejectedValue(error);

			await expect(controller.update('x', { name: 'a', description: 'b' })).rejects.toBe(error);
		});
	});

	describe('remove', () => {
		it('should pass the id and answer 200 with the delete result', async () => {
			const deleted = { affected: 1, raw: [], generatedMaps: [] };
			service.remove.mockResolvedValue(deleted);

			const result = await controller.remove('abc');

			expect(service.remove).toHaveBeenCalledWith('abc');
			expect(result).toEqual({
				data: deleted,
				status: { code: HttpStatus.OK, message: 'OK' },
			});
		});

		it('should rethrow the error from the service', async () => {
			const error = TodoException.deleteError();
			service.remove.mockRejectedValue(error);

			await expect(controller.remove('x')).rejects.toBe(error);
		});
	});
});
