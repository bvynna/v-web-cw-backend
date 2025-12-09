import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { Recipe } from './Recipe';
import { Comment } from './Comment';

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id!: number;

  // Кому пришло уведомление
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientId' })
  recipient!: User;

  @Column()
  recipientId!: number;

  // От кого (кто выполнил действие)
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender!: User;

  @Column()
  senderId!: number;

  // Тип уведомления
  @Column()
  type!: 'like' | 'comment' | 'reply' | 'subscription';

  // Связанные объекты
  @ManyToOne(() => Recipe, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipeId' })
  recipe?: Recipe;

  @Column({ nullable: true })
  recipeId?: number;

  @ManyToOne(() => Comment, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'commentId' })
  comment?: Comment;

  @Column({ nullable: true })
  commentId?: number;

  // Статус прочтения
  @Column({ default: false })
  isRead!: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
