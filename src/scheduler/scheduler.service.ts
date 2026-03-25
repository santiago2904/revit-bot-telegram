import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BotService } from '../bot/bot.service';
import { UserService } from '../user/user.service';
import { GeminiService } from '../gemini/gemini.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly botService: BotService,
    private readonly userService: UserService,
    private readonly geminiService: GeminiService,
  ) {}

  /** Buenos días + ¿llegaste temprano? — 7:30 AM (solo a Bibiana) */
  @Cron('30 7 * * 1-5', { name: 'morning-checkin' })
  async morningCheckin() {
    this.logger.log('[morning] Enviando mensaje de buenos días');
    const BIBIANA_CHAT_ID = 1861897985;
    try {
      const message = await this.geminiService.generateReminder('morning');
      await this.botService.sendReminderTo(BIBIANA_CHAT_ID, message);
    } catch (err) {
      this.logger.warn(`No se pudo enviar buenos días: ${err}`);
    }
  }

  /** Recordatorio de la tarde — 2:00 PM */
  @Cron('0 14 * * *', { name: 'reminder-afternoon' })
  async afternoonReminder() {
    await this.sendReminders('afternoon');
  }

  /** Recordatorio nocturno — 8:00 PM */
  @Cron('0 20 * * *', { name: 'reminder-evening' })
  async eveningReminder() {
    await this.sendReminders('evening');
  }

  /**
   * Envía recordatorio con mensaje generado por Gemini
   * solo a usuarios que NO hayan registrado avance hoy.
   */
  private async sendReminders(timeOfDay: 'afternoon' | 'evening') {
    const pending = await this.userService.getUsersPendingToday();
    this.logger.log(
      `[${timeOfDay}] Enviando recordatorio a ${pending.length} usuario(s) pendientes`,
    );

    for (const user of pending) {
      try {
        // Genera un mensaje único por usuario
        const message =
          await this.geminiService.generateReminder(timeOfDay);
        await this.botService.sendReminderTo(user.id, message);
      } catch (err) {
        this.logger.warn(`No se pudo enviar a ${user.id}: ${err}`);
      }
    }
  }
}
