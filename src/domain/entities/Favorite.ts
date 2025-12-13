import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './User';
import { Recipe } from './Recipe';

@Entity()
export class Favorite {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, user => user.favorites, { onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => Recipe, recipe => recipe.favorites, { onDelete: 'CASCADE' })
  recipe!: Recipe;

  @CreateDateColumn()
  createdAt!: Date;
}
