import { ValidationError } from '@nestjs/common';
import { FlattenValidationErrors, ValidationException } from './validation.exception';

const validationErrorFactory = (overrides: Partial<ValidationError> = {}): ValidationError => ({
	property: 'name',
	constraints: { isString: 'name must be a string' },
	children: [],
	...overrides,
});

describe('ValidationException', () => {
	it('should keep the given status', () => {
		const exception = new ValidationException([], 422);

		expect(exception.getStatus()).toBe(422);
	});

	it('should expose the validation errors as response', () => {
		const errors = [validationErrorFactory()];

		const exception = new ValidationException(errors, 422);

		expect(exception.getResponse()).toBe(errors);
	});
});

describe('FlattenValidationErrors', () => {
	describe('messages', () => {
		it('should return an empty list when there are no errors', () => {
			expect(new FlattenValidationErrors([]).messages()).toEqual([]);
		});

		it('should return the constraint message of a flat error', () => {
			const errors = [validationErrorFactory()];

			expect(new FlattenValidationErrors(errors).messages()).toEqual(['name must be a string']);
		});

		it('should return every constraint of one property', () => {
			const errors = [
				validationErrorFactory({
					constraints: {
						isString: 'name must be a string',
						maxLength: 'name must be shorter than or equal to 50 characters',
					},
				}),
			];

			expect(new FlattenValidationErrors(errors).messages()).toEqual([
				'name must be a string',
				'name must be shorter than or equal to 50 characters',
			]);
		});

		it('should return messages of several properties in order', () => {
			const errors = [
				validationErrorFactory(),
				validationErrorFactory({
					property: 'age',
					constraints: { isInt: 'age must be an integer' },
				}),
			];

			expect(new FlattenValidationErrors(errors).messages()).toEqual([
				'name must be a string',
				'age must be an integer',
			]);
		});

		it('should skip an error without constraints', () => {
			const errors = [
				validationErrorFactory({ constraints: undefined }),
				validationErrorFactory({
					property: 'age',
					constraints: { isInt: 'age must be an integer' },
				}),
			];

			expect(new FlattenValidationErrors(errors).messages()).toEqual(['age must be an integer']);
		});

		it('should prefix nested messages with the parent property', () => {
			const errors = [
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
			];

			expect(new FlattenValidationErrors(errors).messages()).toEqual([
				'address.street must be a string',
			]);
		});

		it('should join the whole path for deeply nested errors', () => {
			const errors = [
				validationErrorFactory({
					property: 'user',
					constraints: undefined,
					children: [
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
				}),
			];

			expect(new FlattenValidationErrors(errors).messages()).toEqual([
				'user.address.street must be a string',
			]);
		});

		it('should return every child message of one parent', () => {
			const errors = [
				validationErrorFactory({
					property: 'address',
					constraints: undefined,
					children: [
						validationErrorFactory({
							property: 'street',
							constraints: { isString: 'street must be a string' },
						}),
						validationErrorFactory({
							property: 'zip',
							constraints: { isNumberString: 'zip must be a number string' },
						}),
					],
				}),
			];

			expect(new FlattenValidationErrors(errors).messages()).toEqual([
				'address.street must be a string',
				'address.zip must be a number string',
			]);
		});

		// Current behavior: a parent that has children is only used as a path,
		// so its own constraints are not part of the result.
		it('should ignore own constraints of an error that has children', () => {
			const errors = [
				validationErrorFactory({
					property: 'address',
					constraints: { isObject: 'address must be an object' },
					children: [
						validationErrorFactory({
							property: 'street',
							constraints: { isString: 'street must be a string' },
						}),
					],
				}),
			];

			expect(new FlattenValidationErrors(errors).messages()).toEqual([
				'address.street must be a string',
			]);
		});

		it('should not mutate the given errors', () => {
			const errors = [
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
			];
			const snapshot = structuredClone(errors);

			new FlattenValidationErrors(errors).messages();

			expect(errors).toEqual(snapshot);
		});
	});
});
