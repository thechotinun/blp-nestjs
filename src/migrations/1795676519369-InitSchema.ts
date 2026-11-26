import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1795676519369 implements MigrationInterface {
	name = 'InitSchema1795676519369';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "todos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "createdBy" uuid NOT NULL, "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedBy" uuid NOT NULL, "deletedDate" TIMESTAMP, "deletedBy" uuid, "status" boolean NOT NULL DEFAULT true, "name" character varying(50) NOT NULL, "description" text, CONSTRAINT "PK_ca8cafd59ca6faaf67995344225" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "UQ_todos_name_active" ON "todos"  ("name") WHERE "deletedDate" IS NULL`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX "public"."UQ_todos_name_active"`);
		await queryRunner.query(`DROP TABLE "todos"`);
	}
}
