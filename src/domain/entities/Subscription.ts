import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column } from 'typeorm';
import { User } from './User';

@Entity()
export class Subscription {
  @PrimaryGeneratedColumn()
  id!: number;

  // Кто подписался
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscriberId' })
  subscriber!: User;

  @Column()
  subscriberId!: number;

  // На кого подписался
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'targetId' })
  target!: User;

  @Column()
  targetId!: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
