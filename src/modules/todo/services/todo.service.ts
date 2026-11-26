import { randomUUID } from 'node:crypto';
import { Todo } from '@entities/todo.entity';
import { ApiException } from '@exceptions/app/api.exception';
import { TodoException } from '@exceptions/app/todo.exception';
import { CreateTodoDto } from '@modules/todo/dto/create-todo.dto';
import { UpdateTodoDto } from '@modules/todo/dto/update-todo.dto';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TodoRepository } from '@repositories/todo.repository';
import { PaginateQuery } from '@commons/dto/paginate.query';
import { paginate } from '@commons/helpers/paginate';
import { Pagination } from '@commons/interfaces/pagination.interface';
import { Like, QueryFailedError, UpdateResult } from 'typeorm';

@Injectable()
export class TodoService {
  private readonly logger = new Logger(TodoService.name);

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
      if (this.isUniqueViolation(error)) {
        throw TodoException.exist();
      }

      this.rethrowOrWrap(
        error,
        'create failed',
        TodoException.createError(),
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
        throw TodoException.notFound();
      }

      return todo;
    } catch (error) {
      this.rethrowOrWrap(
        error,
        `findOneById failed (id=${id})`,
        TodoException.findError(),
      );
    }
  }

  async update(id: string, payload: UpdateTodoDto): Promise<Todo> {
    try {

      const todo = await this.todoRepository.findOne({
        where: { id: id },
      });
      if (!todo) {
        throw TodoException.notFound();
      }

      await this.todoRepository.update(id, {
        ...payload,
      });

      return await this.findOneById(id);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw TodoException.exist();
      }

      this.rethrowOrWrap(
        error,
        `update failed (id=${id})`,
        TodoException.updateError(),
      );
    }
  }

  async remove(id: string): Promise<UpdateResult> {
    try {
      const todo = await this.todoRepository.findOne({
        where: { id: id },
      });
      if (!todo) {
        throw TodoException.notFound();
      }

      await this.findOneById(id);

      return await this.todoRepository.softDelete(id);
    } catch (error) {
      this.rethrowOrWrap(
        error,
        `remove failed (id=${id})`,
        TodoException.deleteError(),
      );
    }
  }

  /**
   * Postgres unique_violation (SQLSTATE 23505), e.g. duplicated todo name
   */
  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string } | undefined)?.code === '23505'
    );
  }

  /**
   * Rethrows known ApiException as is. Anything else is unexpected: the real
   * error (may contain DB internals) is only logged, and the client gets the
   * given generic exception instead.
   */
  private rethrowOrWrap(
    error: unknown,
    context: string,
    fallback: ApiException,
  ): never {
    if (error instanceof ApiException) {
      throw error;
    }

    this.logger.error(
      context,
      error instanceof Error ? error.stack : String(error),
    );

    throw fallback;
  }

}
