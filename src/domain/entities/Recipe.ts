import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { User } from './User';
import { Favorite } from './Favorite';

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

  @OneToMany(() => Favorite, favorite => favorite.recipe)
  favorites!: Favorite[];

  @Column({ default: 0 })
  likes!: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
