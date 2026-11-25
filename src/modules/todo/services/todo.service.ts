import { randomUUID } from 'node:crypto';
import { Todo } from '@entities/todo.entity';
import { TodoException } from '@exceptions/app/todo.exception';
import { CreateTodoDto } from '@modules/todo/dto/create-todo.dto';
import { UpdateTodoDto } from '@modules/todo/dto/update-todo.dto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TodoRepository } from '@repositories/todo.repository';
import { PaginateQuery } from '@commons/dto/paginate.query';
import { paginate } from '@commons/helpers/paginate';
import { Pagination } from '@commons/interfaces/pagination.interface';
import { Like, UpdateResult } from 'typeorm';

@Injectable()
export class TodoService {
  constructor(
    @InjectRepository(TodoRepository)
    private readonly todoRepository: TodoRepository,
  ) {}

  async checkTodo(todoId: string) {
    return await this.todoRepository.findOne({
      where: { id: todoId },
    });
  }

  async create(payload: CreateTodoDto): Promise<Todo> {
    try {

      const create = this.todoRepository.create(payload);
      const userId = randomUUID();
      create.createdBy = userId;
      create.updatedBy = userId;

      const savedPost = await this.todoRepository.save(create);

      return savedPost;
    } catch (error) {
      throw TodoException.createError(
        error instanceof Error ? [error.message] : [],
      );
    }
  }

  async paginate(
    options: PaginateQuery,
    query: {
      name?: string;
    },
  ): Promise<Pagination<Todo>> {
    const { name } = query;

    return await paginate(
      this.todoRepository,
      options,
      {
        select: {
          id: true,
          name: true,
          description: true,
          createdDate: true,
          createdBy: true,
          updatedDate: true,
          updatedBy: true,
          status: true,
        },
        where: name ? { name: Like(`%${name}%`) } : undefined,
        order: { createdDate: 'DESC' },
      },
      '/api/v1/todos',
    );
  }

  async findOneById(id: string): Promise<Todo> {
    try {
      const todo = await this.todoRepository
        .createQueryBuilder('todo')
        .select([
          'todo.id',
          'todo.name',
          'todo.description',
          'todo.createdDate',
          'todo.createdBy',
          'todo.updatedDate',
          'todo.updatedBy',
          'todo.status',
        ])
        .where('todo.id = :id', { id })
        .getOne();

      if (!todo) {
        throw new Error('Todo not found');
      }

      return todo;
    } catch {
      throw TodoException.notFound();
    }
  }

  async update(id: string, payload: UpdateTodoDto): Promise<Todo> {
    try {

      const todo = await this.todoRepository.findOne({
        where: { id: id },
      });
      if (!todo) {
        throw new Error('TODO_NOT_FOUND');
      }

      await this.todoRepository.update(id, {
        ...payload,
      });

      return await this.findOneById(id);
    } catch (error) {
      throw TodoException.updateError(
        error instanceof Error ? [error.message] : [],
      );
    }
  }

  async remove(id: string): Promise<UpdateResult> {
    try {
      const todo = await this.todoRepository.findOne({
        where: { id: id },
      });
      if (!todo) {
        throw new Error('TODO_NOT_FOUND');
      }

      await this.findOneById(id);

      return await this.todoRepository.softDelete(id);
    } catch (error) {
      throw TodoException.deleteError(
        error instanceof Error ? [error.message] : [],
      );
    }
  }

}
