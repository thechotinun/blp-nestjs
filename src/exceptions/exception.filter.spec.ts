import {
	ArgumentsHost,
	BadRequestException,
	ForbiddenException,
	HttpException,
	NotFoundException,
	UnauthorizedException,
	ValidationError,
} from '@nestjs/common';
import { Response } from 'express';
import { TodoException } from './app/todo.exception';
import { ValidationException } from './customs/validation.exception';
import { ErrorResponseInterface, ExceptionFilter } from './exception.filter';

interface Handled {
	statusCode: number;
	body: ErrorResponseInterface;
	response: {
		status: jest.Mock<unknown, [number]>;
		json: jest.Mock<unknown, [ErrorResponseInterface]>;
	};
}

const handle = (exception: unknown): Handled => {
	const status = jest.fn<unknown, [number]>();
	const json = jest.fn<unknown, [ErrorResponseInterface]>();
	const response = { status, json };
	status.mockReturnValue(response);
	const host = {
		switchToHttp: () => ({ getResponse: () => response as unknown as Response }),
	} as unknown as ArgumentsHost;

	new ExceptionFilter().catch(exception, host);

	return {
		statusCode: status.mock.calls[0]?.[0],
		body: json.mock.calls[0]?.[0],
		response,
	};
};

const validationErrorFactory = (overrides: Partial<ValidationError> = {}): ValidationError => ({
	property: 'name',
	constraints: { isString: 'name must be a string' },
	children: [],
	...overrides,
});

describe('ExceptionFilter', () => {
	describe('non-HTTP errors', () => {
		it('should respond 500 with the error message for an Error', () => {
			const { statusCode, body } = handle(new Error('boom'));

			expect(statusCode).toBe(500);
			expect(body).toEqual({
				status: { code: 500, message: 'Internal Server Error' },
				error: { code: 0, message: 'UNDEFINED_ERROR', errors: ['boom'] },
			});
		});

		it.each([
			['a string', 'oops'],
			['null', null],
			['an object', { a: 1 }],
		])('should respond 500 with no errors for %s', (_label, thrown) => {
			const { statusCode, body } = handle(thrown);

			expect(statusCode).toBe(500);
			expect(body.error).toEqual({
				code: 0,
				message: 'UNDEFINED_ERROR',
				errors: [],
			});
		});
	});

	describe('ValidationException', () => {
		it('should respond with code 900422 and flattened messages', () => {
			const exception = new ValidationException(
				[
					validationErrorFactory(),
					validationErrorFactory({
						property: 'address',
						constraints: undefined,
						children: [
							validationErrorFactory({
								property: 'street',
								constraints: { isString: 'street must be a string' },
							}),
						],
					}),
				],
				422,
			);

			const { statusCode, body } = handle(exception);

			expect(statusCode).toBe(422);
			expect(body).toEqual({
				status: { code: 422, message: 'Unprocessable Entity' },
				error: {
					code: 900422,
					message: 'VALIDATE_ERROR',
					errors: ['name must be a string', 'address.street must be a string'],
				},
			});
		});
	});

	describe('HttpException with message array (ValidationPipe)', () => {
		it('should group messages by field name', () => {
			const exception = new BadRequestException([
				'name must be a string',
				'age must be an integer',
			]);

			const { statusCode, body } = handle(exception);

			expect(statusCode).toBe(400);
			expect(body.status).toEqual({ code: 400, message: 'Bad Request' });
			expect(body.error).toEqual({
				code: 900422,
				message: 'VALIDATE_ERROR',
				errors: {
					name: ['name must be a string'],
					age: ['age must be an integer'],
				},
			});
		});

		// Current behavior: the second message of the same field replaces the first.
		it('should keep only the last message of a field', () => {
			const exception = new BadRequestException([
				'name must be a string',
				'name must be shorter than or equal to 50 characters',
			]);

			const { body } = handle(exception);

			expect(body.error.errors).toEqual({
				name: ['name must be shorter than or equal to 50 characters'],
			});
		});

		// Current behavior: no space means the whole key becomes an empty string.
		it('should use an empty field name when the message has no space', () => {
			const { body } = handle(new BadRequestException(['invalid']));

			expect(body.error.errors).toEqual({ '': ['invalid'] });
		});
	});

	describe('other HttpException', () => {
		it('should use the string message as the only error', () => {
			const { statusCode, body } = handle(new BadRequestException('bad input'));

			expect(statusCode).toBe(400);
			expect(body.error.errors).toEqual(['bad input']);
		});

		it('should use the message of an object response', () => {
			const { body } = handle(new HttpException({ message: 'conflict' }, 409));

			expect(body.status).toEqual({ code: 409, message: 'Conflict' });
			expect(body.error.errors).toEqual(['conflict']);
		});

		it('should have no errors when the response is a plain string', () => {
			const { body } = handle(new HttpException('teapot', 418));

			expect(body.error.errors).toEqual([]);
		});

		it('should read nested error.errors when there is no message', () => {
			const exception = new HttpException({ error: { errors: ['a', 'b'] } }, 400);

			const { body } = handle(exception);

			expect(body.error.errors).toEqual(['a', 'b']);
		});

		// Current behavior: every plain HttpException gets the validate error code.
		it('should respond with code 900422 even for NotFoundException', () => {
			const { statusCode, body } = handle(new NotFoundException());

			expect(statusCode).toBe(404);
			expect(body.status).toEqual({ code: 404, message: 'Not Found' });
			expect(body.error.code).toBe(900422);
		});

		it('should leave the status message undefined for an unmapped status', () => {
			const { statusCode, body } = handle(new HttpException('x', 506));

			expect(statusCode).toBe(506);
			expect(body.status.message).toBeUndefined();
		});
	});

	describe('authorization errors', () => {
		it.each([
			['ForbiddenException', new ForbiddenException('nope'), 403, 'Forbidden'],
			['UnauthorizedException', new UnauthorizedException('login first'), 401, 'Unauthorized'],
		])('should respond with code 900403 for %s', (_name, exception, code, text) => {
			const { statusCode, body } = handle(exception);

			expect(statusCode).toBe(code);
			expect(body.status).toEqual({ code, message: text });
			expect(body.error.code).toBe(900403);
			expect(body.error.message).toBe('UNAUTHORIZED');
		});
	});

	describe('ApiException', () => {
		it('should use its own code, message, errors and status', () => {
			const { statusCode, body } = handle(TodoException.createError(['reason']));

			expect(statusCode).toBe(422);
			expect(body).toEqual({
				status: { code: 422, message: 'Unprocessable Entity' },
				error: {
					code: 100103,
					message: 'TODO_CREATE_ERROR',
					errors: ['reason'],
				},
			});
		});

		it('should respond 404 for TodoException.notFound()', () => {
			const { statusCode, body } = handle(TodoException.notFound());

			expect(statusCode).toBe(404);
			expect(body.error).toEqual({
				code: 100101,
				message: 'TODO_NOT_FOUND',
				errors: [],
			});
		});

		it('should respond 409 for TodoException.exist()', () => {
			const { statusCode, body } = handle(TodoException.exist());

			expect(statusCode).toBe(409);
			expect(body.error.code).toBe(100105);
		});

		it('should respond 500 for TodoException.findError()', () => {
			const { statusCode, body } = handle(TodoException.findError());

			expect(statusCode).toBe(500);
			expect(body.error.code).toBe(100106);
		});
	});

	it('should send exactly one response', () => {
		const { response } = handle(new Error('boom'));

		expect(response.status).toHaveBeenCalledTimes(1);
		expect(response.json).toHaveBeenCalledTimes(1);
	});
});
