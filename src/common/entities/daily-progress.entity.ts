import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { TrackedUser } from './tracked-user.entity';

@Entity('daily_progress')
@Unique(['userId', 'date'])
export class DailyProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  userId: number;

  /** YYYY-MM-DD */
  @Column({ type: 'varchar' })
  date: string;

  /** El mensaje original del usuario */
  @Column({ type: 'varchar', nullable: true })
  message: string | null;

  @ManyToOne(() => TrackedUser, (u) => u.dailyProgress, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: TrackedUser;

  @CreateDateColumn()
  createdAt: Date;
}
