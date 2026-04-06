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
  @Cron('30 7 * * 1-5', { name: 'morning-checkin', timeZone: 'America/Bogota' })
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

  /** Piropo + recordatorio de almuerzo — 12:30 PM */
  @Cron('30 12 * * *', { name: 'lunch-reminder', timeZone: 'America/Bogota' })
  async lunchReminder() {
    this.logger.log('[lunch] Enviando piropo y recordatorio de almuerzo');
    const BIBIANA_CHAT_ID = 1861897985;
    try {
      const message = await this.geminiService.generateReminder('lunch');
      await this.botService.sendReminderTo(BIBIANA_CHAT_ID, message);
    } catch (err) {
      this.logger.warn(`No se pudo enviar recordatorio de almuerzo: ${err}`);
    }
  }

  /** Recordatorio 7:30 PM */
  @Cron('30 19 * * *', { name: 'reminder-730pm', timeZone: 'America/Bogota' })
  async reminder730pm() {
    await this.sendReminders('evening-730');
  }

  /** Recordatorio 8:30 PM */
  @Cron('30 20 * * *', { name: 'reminder-830pm', timeZone: 'America/Bogota' })
  async reminder830pm() {
    await this.sendReminders('evening-830');
  }

  /** Recordatorio 9:30 PM */
  @Cron('30 21 * * *', { name: 'reminder-930pm', timeZone: 'America/Bogota' })
  async reminder930pm() {
    await this.sendReminders('evening-930');
  }

  /**
   * Envía recordatorio con mensaje generado por Gemini
   * solo a usuarios que NO hayan registrado avance hoy.
   */
  private async sendReminders(timeOfDay: 'evening-730' | 'evening-830' | 'evening-930') {
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
