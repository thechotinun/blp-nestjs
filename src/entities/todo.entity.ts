import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base-entity';

@Entity('todos')
export class Todo extends BaseEntity {

  @Column({ type: 'varchar', length: 50, nullable: false, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;
}
