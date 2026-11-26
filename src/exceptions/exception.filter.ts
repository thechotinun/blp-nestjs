import {
	ExceptionFilter as ExceptionFilterInterface,
	Catch,
	ArgumentsHost,
	HttpException,
	HttpStatus,
	ValidationError,
	ForbiddenException,
	UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { FlattenValidationErrors, ValidationException } from './customs/validation.exception';
import { get } from 'lodash';
import { HttpStatusMessages } from './constants/http-status-messages.constant';
import { ErrorCodes } from './constants/error-codes.constant';
import { ApiException } from './app/api.exception';

@Catch()
export class ExceptionFilter implements ExceptionFilterInterface {
	/**
	 * Catchs all exception filter
	 * @param exception
	 * @param host
	 */
	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();

		let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
		let errorCode = 0;
		let errorMessage: string = ErrorCodes[errorCode];
		let errors: ErrorDetails = [];

		if (exception instanceof Error) {
			errors = [exception.message];
		}

		if (exception instanceof HttpException) {
			const handleResponse = this.handleHttpException(exception);
			statusCode = handleResponse.statusCode;
			errorCode = handleResponse.errorCode;
			errorMessage = handleResponse.errorMessage;
			errors = handleResponse.errors;
		}

		const payload: ErrorResponseInterface = {
			status: {
				code: statusCode,
				message: HttpStatusMessages[statusCode],
			},
			error: {
				code: errorCode,
				message: errorMessage,
				errors,
			},
		};

		response.status(statusCode).json(payload);
	}

	/**
	 * Handles http exception
	 * @param exception
	 * @returns HandleHttpExceptionResponseInterface
	 */
	private handleHttpException(exception: HttpException): HandleHttpExceptionResponseInterface {
		if (exception instanceof ValidationException) {
			const validationErrors = exception.getResponse() as ValidationError[];

			return {
				statusCode: exception.getStatus(),
				errorCode: 900422,
				errorMessage: ErrorCodes[900422],
				errors: new FlattenValidationErrors(validationErrors).messages(),
			};
		}

		const exceptionResponse: HttpExceptionResponseInterface =
			exception.getResponse() as HttpExceptionResponseInterface;

		let errorCode = 900422;
		let errorMessage: string = ErrorCodes[errorCode];
		let errors: ErrorDetails;

		if (Array.isArray(exceptionResponse.message)) {
			const fieldErrors: Record<string, string[]> = {};

			exceptionResponse.message.forEach((message) => {
				const fieldName = message.substring(0, message.indexOf(' '));

				fieldErrors[fieldName] = [message];
			});
			errors = fieldErrors;
		} else {
			errors = exceptionResponse.message
				? [exceptionResponse.message]
				: get(exception.getResponse(), 'error.errors', []);
		}

		if (exception instanceof ForbiddenException || exception instanceof UnauthorizedException) {
			errorCode = 900403;
			errorMessage = ErrorCodes[errorCode];
		}

		if (exception instanceof ApiException) {
			errorCode = exceptionResponse.errorCode;
			errorMessage = exceptionResponse.errorMessage;
			errors = exceptionResponse.errors;
		}

		return {
			statusCode: exception.getStatus(),
			errorCode,
			errorMessage,
			errors,
		};
	}
}

export type ErrorDetails = string[] | Record<string, string[]>;

interface HandleHttpExceptionResponseInterface {
	statusCode: number;
	errorCode: number;
	errorMessage: string;
	errors: ErrorDetails;
}

export interface HttpExceptionResponseInterface {
	errorCode: number;
	errorMessage: string;
	errors: ErrorDetails;
	message?: string | string[];
}

export interface ErrorResponseInterface {
	status: { code: number; message: string };
	error: { code: number; message: string; errors: ErrorDetails };
}
