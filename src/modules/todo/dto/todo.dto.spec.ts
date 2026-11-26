import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTodoDto } from './create-todo.dto';
import { UpdateTodoDto } from './update-todo.dto';

// Same options as configureApp() in src/app.setup.ts
const appPipe = () =>
	new ValidationPipe({
		transform: true,
		transformOptions: { exposeDefaultValues: true },
		whitelist: true,
	});

describe.each([
	['CreateTodoDto', CreateTodoDto],
	['UpdateTodoDto', UpdateTodoDto],
])('%s', (_label, Dto) => {
	const errorsOf = async (plain: Record<string, unknown>) => validate(plainToInstance(Dto, plain));

	describe('name', () => {
		it('should accept a name of 1 to 50 characters', async () => {
			expect(await errorsOf({ name: 'a' })).toHaveLength(0);
			expect(await errorsOf({ name: 'a'.repeat(50) })).toHaveLength(0);
		});

		it.each([
			['missing', {}],
			['an empty string', { name: '' }],
			['null', { name: null }],
		])('should reject a name that is %s', async (_case, plain) => {
			const errors = await errorsOf(plain);

			expect(errors).toHaveLength(1);
			expect(errors[0].property).toBe('name');
			expect(errors[0].constraints).toHaveProperty('isNotEmpty');
		});

		it('should reject a name longer than 50 characters', async () => {
			const errors = await errorsOf({ name: 'a'.repeat(51) });

			expect(errors[0].property).toBe('name');
			expect(errors[0].constraints).toHaveProperty('maxLength');
		});

		it('should reject a name that is not a string', async () => {
			const errors = await errorsOf({ name: 123 });

			expect(errors[0].property).toBe('name');
			expect(errors[0].constraints).toHaveProperty('maxLength');
		});
	});

	describe('description', () => {
		it.each([
			['omitted', {}],
			['null', { description: null }],
			['a string', { description: 'two bottles' }],
		])('should accept a description that is %s', async (_case, extra) => {
			expect(await errorsOf({ name: 'a', ...extra })).toHaveLength(0);
		});
	});

	describe('with the application ValidationPipe', () => {
		const metadata = { type: 'body' as const, metatype: Dto };

		it('should return an instance of the dto for a valid body', async () => {
			const result: unknown = await appPipe().transform({ name: 'a', description: 'b' }, metadata);

			expect(result).toBeInstanceOf(Dto);
			expect(result).toMatchObject({ name: 'a', description: 'b' });
		});

		it('should strip properties the dto does not declare', async () => {
			const result: unknown = await appPipe().transform(
				{ name: 'a', id: 'x', createdBy: 'hacker', status: false },
				metadata,
			);

			expect(result).not.toHaveProperty('id');
			expect(result).not.toHaveProperty('createdBy');
			expect(result).not.toHaveProperty('status');
		});

		it('should reject an invalid body with a 400 and field messages', async () => {
			const rejected = appPipe().transform({ name: '' }, metadata);

			await expect(rejected).rejects.toBeInstanceOf(BadRequestException);
			await expect(rejected).rejects.toMatchObject({
				response: { message: ['name should not be empty'] },
			});
		});
	});
});

describe('UpdateTodoDto', () => {
	// Current behavior: update is not partial, so `name` is required even when
	// only the description is being changed.
	it('should reject a body that only changes the description', async () => {
		const errors = await validate(plainToInstance(UpdateTodoDto, { description: 'only this' }));

		expect(errors.map((e) => e.property)).toEqual(['name']);
	});
});
