import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackedUser, DailyProgress } from '../common/entities';
import { todayStr } from '../common/utils/date.utils';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(TrackedUser)
    private readonly userRepo: Repository<TrackedUser>,
    @InjectRepository(DailyProgress)
    private readonly progressRepo: Repository<DailyProgress>,
  ) {}

  // ─── Admin CRUD ────────────────────────────────────────────────

  async addUser(
    chatId: number,
    username?: string,
    firstName?: string,
  ): Promise<TrackedUser> {
    let user = await this.userRepo.findOneBy({ id: chatId });
    if (user) {
      user.active = true;
      return this.userRepo.save(user);
    }
    user = this.userRepo.create({
      id: chatId,
      username: username ?? null,
      firstName: firstName ?? null,
    });
    return this.userRepo.save(user);
  }

  async removeUser(chatId: number): Promise<boolean> {
    const user = await this.userRepo.findOneBy({ id: chatId });
    if (!user) return false;
    user.active = false;
    await this.userRepo.save(user);
    return true;
  }

  async getActiveUsers(): Promise<TrackedUser[]> {
    return this.userRepo.findBy({ active: true });
  }

  async getAllUsers(): Promise<TrackedUser[]> {
    return this.userRepo.find();
  }

  async findById(chatId: number): Promise<TrackedUser | null> {
    return this.userRepo.findOneBy({ id: chatId });
  }

  /** Alias para getUserById (para consistencia) */
  async getUserById(chatId: number): Promise<TrackedUser | null> {
    return this.findById(chatId);
  }

  /** Actualiza el historial de stickers enviados a un usuario */
  async updateStickerHistory(chatId: number, stickerIds: string): Promise<void> {
    await this.userRepo.update({ id: chatId }, { lastStickerIds: stickerIds });
  }

  // ─── Daily Progress ────────────────────────────────────────────

  /** Registrar avance del día. Retorna false si ya había registrado hoy. */
  async logDailyProgress(
    chatId: number,
    message: string,
  ): Promise<{ alreadyLogged: boolean }> {
    const today = todayStr();
    const existing = await this.progressRepo.findOneBy({
      userId: chatId,
      date: today,
    });

    if (existing) {
      return { alreadyLogged: true };
    }

    const record = this.progressRepo.create({
      userId: chatId,
      date: today,
      message,
    });
    await this.progressRepo.save(record);
    this.logger.log(`Usuario ${chatId} registró avance: "${message}"`);
    return { alreadyLogged: false };
  }

  /** ¿Ya avanzó hoy? */
  async hasProgressToday(chatId: number): Promise<boolean> {
    const today = todayStr();
    const record = await this.progressRepo.findOneBy({
      userId: chatId,
      date: today,
    });
    return !!record;
  }

  /** Usuarios activos que NO han registrado avance hoy */
  async getUsersPendingToday(): Promise<TrackedUser[]> {
    const today = todayStr();
    const users = await this.userRepo
      .createQueryBuilder('u')
      .where('u.active = :active', { active: true })
      .andWhere(
        `u.id NOT IN (
          SELECT dp."userId" FROM daily_progress dp WHERE dp.date = :today
        )`,
        { today },
      )
      .getMany();
    return users;
  }

  /** Resumen del día: quién avanzó y quién no */
  async getDailyStatus(): Promise<{
    done: TrackedUser[];
    pending: TrackedUser[];
  }> {
    const active = await this.getActiveUsers();
    const today = todayStr();
    const done: TrackedUser[] = [];
    const pending: TrackedUser[] = [];

    for (const user of active) {
      const has = await this.progressRepo.findOneBy({
        userId: user.id,
        date: today,
      });
      if (has) done.push(user);
      else pending.push(user);
    }

    return { done, pending };
  }

  /** Resetear progreso de hoy de un usuario o de todos */
  async resetToday(chatId?: number): Promise<number> {
    const today = todayStr();
    const qb = this.progressRepo.createQueryBuilder()
      .delete()
      .where('date = :today', { today });

    if (chatId) {
      qb.andWhere('"userId" = :chatId', { chatId });
    }

    const result = await qb.execute();
    return result.affected ?? 0;
  }
}
