import configuration from './configuration';
import * as packageJson from '../../package.json';

const ENV_KEYS = [
	'NODE_ENV',
	'APP_URL',
	'PORT',
	'DATABASE_TYPE',
	'DATABASE_HOST',
	'DATABASE_PORT',
	'DATABASE_NAME',
	'DATABASE_NAME_TEST',
	'DATABASE_USER',
	'DATABASE_PASSWORD',
	'DATABASE_SYNC',
	'JWT_ACCESS_SECRET',
	'JWT_ACCESS_EXPIRE',
	'JWT_REFRESH_SECRET',
	'JWT_REFRESH_EXPIRE',
	'PER_PAGE',
] as const;

describe('configuration', () => {
	const originalEnv: Record<string, string | undefined> = {};

	beforeAll(() => {
		ENV_KEYS.forEach((key) => {
			originalEnv[key] = process.env[key];
		});
	});

	beforeEach(() => {
		ENV_KEYS.forEach((key) => {
			delete process.env[key];
		});
	});

	afterAll(() => {
		ENV_KEYS.forEach((key) => {
			if (originalEnv[key] === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = originalEnv[key];
			}
		});
	});

	describe('defaults', () => {
		it('should expose name and version from package.json', () => {
			const result = configuration();

			expect(result.name).toBe(packageJson.name);
			expect(result.version).toBe(packageJson.version);
		});

		it('should fall back to default APP_URL and port', () => {
			const result = configuration();

			expect(result.APP_URL).toBe('http://localhost:3000');
			expect(result.port).toBe(3000);
		});

		it('should fall back to default database port', () => {
			expect(configuration().database.port).toBe(5432);
		});

		it('should leave unset database values undefined and sync false', () => {
			const { database } = configuration();

			expect(database.type).toBeUndefined();
			expect(database.host).toBeUndefined();
			expect(database.name).toBeUndefined();
			expect(database.username).toBeUndefined();
			expect(database.password).toBeUndefined();
			expect(database.sync).toBe(false);
		});

		it('should fall back to default jwt expiry', () => {
			const { jwt } = configuration();

			expect(jwt.access.expire).toBe('15m');
			expect(jwt.refresh.expire).toBe('1h');
			expect(jwt.access.secret).toBeUndefined();
			expect(jwt.refresh.secret).toBeUndefined();
		});

		it('should fall back to default PER_PAGE of 30', () => {
			expect(configuration().PER_PAGE).toBe(30);
		});

		it('should expose NODE_ENV as mode', () => {
			process.env.NODE_ENV = 'production';

			expect(configuration().mode).toBe('production');
		});
	});

	describe('env overrides', () => {
		it('should use APP_URL from env', () => {
			process.env.APP_URL = 'https://api.example.com';

			expect(configuration().APP_URL).toBe('https://api.example.com');
		});

		it('should parse PORT as number', () => {
			process.env.PORT = '8080';

			expect(configuration().port).toBe(8080);
		});

		it('should parse DATABASE_PORT as number', () => {
			process.env.DATABASE_PORT = '6543';

			expect(configuration().database.port).toBe(6543);
		});

		it('should map database credentials from env', () => {
			process.env.DATABASE_TYPE = 'postgres';
			process.env.DATABASE_HOST = 'db.local';
			process.env.DATABASE_USER = 'admin';
			process.env.DATABASE_PASSWORD = 's3cret';

			const { database } = configuration();

			expect(database).toMatchObject({
				type: 'postgres',
				host: 'db.local',
				username: 'admin',
				password: 's3cret',
			});
		});

		it('should set sync true only when DATABASE_SYNC is "true"', () => {
			process.env.DATABASE_SYNC = 'true';
			expect(configuration().database.sync).toBe(true);

			process.env.DATABASE_SYNC = 'false';
			expect(configuration().database.sync).toBe(false);

			process.env.DATABASE_SYNC = '1';
			expect(configuration().database.sync).toBe(false);
		});

		it('should map jwt secrets and expiry from env', () => {
			process.env.JWT_ACCESS_SECRET = 'access-secret';
			process.env.JWT_ACCESS_EXPIRE = '5m';
			process.env.JWT_REFRESH_SECRET = 'refresh-secret';
			process.env.JWT_REFRESH_EXPIRE = '7d';

			expect(configuration().jwt).toEqual({
				access: { secret: 'access-secret', expire: '5m' },
				refresh: { secret: 'refresh-secret', expire: '7d' },
			});
		});

		it('should parse PER_PAGE as number', () => {
			process.env.PER_PAGE = '50';

			expect(configuration().PER_PAGE).toBe(50);
		});
	});

	describe('database name selection', () => {
		beforeEach(() => {
			process.env.DATABASE_NAME = 'blp';
			process.env.DATABASE_NAME_TEST = 'blp_test';
		});

		it('should use DATABASE_NAME when not testing', () => {
			process.env.NODE_ENV = 'development';

			expect(configuration().database.name).toBe('blp');
		});

		it('should use DATABASE_NAME_TEST when NODE_ENV is test', () => {
			process.env.NODE_ENV = 'test';

			expect(configuration().database.name).toBe('blp_test');
		});

		it('should throw when NODE_ENV is test and DATABASE_NAME_TEST is missing', () => {
			process.env.NODE_ENV = 'test';
			delete process.env.DATABASE_NAME_TEST;

			expect(() => configuration()).toThrow(/DATABASE_NAME_TEST is not set/);
		});

		it('should throw when NODE_ENV is test and DATABASE_NAME_TEST is empty', () => {
			process.env.NODE_ENV = 'test';
			process.env.DATABASE_NAME_TEST = '';

			expect(() => configuration()).toThrow(/DATABASE_NAME_TEST is not set/);
		});

		it('should not need DATABASE_NAME_TEST outside test mode', () => {
			process.env.NODE_ENV = 'development';
			delete process.env.DATABASE_NAME_TEST;

			expect(() => configuration()).not.toThrow();
		});
	});

	it('should read env at call time, not at import time', () => {
		process.env.PORT = '4000';
		const first = configuration();

		process.env.PORT = '5000';
		const second = configuration();

		expect(first.port).toBe(4000);
		expect(second.port).toBe(5000);
	});
});
