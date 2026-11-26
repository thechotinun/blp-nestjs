import { FindManyOptions, ObjectLiteral, Repository } from 'typeorm';
import { PaginateQuery } from '../dto/paginate.query';
import { Pagination, PaginationLinks } from '../interfaces/pagination.interface';

function buildLinks(
	route: string,
	page: number,
	limit: number,
	totalPages: number,
): PaginationLinks {
	const link = (p: number) => `${route}?page=${p}&perPage=${limit}`;
	const lastPage = Math.max(totalPages, 1);

	return {
		first: link(1),
		previous: page > 1 ? link(page - 1) : undefined,
		next: page < totalPages ? link(page + 1) : undefined,
		last: link(lastPage),
	};
}

export async function paginate<T extends ObjectLiteral>(
	repo: Repository<T>,
	{ page, limit }: PaginateQuery,
	options: FindManyOptions<T> = {},
	route?: string,
): Promise<Pagination<T>> {
	const [items, totalItems] = await repo.findAndCount({
		...options,
		skip: (page - 1) * limit,
		take: limit,
	});
	const totalPages = Math.ceil(totalItems / limit);

	return {
		items,
		meta: {
			itemCount: items.length,
			totalItems,
			itemsPerPage: limit,
			totalPages,
			currentPage: page,
		},
		links: route ? buildLinks(route, page, limit, totalPages) : undefined,
	};
}
