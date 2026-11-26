import { Injectable } from '@nestjs/common';
import {
	EntityManager,
	Repository,
	type EntityTarget,
	type ObjectLiteral,
	type QueryRunner,
} from 'typeorm';

@Injectable()
export class BaseRepository<Entity extends ObjectLiteral> extends Repository<Entity> {
	constructor(
		private entity: EntityTarget<Entity>,
		manager: EntityManager,
		queryRunner?: QueryRunner,
	) {
		super(entity, manager, queryRunner);
	}
}
