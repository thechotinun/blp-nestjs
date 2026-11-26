import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { Like, QueryFailedError } from 'typeorm';
import { Todo } from '@entities/todo.entity';
import { ApiException } from '@exceptions/app/api.exception';
import { TodoRepository } from '@repositories/todo.repository';
import { TodoService } from './todo.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const todoFactory = (overrides: Partial<Todo> = {}): Todo =>
	Object.assign(new Todo(), {
		id: '7c2f1e0a-0000-4000-8000-000000000001',
		name: 'buy milk',
		description: 'two bottles',
		status: true,
		...overrides,
	});

const uniqueViolation = (): QueryFailedError =>
	new QueryFailedError(
		'INSERT INTO todos',
		[],
		Object.assign(new Error('duplicate key value violates unique constraint'), {
			code: '23505',
		}),
	);

const catchError = async (action: () => Promise<unknown>): Promise<unknown> => {
	try {
		await action();
	} catch (error) {
		return error;
	}
	throw new Error('expected the action to throw');
};

const expectApiError = (error: unknown, errorCode: number, status: number): void => {
	expect(error).toBeInstanceOf(ApiException);
	expect((error as ApiException).getStatus()).toBe(status);
	expect((error as ApiException).getResponse()).toMatchObject({ errorCode });
};

describe('TodoService', () => {
	const getOne = jest.fn<Promise<Todo | null>, []>();
	const queryBuilder = {
		select: jest.fn().mockReturnThis(),
		where: jest.fn().mockReturnThis(),
		getOne,
	};
	const repository = {
		create: jest.fn<Todo, [Partial<Todo>]>(),
		save: jest.fn<Promise<Todo>, [Todo]>(),
		findOne: jest.fn<Promise<Todo | null>, [unknown]>(),
		update: jest.fn<Promise<unknown>, [string, Partial<Todo>]>(),
		softDelete: jest.fn<Promise<unknown>, [string]>(),
		findAndCount: jest.fn<Promise<[Todo[], number]>, [unknown]>(),
		createQueryBuilder: jest.fn(() => queryBuilder),
	};
	let service: TodoService;
	let loggerError: jest.SpyInstance;

	beforeEach(() => {
		jest.clearAllMocks();
		queryBuilder.select.mockReturnThis();
		queryBuilder.where.mockReturnThis();
		repository.create.mockImplementation((payload) => Object.assign(new Todo(), payload));
		repository.save.mockImplementation((todo) => Promise.resolve(todo));
		loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
		service = new TodoService(repository as unknown as TodoRepository);
	});

	afterEach(() => {
		loggerError.mockRestore();
	});

	describe('checkTodo', () => {
		it('should look the todo up by id', async () => {
			const todo = todoFactory();
			repository.findOne.mockResolvedValue(todo);

			await expect(service.checkTodo(todo.id)).resolves.toBe(todo);
			expect(repository.findOne).toHaveBeenCalledWith({ where: { id: todo.id } });
		});

		it('should return null when the todo does not exist', async () => {
			repository.findOne.mockResolvedValue(null);

			await expect(service.checkTodo('missing')).resolves.toBeNull();
		});
	});

	describe('create', () => {
		it('should build the entity from the payload and return the saved todo', async () => {
			const payload = { name: 'buy milk', description: 'two bottles' };

			const result = await service.create(payload);

			expect(repository.create).toHaveBeenCalledWith(payload);
			expect(result).toMatchObject(payload);
		});

		it('should save the todo with the same uuid as creator and updater', async () => {
			await service.create({ name: 'a', description: 'b' });

			const saved = repository.save.mock.calls[0][0];
			expect(saved.createdBy).toMatch(UUID);
			expect(saved.updatedBy).toBe(saved.createdBy);
		});

		it('should throw TODO_EXIST (409) when the name is already used', async () => {
			repository.save.mockRejectedValue(uniqueViolation());

			const error = await catchError(() => service.create({ name: 'a', description: 'b' }));

			expectApiError(error, 100105, 409);
			expect(loggerError).not.toHaveBeenCalled();
		});

		it('should throw TODO_CREATE_ERROR (422) for any other failure', async () => {
			repository.save.mockRejectedValue(new Error('connection lost'));

			const error = await catchError(() => service.create({ name: 'a', description: 'b' }));

			expectApiError(error, 100103, 422);
		});

		it('should log the real error but not send it to the client', async () => {
			repository.save.mockRejectedValue(new Error('password authentication failed'));

			const error = await catchError(() => service.create({ name: 'a', description: 'b' }));

			expect(loggerError).toHaveBeenCalledWith(
				'create failed',
				expect.stringContaining('password authentication failed'),
			);
			expect(JSON.stringify((error as ApiException).getResponse())).not.toContain(
				'password authentication failed',
			);
		});

		it('should treat a unique violation of another SQLSTATE as a normal failure', async () => {
			repository.save.mockRejectedValue(
				new QueryFailedError('q', [], Object.assign(new Error('x'), { code: '23503' })),
			);

			const error = await catchError(() => service.create({ name: 'a', description: 'b' }));

			expectApiError(error, 100103, 422);
		});
	});

	describe('paginate', () => {
		const options = { page: 2, limit: 5 };

		it('should query with the select list, newest first, and skip/take from the page', async () => {
			repository.findAndCount.mockResolvedValue([[todoFactory()], 11]);

			await service.paginate(options, {});

			expect(repository.findAndCount).toHaveBeenCalledWith({
				select: {
					id: true,
					name: true,
					description: true,
					createdDate: true,
					createdBy: true,
					updatedDate: true,
					updatedBy: true,
					status: true,
				},
				where: undefined,
				order: { createdDate: 'DESC' },
				skip: 5,
				take: 5,
			});
		});

		it('should filter by a partial name match when a name is given', async () => {
			repository.findAndCount.mockResolvedValue([[], 0]);

			await service.paginate(options, { name: 'milk' });

			expect(repository.findAndCount).toHaveBeenCalledWith(
				expect.objectContaining({ where: { name: Like('%milk%') } }),
			);
		});

		it('should return items with meta and links to /api/v1/todos', async () => {
			const items = [todoFactory(), todoFactory({ name: 'b' })];
			repository.findAndCount.mockResolvedValue([items, 11]);

			const result = await service.paginate(options, {});

			expect(result.items).toBe(items);
			expect(result.meta).toEqual({
				itemCount: 2,
				totalItems: 11,
				itemsPerPage: 5,
				totalPages: 3,
				currentPage: 2,
			});
			expect(result.links).toEqual({
				first: '/api/v1/todos?page=1&perPage=5',
				previous: '/api/v1/todos?page=1&perPage=5',
				next: '/api/v1/todos?page=3&perPage=5',
				last: '/api/v1/todos?page=3&perPage=5',
			});
		});

		// Current behavior: unlike the other methods, paginate does not wrap errors,
		// so the raw error reaches the exception filter (which returns its message).
		it('should let a repository error through unchanged', async () => {
			const failure = new Error('connection lost');
			repository.findAndCount.mockRejectedValue(failure);

			await expect(service.paginate(options, {})).rejects.toBe(failure);
		});
	});

	describe('findOneById', () => {
		it('should return the todo found by id', async () => {
			const todo = todoFactory();
			getOne.mockResolvedValue(todo);

			await expect(service.findOneById(todo.id)).resolves.toBe(todo);
			expect(queryBuilder.where).toHaveBeenCalledWith('todo.id = :id', { id: todo.id });
		});

		it('should select only the public columns', async () => {
			getOne.mockResolvedValue(todoFactory());

			await service.findOneById('x');

			expect(queryBuilder.select).toHaveBeenCalledWith([
				'todo.id',
				'todo.name',
				'todo.description',
				'todo.createdDate',
				'todo.createdBy',
				'todo.updatedDate',
				'todo.updatedBy',
				'todo.status',
			]);
		});

		it('should throw TODO_NOT_FOUND (404) when there is no such todo', async () => {
			getOne.mockResolvedValue(null);

			const error = await catchError(() => service.findOneById('missing'));

			expectApiError(error, 100101, 404);
			expect(loggerError).not.toHaveBeenCalled();
		});

		it('should throw TODO_FIND_ERROR (500) and log when the query fails', async () => {
			getOne.mockRejectedValue(new Error('connection lost'));

			const error = await catchError(() => service.findOneById('x'));

			expectApiError(error, 100106, 500);
			expect(loggerError).toHaveBeenCalledWith(
				'findOneById failed (id=x)',
				expect.stringContaining('connection lost'),
			);
		});

		it('should not report a database failure as not found', async () => {
			getOne.mockRejectedValue(new Error('connection lost'));

			const error = await catchError(() => service.findOneById('x'));

			expect((error as ApiException).getResponse()).not.toMatchObject({ errorCode: 100101 });
		});
	});

	describe('update', () => {
		const payload = { name: 'new name', description: 'new description' };

		it('should update the row and return the refreshed todo', async () => {
			const updated = todoFactory(payload);
			repository.findOne.mockResolvedValue(todoFactory());
			repository.update.mockResolvedValue({ affected: 1 });
			getOne.mockResolvedValue(updated);

			const result = await service.update('abc', payload);

			expect(repository.update).toHaveBeenCalledWith('abc', payload);
			expect(result).toBe(updated);
		});

		it('should throw TODO_NOT_FOUND (404) and not update when the todo is missing', async () => {
			repository.findOne.mockResolvedValue(null);

			const error = await catchError(() => service.update('missing', payload));

			expectApiError(error, 100101, 404);
			expect(repository.update).not.toHaveBeenCalled();
		});

		it('should throw TODO_EXIST (409) when the new name is already used', async () => {
			repository.findOne.mockResolvedValue(todoFactory());
			repository.update.mockRejectedValue(uniqueViolation());

			const error = await catchError(() => service.update('abc', payload));

			expectApiError(error, 100105, 409);
		});

		it('should throw TODO_UPDATE_ERROR (422) and log for any other failure', async () => {
			repository.findOne.mockResolvedValue(todoFactory());
			repository.update.mockRejectedValue(new Error('deadlock detected'));

			const error = await catchError(() => service.update('abc', payload));

			expectApiError(error, 100104, 422);
			expect(loggerError).toHaveBeenCalledWith(
				'update failed (id=abc)',
				expect.stringContaining('deadlock detected'),
			);
			expect(JSON.stringify((error as ApiException).getResponse())).not.toContain(
				'deadlock detected',
			);
		});

		it('should keep a TODO_NOT_FOUND raised while reloading the updated todo', async () => {
			repository.findOne.mockResolvedValue(todoFactory());
			repository.update.mockResolvedValue({ affected: 1 });
			getOne.mockResolvedValue(null);

			const error = await catchError(() => service.update('abc', payload));

			expectApiError(error, 100101, 404);
		});
	});

	describe('remove', () => {
		it('should soft delete the todo and return the result', async () => {
			const result = { affected: 1 };
			repository.findOne.mockResolvedValue(todoFactory());
			getOne.mockResolvedValue(todoFactory());
			repository.softDelete.mockResolvedValue(result);

			await expect(service.remove('abc')).resolves.toBe(result);
			expect(repository.softDelete).toHaveBeenCalledWith('abc');
		});

		it('should throw TODO_NOT_FOUND (404) and not delete when the todo is missing', async () => {
			repository.findOne.mockResolvedValue(null);

			const error = await catchError(() => service.remove('missing'));

			expectApiError(error, 100101, 404);
			expect(repository.softDelete).not.toHaveBeenCalled();
		});

		it('should throw TODO_DELETE_ERROR (422) and log when deleting fails', async () => {
			repository.findOne.mockResolvedValue(todoFactory());
			getOne.mockResolvedValue(todoFactory());
			repository.softDelete.mockRejectedValue(new Error('disk full'));

			const error = await catchError(() => service.remove('abc'));

			expectApiError(error, 100102, 422);
			expect(loggerError).toHaveBeenCalledWith(
				'remove failed (id=abc)',
				expect.stringContaining('disk full'),
			);
		});
	});
});
