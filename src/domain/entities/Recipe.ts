import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './User';

@Entity()
export class Recipe {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column('text')
  description!: string;

  @Column('text')
  ingredients!: string;

  @Column('text')
  instructions!: string;

  @Column({ nullable: true })
  imageUrl?: string;

  @ManyToOne(() => User, user => user.recipes)
  author!: User;

  @Column({ default: 0 })
  likes!: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
