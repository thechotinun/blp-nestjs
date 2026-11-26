import type { ConfigService } from '@nestjs/config';
import TypeOrmConfigService from './default';

// @nestjs/* v12 is ESM-only and jest runs CommonJS, so the real packages
// cannot be loaded here. Only the decorator/DI wiring is replaced; the
// service logic under test is untouched.
jest.mock('@nestjs/common', () => ({ Injectable: () => () => undefined }));
jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));

type ConfigValues = Record<string, unknown>;

const configServiceFactory = (values: ConfigValues): ConfigService =>
	({
		get: jest.fn((key: string) => values[key]),
	}) as unknown as ConfigService;

const valuesFactory = (overrides: ConfigValues = {}): ConfigValues => ({
	mode: 'development',
	'database.type': 'postgres',
	'database.host': 'localhost',
	'database.port': 5432,
	'database.username': 'admin',
	'database.password': 's3cret',
	'database.name': 'blp',
	'database.sync': false,
	...overrides,
});

describe('TypeOrmConfigService', () => {
	describe('createTypeOrmOptions', () => {
		it('should build options from config values', () => {
			const service = new TypeOrmConfigService(configServiceFactory(valuesFactory()));

			expect(service.createTypeOrmOptions()).toMatchObject({
				type: 'postgres',
				host: 'localhost',
				port: 5432,
				username: 'admin',
				password: 's3cret',
				database: 'blp',
				synchronize: false,
			});
		});

		it('should read every value through ConfigService keys', () => {
			const configService = configServiceFactory(valuesFactory());
			const service = new TypeOrmConfigService(configService);

			service.createTypeOrmOptions();

			const keys = jest.mocked(configService.get).mock.calls.map(([k]) => k);
			expect(keys).toEqual(
				expect.arrayContaining([
					'mode',
					'database.type',
					'database.host',
					'database.port',
					'database.username',
					'database.password',
					'database.name',
					'database.sync',
				]),
			);
		});

		it('should point entities glob at *.entity.{js,ts} files', () => {
			const service = new TypeOrmConfigService(configServiceFactory(valuesFactory()));

			const { entities } = service.createTypeOrmOptions();

			expect(entities).toHaveLength(1);
			expect((entities as string[])[0]).toMatch(/\*\*\/\*\.entity\.\{js,ts\}$/);
		});

		it('should pass synchronize true when database.sync is true', () => {
			const service = new TypeOrmConfigService(
				configServiceFactory(valuesFactory({ 'database.sync': true })),
			);

			expect(service.createTypeOrmOptions().synchronize).toBe(true);
		});

		it('should keep database name and sync in test mode', () => {
			const service = new TypeOrmConfigService(
				configServiceFactory(
					valuesFactory({
						mode: 'test',
						'database.name': 'blp_test',
						'database.sync': true,
					}),
				),
			);

			expect(service.createTypeOrmOptions()).toMatchObject({
				database: 'blp_test',
				synchronize: true,
			});
		});

		it('should return same options in test and non-test mode for same values', () => {
			const dev = new TypeOrmConfigService(
				configServiceFactory(valuesFactory({ mode: 'development' })),
			).createTypeOrmOptions();
			const test = new TypeOrmConfigService(
				configServiceFactory(valuesFactory({ mode: 'test' })),
			).createTypeOrmOptions();

			expect(test).toEqual(dev);
		});

		it('should return undefined fields when config is missing', () => {
			const service = new TypeOrmConfigService(configServiceFactory({}));

			expect(service.createTypeOrmOptions()).toMatchObject({
				type: undefined,
				host: undefined,
				port: undefined,
				database: undefined,
			});
		});
	});
});
