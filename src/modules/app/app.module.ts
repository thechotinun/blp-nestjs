import { Module } from '@nestjs/common';
import configuration from '@config/configuration';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import TypeOrmConfigService from '@config/typeorm/default';
import { APP_FILTER } from '@nestjs/core';
import { ExceptionFilter } from '@exceptions/exception.filter';
import { DataSource } from 'typeorm';
import { AppController } from './controllers/app.controller';
import { AppService } from './services/app.service';
import { TodoModule } from '@modules/todo/todo.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			envFilePath: '.env',
			load: [configuration],
			isGlobal: true,
		}),
		TypeOrmModule.forRootAsync({
			useClass: TypeOrmConfigService,
			dataSourceFactory: async (options) => {
				if (!options) throw new Error('Missing TypeORM options');
				return await new DataSource(options).initialize();
			},
		}),
		TodoModule,
	],
	controllers: [AppController],
	providers: [
		AppService,
		{
			provide: APP_FILTER,
			useClass: ExceptionFilter,
		},
	],
})
export class AppModule {}
