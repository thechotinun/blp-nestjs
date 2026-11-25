import { Repository } from 'typeorm';
import { paginate } from './paginate';

interface Row {
	id: number;
}

const rows = (count: number): Row[] => Array.from({ length: count }, (_, i) => ({ id: i + 1 }));

function mockRepo(items: Row[], total: number) {
	const findAndCount = jest.fn().mockResolvedValue([items, total]);
	const repo = { findAndCount } as unknown as Repository<Row>;

	return { repo, findAndCount };
}

describe('paginate', () => {
	describe('query', () => {
		it('converts page/limit to skip/take', async () => {
			const { repo, findAndCount } = mockRepo(rows(10), 25);

			await paginate(repo, { page: 3, limit: 10 });

			expect(findAndCount).toHaveBeenCalledWith({ skip: 20, take: 10 });
		});

		it('starts from skip 0 on the first page', async () => {
			const { repo, findAndCount } = mockRepo([], 0);

			await paginate(repo, { page: 1, limit: 5 });

			expect(findAndCount).toHaveBeenCalledWith({ skip: 0, take: 5 });
		});

		it('passes find options through', async () => {
			const { repo, findAndCount } = mockRepo([], 0);

			await paginate(repo, { page: 1, limit: 10 }, { where: { id: 1 } });

			expect(findAndCount).toHaveBeenCalledWith({
				where: { id: 1 },
				skip: 0,
				take: 10,
			});
		});

		it('does not let options override skip/take', async () => {
			const { repo, findAndCount } = mockRepo([], 0);

			await paginate(repo, { page: 2, limit: 10 }, { skip: 999, take: 999 });

			expect(findAndCount).toHaveBeenCalledWith({ skip: 10, take: 10 });
		});
	});

	describe('result', () => {
		it('returns items and meta', async () => {
			const items = rows(10);
			const { repo } = mockRepo(items, 25);

			const result = await paginate(repo, { page: 2, limit: 10 });

			expect(result.items).toBe(items);
			expect(result.meta).toEqual({
				itemCount: 10,
				totalItems: 25,
				itemsPerPage: 10,
				totalPages: 3,
				currentPage: 2,
			});
		});

		it('uses the real item count on the last page', async () => {
			const { repo } = mockRepo(rows(5), 25);

			const result = await paginate(repo, { page: 3, limit: 10 });

			expect(result.meta.itemCount).toBe(5);
			expect(result.meta.totalPages).toBe(3);
		});

		it('returns zero pages for an empty result', async () => {
			const { repo } = mockRepo([], 0);

			const result = await paginate(repo, { page: 1, limit: 10 });

			expect(result.items).toEqual([]);
			expect(result.meta).toMatchObject({ itemCount: 0, totalPages: 0 });
		});
	});

	describe('links', () => {
		it('is undefined without a route', async () => {
			const { repo } = mockRepo(rows(10), 25);

			const result = await paginate(repo, { page: 1, limit: 10 });

			expect(result.links).toBeUndefined();
		});

		it('has previous and next in the middle', async () => {
			const { repo } = mockRepo(rows(10), 25);

			const result = await paginate(repo, { page: 2, limit: 10 }, {}, '/api/v1/todos');

			expect(result.links).toEqual({
				first: '/api/v1/todos?page=1&perPage=10',
				previous: '/api/v1/todos?page=1&perPage=10',
				next: '/api/v1/todos?page=3&perPage=10',
				last: '/api/v1/todos?page=3&perPage=10',
			});
		});

		it('has no previous on the first page', async () => {
			const { repo } = mockRepo(rows(10), 25);

			const result = await paginate(repo, { page: 1, limit: 10 }, {}, '/todos');

			expect(result.links?.previous).toBeUndefined();
			expect(result.links?.next).toBe('/todos?page=2&perPage=10');
		});

		it('has no next on the last page', async () => {
			const { repo } = mockRepo(rows(5), 25);

			const result = await paginate(repo, { page: 3, limit: 10 }, {}, '/todos');

			expect(result.links?.previous).toBe('/todos?page=2&perPage=10');
			expect(result.links?.next).toBeUndefined();
		});

		it('points first and last to page 1 when empty', async () => {
			const { repo } = mockRepo([], 0);

			const result = await paginate(repo, { page: 1, limit: 10 }, {}, '/todos');

			expect(result.links).toEqual({
				first: '/todos?page=1&perPage=10',
				previous: undefined,
				next: undefined,
				last: '/todos?page=1&perPage=10',
			});
		});
	});
});
