import { HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '../constants/error-codes.constant';
import { ApiException } from './api.exception';
import { TodoException } from './todo.exception';

describe('TodoException', () => {
	describe.each([
		['notFound', () => TodoException.notFound(), 100101, HttpStatus.NOT_FOUND],
		['findError', () => TodoException.findError(), 100106, HttpStatus.INTERNAL_SERVER_ERROR],
		['exist', () => TodoException.exist(), 100105, HttpStatus.CONFLICT],
		['createError', () => TodoException.createError(), 100103, HttpStatus.UNPROCESSABLE_ENTITY],
		['updateError', () => TodoException.updateError(), 100104, HttpStatus.UNPROCESSABLE_ENTITY],
		['deleteError', () => TodoException.deleteError(), 100102, HttpStatus.UNPROCESSABLE_ENTITY],
	])('%s', (_name, factory, errorCode, httpStatus) => {
		it('should return an ApiException', () => {
			expect(factory()).toBeInstanceOf(ApiException);
		});

		it(`should use error code ${errorCode}`, () => {
			expect(factory().getResponse()).toMatchObject({
				errorCode,
				errorMessage: ErrorCodes[errorCode],
			});
		});

		it(`should respond with HTTP ${httpStatus}`, () => {
			expect(factory().getStatus()).toBe(httpStatus);
		});

		it('should have no errors by default', () => {
			expect(factory().getResponse()).toMatchObject({ errors: [] });
		});
	});

	describe('factories that accept errors', () => {
		it.each([
			['createError', TodoException.createError],
			['updateError', TodoException.updateError],
			['deleteError', TodoException.deleteError],
		])('%s should pass the given errors on', (_name, factory) => {
			expect(factory(['reason']).getResponse()).toMatchObject({
				errors: ['reason'],
			});
		});
	});
});
