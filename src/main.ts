import { NestFactory } from '@nestjs/core';
import { useContainer } from 'class-validator';
import { AppModule } from './modules/app/app.module';
import { ConfigService } from '@nestjs/config';
import { configureApp } from './app.setup';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	useContainer(app.select(AppModule), { fallbackOnErrors: true });
	const configService = app.get<ConfigService>(ConfigService);

	configureApp(app);

	await app.listen(configService.get('port') ?? 3100);
}
void bootstrap();
