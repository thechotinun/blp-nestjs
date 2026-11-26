import { IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateTodoDto {
	@IsNotEmpty()
	@MaxLength(50)
	name: string;

	@IsOptional()
	description: string;
}
