import { join } from 'path';
import { DataSource } from 'typeorm';

/**
 * DataSource used by the TypeORM CLI only (see the `migration:*` npm scripts).
 * The app itself gets its options from TypeOrmConfigService.
 *
 * The CLI does not run through Nest, so ConfigModule does not load .env here.
 * Variables already set in the shell or CI win over the file.
 */
try {
	process.loadEnvFile('.env');
} catch {
	// no .env file: rely on the environment
}

export default new DataSource({
	type: 'postgres',
	host: process.env.DATABASE_HOST,
	port: parseInt(process.env.DATABASE_PORT || '5432', 10),
	username: process.env.DATABASE_USER,
	password: process.env.DATABASE_PASSWORD,
	database: process.env.DATABASE_NAME,
	// __dirname based so the same file works from src/ (ts-node) and from dist/ (js)
	entities: [join(__dirname, '..', '..', 'entities', '*.entity.{ts,js}')],
	migrations: [join(__dirname, '..', '..', 'migrations', '*.{ts,js}')],
	// schema changes go through migrations only
	synchronize: false,
});
