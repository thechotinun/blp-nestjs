import { Module } from '@nestjs/common';
import { TodoRepository } from '@repositories/todo.repository';
import { TodoController } from './controllers/post.controller';
import { TodoService } from './services/todo.service';

@Module({
  controllers: [TodoController],
  providers: [TodoRepository, TodoService],
  exports: [TodoService],
})
export class TodoModule {}
