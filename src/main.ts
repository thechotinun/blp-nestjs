import { NestFactory } from '@nestjs/core';
import { useContainer } from 'class-validator';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './modules/app/app.module';
import { ConfigService } from '@nestjs/config';
import { VersioningType } from '@nestjs/common';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	useContainer(app.select(AppModule), { fallbackOnErrors: true });
	const configService = app.get<ConfigService>(ConfigService);

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

	await app.listen(configService.get('port') ?? 3100);
}
void bootstrap();
