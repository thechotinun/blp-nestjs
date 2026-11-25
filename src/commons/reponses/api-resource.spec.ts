import { HttpStatus } from '@nestjs/common';
import { ApiResource } from './api-resource';

const ok = { code: HttpStatus.OK, message: 'OK' };

describe('ApiResource', () => {
	describe('successResponse', () => {
		it('returns only status without data', () => {
			expect(ApiResource.successResponse()).toEqual({ status: ok });
		});

		it('returns only status for null', () => {
			expect(ApiResource.successResponse(null)).toEqual({ status: ok });
		});

		it('wraps a plain object in data', () => {
			const todo = { id: '1', name: 'test' };

			expect(ApiResource.successResponse(todo)).toEqual({
				data: todo,
				status: ok,
			});
		});

		it('wraps an array in data', () => {
			const list = [{ id: 1 }, { id: 2 }];

			expect(ApiResource.successResponse(list)).toEqual({
				data: list,
				status: ok,
			});
		});

		it('treats an object with a non-array items field as plain data', () => {
			const data = { items: 'not-an-array', name: 'test' };

			expect(ApiResource.successResponse(data)).toEqual({ data, status: ok });
		});

		it('maps a pagination result to data, meta and links', () => {
			const items = [{ id: 1 }];
			const meta = {
				itemCount: 1,
				totalItems: 1,
				itemsPerPage: 10,
				totalPages: 1,
				currentPage: 1,
			};
			const links = { first: '/todos?page=1&perPage=10' };

			const result = ApiResource.successResponse({ items, meta, links });

			expect(result).toEqual({ data: items, meta, links, status: ok });
			expect(result).not.toHaveProperty('items');
		});

		it('keeps data as an empty array for an empty page', () => {
			const result = ApiResource.successResponse({
				items: [],
				meta: { itemCount: 0, itemsPerPage: 10, currentPage: 1 },
			});

			expect(result.data).toEqual([]);
		});
	});

	describe('errorResponse', () => {
		it('rethrows the same error', () => {
			const error = new Error('boom');

			expect(() => ApiResource.errorResponse(error)).toThrow(error);
		});

		it('rethrows non-Error values as they are', () => {
			expect.assertions(1);

			try {
				ApiResource.errorResponse('oops');
			} catch (e) {
				expect(e).toBe('oops');
			}
		});
	});
});
