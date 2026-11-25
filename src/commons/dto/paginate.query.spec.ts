import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PaginateQuery } from './paginate.query';

// Same options as the global ValidationPipe in main.ts.
// Without exposeDefaultValues, `limit` would be undefined when `perPage` is absent.
const toQuery = (plain: Record<string, unknown>) =>
	plainToInstance(PaginateQuery, plain, { exposeDefaultValues: true });

describe('PaginateQuery', () => {
	const originalPerPage = process.env.PER_PAGE;

	afterEach(() => {
		if (originalPerPage === undefined) {
			delete process.env.PER_PAGE;
		} else {
			process.env.PER_PAGE = originalPerPage;
		}
	});

	describe('defaults', () => {
		it('uses page 1 and limit 10', () => {
			delete process.env.PER_PAGE;

			const query = toQuery({});

			expect(query.page).toBe(1);
			expect(query.limit).toBe(10);
		});

		it('takes the default limit from PER_PAGE', () => {
			process.env.PER_PAGE = '25';

			expect(toQuery({}).limit).toBe(25);
		});

		it.each(['abc', '0', '-5', '2.5', ''])('falls back to 10 when PER_PAGE is %p', (value) => {
			process.env.PER_PAGE = value;

			expect(toQuery({}).limit).toBe(10);
		});
	});

	describe('transform', () => {
		it('maps perPage to limit and converts strings to numbers', () => {
			const query = toQuery({ page: '2', perPage: '5' });

			expect(query.page).toBe(2);
			expect(query.limit).toBe(5);
		});
	});

	describe('validation', () => {
		it('accepts the defaults', async () => {
			expect(await validate(toQuery({}))).toHaveLength(0);
		});

		it('accepts the max limit of 100', async () => {
			expect(await validate(toQuery({ perPage: '100' }))).toHaveLength(0);
		});

		it.each([
			['page 0', { page: '0' }, 'page'],
			['negative page', { page: '-1' }, 'page'],
			['non-integer page', { page: '1.5' }, 'page'],
			['non-numeric page', { page: 'abc' }, 'page'],
			['perPage 0', { perPage: '0' }, 'limit'],
			['perPage over 100', { perPage: '101' }, 'limit'],
			['non-integer perPage', { perPage: '2.5' }, 'limit'],
		])('rejects %s', async (_name, plain, property) => {
			const errors = await validate(toQuery(plain));

			expect(errors.map((e) => e.property)).toContain(property);
		});
	});
});
