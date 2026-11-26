import { UseInterceptors, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ClassConstructor, plainToInstance } from 'class-transformer';

export class SerializeInterceptor<T = unknown> implements NestInterceptor {
	constructor(private dto: ClassConstructor<T>) {}

	intercept(_context: ExecutionContext, handler: CallHandler<unknown>): Observable<T | T[]> {
		return handler.handle().pipe(
			map((data: unknown) => {
				return plainToInstance(this.dto, data, {
					excludeExtraneousValues: true,
				});
			}),
		);
	}
}

export function UseResources<T>(dto: ClassConstructor<T>) {
	return UseInterceptors(new SerializeInterceptor(dto));
}
