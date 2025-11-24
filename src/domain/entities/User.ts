import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Recipe } from './Recipe';
import { Favorite } from './Favorite';
import { Comment } from './Comment';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column()
  name!: string;

  @OneToMany(() => Recipe, recipe => recipe.author)
  recipes!: Recipe[];

  @OneToMany(() => Favorite, favorite => favorite.user)
  favorites!: Favorite[];

  @OneToMany(() => Comment, comment => comment.author)
  comments!: Comment[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
