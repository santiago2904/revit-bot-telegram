import {
  Entity,
  PrimaryColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { DailyProgress } from './daily-progress.entity';

@Entity('tracked_users')
export class TrackedUser {
  /** Telegram chat ID */
  @PrimaryColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', nullable: true })
  username: string | null;

  @Column({ type: 'varchar', nullable: true })
  firstName: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  /** IDs de los últimos 5 stickers enviados (para evitar repetición) */
  @Column({ type: 'text', nullable: true })
  lastStickerIds: string | null;

  @OneToMany(() => DailyProgress, (dp) => dp.user, { cascade: true })
  dailyProgress: DailyProgress[];

  @CreateDateColumn()
  addedAt: Date;
}
