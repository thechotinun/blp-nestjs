import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '../constants/error-codes.constant';
import { ApiException } from './api.exception';

describe('ApiException', () => {
	it('should be an HttpException', () => {
		expect(new ApiException(100101)).toBeInstanceOf(HttpException);
	});

	it('should default to 422 Unprocessable Entity', () => {
		expect(new ApiException(100101).getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
	});

	it('should use the given HTTP status', () => {
		const exception = new ApiException(100101, [], HttpStatus.NOT_FOUND);

		expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
	});

	it('should default errors to an empty list', () => {
		expect(new ApiException(100101).getResponse()).toMatchObject({
			errors: [],
		});
	});

	it('should keep the given errors', () => {
		const exception = new ApiException(100103, ['name is required']);

		expect(exception.getResponse()).toMatchObject({
			errors: ['name is required'],
		});
	});

	it('should map the error message from ErrorCodes', () => {
		const exception = new ApiException(100103);

		expect(exception.getResponse()).toEqual({
			errorCode: 100103,
			errorMessage: ErrorCodes[100103],
			errors: [],
		});
	});

	it('should leave the error message undefined for an unknown code', () => {
		const exception = new ApiException(999999);

		expect(exception.getResponse()).toMatchObject({
			errorCode: 999999,
			errorMessage: undefined,
		});
	});
});
