import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './User';
import { Recipe } from './Recipe';

@Entity()
export class Comment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('text')
  content!: string;

  @ManyToOne(() => User, user => user.comments, { eager: true })
  @JoinColumn({ name: 'authorId' })
  author!: User;

  @ManyToOne(() => Recipe, recipe => recipe.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipeId' })
  recipe!: Recipe;

  @ManyToOne(() => Comment, comment => comment.replies, {
    nullable: true,
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'parentCommentId' })
  parentComment!: Comment | null;

  @OneToMany(() => Comment, comment => comment.parentComment, {
    cascade: true,
    eager: false,
  })
  replies!: Comment[];

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ default: 0 })
  likes!: number;

  @Column({ default: 0 })
  replyCount!: number;
}
