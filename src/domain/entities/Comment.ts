// domain/entities/Comment.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './User';
import { Recipe } from './Recipe';

@Entity()
export class Comment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('text')
  content!: string;

  @ManyToOne(() => User, user => user.comments, { eager: true })
  author!: User;

  @ManyToOne(() => Recipe, recipe => recipe.comments, { onDelete: 'CASCADE' })
  recipe!: Recipe;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ default: 0 })
  likes!: number;
}
