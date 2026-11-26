import 'reflect-metadata';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Expose, Type } from 'class-transformer';
import { lastValueFrom, of, throwError } from 'rxjs';
import { TodoDto, TodoResourceDto } from '@modules/todo/resources/todo.resource';
import { SerializeInterceptor, UseResources } from './use-resources.interceptor';

class AddressDto {
	@Expose()
	street: string;
}

class UserDto {
	@Expose()
	id: string;

	@Expose()
	name: string;

	@Expose()
	@Type(() => AddressDto)
	address: AddressDto;
}

const context = {} as ExecutionContext;

const handlerFactory = (data: unknown): CallHandler<unknown> => ({
	handle: () => of(data),
});

const run = <T>(dto: new () => T, data: unknown): Promise<T | T[]> =>
	lastValueFrom(new SerializeInterceptor(dto).intercept(context, handlerFactory(data)));

const userFactory = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
	id: 'u1',
	name: 'Alice',
	address: { street: 'Main St' },
	...overrides,
});

describe('SerializeInterceptor', () => {
	describe('field filtering', () => {
		it('should keep the fields exposed by the dto', async () => {
			const result = await run(UserDto, userFactory());

			expect(result).toMatchObject({ id: 'u1', name: 'Alice' });
		});

		it('should drop fields the dto does not expose', async () => {
			const result = await run(UserDto, userFactory({ password: 'secret', deletedBy: 'x' }));

			expect(result).not.toHaveProperty('password');
			expect(result).not.toHaveProperty('deletedBy');
		});

		it('should drop extra fields of nested objects', async () => {
			const result = await run(UserDto, userFactory({ address: { street: 'Main St', geo: 1 } }));

			expect(result).toMatchObject({ address: { street: 'Main St' } });
			expect(result).not.toHaveProperty('address.geo');
		});

		it('should leave an exposed field undefined when the source lacks it', async () => {
			const result = (await run(UserDto, { id: 'u1' })) as UserDto;

			expect(result.name).toBeUndefined();
		});
	});

	describe('transformation', () => {
		it('should return an instance of the dto', async () => {
			const result = await run(UserDto, userFactory());

			expect(result).toBeInstanceOf(UserDto);
		});

		it('should turn nested objects into the @Type class', async () => {
			const result = (await run(UserDto, userFactory())) as UserDto;

			expect(result.address).toBeInstanceOf(AddressDto);
		});

		it('should transform every item of an array', async () => {
			const result = (await run(UserDto, [
				userFactory({ id: 'u1', password: 'a' }),
				userFactory({ id: 'u2', password: 'b' }),
			])) as UserDto[];

			expect(result).toHaveLength(2);
			expect(result.map((u) => u.id)).toEqual(['u1', 'u2']);
			result.forEach((u) => {
				expect(u).toBeInstanceOf(UserDto);
				expect(u).not.toHaveProperty('password');
			});
		});

		it('should return an empty array for an empty array', async () => {
			expect(await run(UserDto, [])).toEqual([]);
		});

		it.each([
			['null', null],
			['undefined', undefined],
		])('should pass %s through without throwing', async (_label, data) => {
			expect(await run(UserDto, data)).toBe(data);
		});
	});

	describe('handler behavior', () => {
		it('should call the handler once', async () => {
			const handler = { handle: jest.fn(() => of(userFactory())) };

			await lastValueFrom(
				new SerializeInterceptor(UserDto).intercept(context, handler as CallHandler<unknown>),
			);

			expect(handler.handle).toHaveBeenCalledTimes(1);
		});

		it('should let errors from the handler through unchanged', async () => {
			const error = new Error('boom');
			const handler: CallHandler<unknown> = { handle: () => throwError(() => error) };

			await expect(
				lastValueFrom(new SerializeInterceptor(UserDto).intercept(context, handler)),
			).rejects.toBe(error);
		});
	});
});

describe('UseResources', () => {
	class SampleController {
		@UseResources(UserDto)
		handler(): void {}
	}

	it('should attach a SerializeInterceptor to the route handler', () => {
		const interceptors = Reflect.getMetadata(
			'__interceptors__',
			SampleController.prototype.handler,
		) as unknown[];

		expect(interceptors).toHaveLength(1);
		expect(interceptors[0]).toBeInstanceOf(SerializeInterceptor);
	});
});

describe('SerializeInterceptor with TodoResourceDto', () => {
	const itemFactory = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
		id: '7c2f1e0a-0000-4000-8000-000000000001',
		name: 'buy milk',
		description: 'two bottles',
		createdDate: new Date('2026-11-20T00:00:00Z'),
		createdBy: '11111111-1111-4111-8111-111111111111',
		updatedDate: new Date('2026-11-21T00:00:00Z'),
		updatedBy: '22222222-2222-4222-8222-222222222222',
		status: true,
		deletedDate: null,
		deletedBy: null,
		...overrides,
	});

	const responseFactory = (items: Record<string, unknown>[]): Record<string, unknown> => ({
		data: items,
		links: { first: '/api/v1/todos?page=1&limit=10' },
		meta: { itemCount: items.length, totalItems: items.length },
		status: { code: 200, message: 'OK' },
	});

	const runTodo = async (response: Record<string, unknown>): Promise<TodoResourceDto> =>
		(await run(TodoResourceDto, response)) as TodoResourceDto;

	it('should keep status, meta, links and data of the paginated response', async () => {
		const result = await runTodo(responseFactory([itemFactory()]));

		expect(result.status).toEqual({ code: 200, message: 'OK' });
		expect(result.meta).toEqual({ itemCount: 1, totalItems: 1 });
		expect(result.links).toEqual({ first: '/api/v1/todos?page=1&limit=10' });
		expect(result.data).toHaveLength(1);
	});

	it('should expose only the documented todo fields', async () => {
		const result = await runTodo(responseFactory([itemFactory()]));

		expect(Object.keys(result.data[0]).sort()).toEqual(
			[
				'id',
				'isActive',
				'name',
				'description',
				'createdDate',
				'createdBy',
				'updatedDate',
				'updatedBy',
			].sort(),
		);
	});

	it('should never expose deletion fields', async () => {
		const result = await runTodo(
			responseFactory([itemFactory({ deletedDate: new Date(), deletedBy: 'x' })]),
		);

		expect(result.data[0]).not.toHaveProperty('deletedDate');
		expect(result.data[0]).not.toHaveProperty('deletedBy');
	});

	it('should turn each item into a TodoDto', async () => {
		const result = await runTodo(responseFactory([itemFactory(), itemFactory({ name: 'b' })]));

		result.data.forEach((todo) => expect(todo).toBeInstanceOf(TodoDto));
	});

	// Current behavior: the dto exposes `isActive`, but the entity column is
	// called `status`, so the item's `status` is dropped and `isActive` is empty.
	it('should drop the item status and leave isActive empty', async () => {
		const result = await runTodo(responseFactory([itemFactory({ status: true })]));

		expect(result.data[0]).not.toHaveProperty('status');
		expect(result.data[0].isActive).toBeUndefined();
	});

	it('should return an empty data list for an empty page', async () => {
		const result = await runTodo(responseFactory([]));

		expect(result.data).toEqual([]);
	});
});
