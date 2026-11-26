import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base-entity';

@Entity('todos')
// Name must be unique only among active rows, so a soft-deleted todo
// does not block reusing its name.
@Index('UQ_todos_name_active', ['name'], {
  unique: true,
  where: '"deletedDate" IS NULL',
})
export class Todo extends BaseEntity {

  @Column({ type: 'varchar', length: 50, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;
}
