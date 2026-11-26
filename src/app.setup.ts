import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';

/**
 * Global app configuration shared by main.ts and tests, so tests run against
 * an app configured the same way as production.
 */
export function configureApp(app: INestApplication): void {
	app.enableCors({
		origin: '*',
		methods: 'GET, PUT, PATCH, POST, DELETE',
	});

	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
			transformOptions: { exposeDefaultValues: true },
			whitelist: true,
		}),
	);

	app.setGlobalPrefix('api');
	app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
}
