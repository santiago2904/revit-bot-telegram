import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as TelegramBot from "node-telegram-bot-api";
import * as path from "path";
import * as fs from "fs";
import { UserService } from "../user/user.service";
import { GeminiService } from "../gemini/gemini.service";

/** Sticker IDs para recordatorios (se pueden agregar más vía /stickerid) */
const REMINDER_STICKERS: string[] = [
  "CAACAgEAAxkBAANfacP_7NPgeCIkoQ0-lK21aWQrj4cAAnUHAAKRDCFGkkZRxdkAASjBOgQ",
  "CAACAgEAAxkBAANdacP-7V8nZDbe8g-s-Pm41xaSeykAAnQHAAKRDCFGTQMxUL_wt946BA",
  "CAACAgEAAxkBAANbacP-1YiqpP6arI5zigABkRuUpkYFAAJzBwACkQwhRi5Sd07BODrTOgQ",
  "CAACAgEAAxkBAAOjacQBmBBydiiS1DYQDkUopp0zWdsAAncHAAKRDCFGm4CeQZsbMSg6BA",
  "CAACAgEAAxkBAAOlacQByXoFAAEzTAFDDEaW05wBp1sKAAJ4BwACkQwhRtU13dOv8sPTOgQ",
  "CAACAgEAAxkBAAOnacQCJCqm55AaYI9Q1ONObD9MfMgAAnkHAAKRDCFGhSRusdTMugABOgQ",
  "CAACAgEAAxkBAAOpacQCLbkunmUn0GCPFuH3KJM1t_oAAnoHAAKRDCFGYmvDHqojr2c6BA",
  "CAACAgEAAxkBAAPwacQzrOhz7hBHUuvjTChXddC5wzoAAo0HAAKRDCFGdSZuFm-a3kw6BA",
  "CAACAgEAAxkBAAPyacQ0BNpi6xPxvYtHYtHV7Nd5CqQAAo4HAAKRDCFGpm_SibayVcA6BA",
  "CAACAgEAAxkBAAP0acQ0EWl7wVWcjQh2wUYlXYao784AAo8HAAKRDCFGgjhmOSYkGeo6BA",
  "CAACAgEAAxkBAAP2acQ0SvKLuDijGKP5djcxSn1PQXwAApAHAAKRDCFGYT5okZT658I6BA",
  "CAACAgEAAxkBAAP4acQ3fhXow3xwL10Zm9_VzKVPIgoAApIHAAKRDCFG61REd2nwNCY6BA",
  "CAACAgEAAxkBAAIBJ2nGke5a34uv-nlp2SvOuHqb8jXeAAKGCgAC5DI4RpXbd5dvreJoOgQ",
  "CAACAgEAAxkBAAIBQWnL4jyLTCY39DGoxA63QAd6zJDVAAKyCwACg0pZRttvn2N7Pp4xOgQ",
  "CAACAgEAAxkBAAIBQ2nL47vt6xFpmaEAAcxnkgQ0_riB6wACswsAAoNKWUbdsg3ys-GlmjoE",
  "CAACAgEAAxkBAAIBRWnL4_KFkUhrW2ant4mVmeE3wis7AAK0CwACg0pZRu-PN8aQpu91OgQ"
];

/** Sticker IDs para celebraciones */
const CELEBRATION_STICKERS: string[] = [];

/** Alias de nombres para enmascarar chat IDs al admin */
const USER_ALIASES: Record<number, string> = {
  1861897985: 'Bibiana',
};

@Injectable()
export class BotService implements OnModuleInit {
  private bot: TelegramBot;
  private readonly logger = new Logger(BotService.name);
  private adminChatId: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly geminiService: GeminiService,
  ) {}

  onModuleInit() {
    const token = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
    if (!token) {
      this.logger.error("TELEGRAM_BOT_TOKEN no está configurado.");
      return;
    }

    const adminId = this.configService.get<string>("ADMIN_CHAT_ID");
    if (!adminId) {
      this.logger.error("ADMIN_CHAT_ID no está configurado.");
      return;
    }
    this.adminChatId = parseInt(adminId, 10);
    this.logger.log(`Admin chat ID configurado: ${this.adminChatId}`);

    this.bot = new TelegramBot(token, { polling: true });
    this.logger.log("Bot de Telegram iniciado (polling)");
    this.registerHandlers();
  }

  /** Expone la instancia del bot para el scheduler */
  getBotInstance(): TelegramBot {
    return this.bot;
  }

  private registerHandlers() {
    // Comandos admin
    this.bot.onText(/\/start/, (msg) => this.handleStart(msg));
    this.bot.onText(/\/agregar\s+(.+)/, (msg, match) =>
      this.handleAgregar(msg, match),
    );
    this.bot.onText(/\/quitar\s+(.+)/, (msg, match) =>
      this.handleQuitar(msg, match),
    );
    this.bot.onText(/\/lista/, (msg) => this.handleLista(msg));
    this.bot.onText(/\/estado/, (msg) => this.handleEstado(msg));
    this.bot.onText(/\/recordar\s+(.+)/, (msg, match) =>
      this.handleRecordar(msg, match),
    );
    this.bot.onText(/\/probar/, (msg) => this.handleProbar(msg));
    this.bot.onText(/\/resetdia(?:\s+(.+))?/, (msg, match) =>
      this.handleResetDia(msg, match),
    );

    // Capturar sticker IDs — reenvía un sticker al bot y te da el ID
    this.bot.on("sticker", (msg) => this.handleStickerCapture(msg));

    // Mensajes de texto libre → detección de avance (ignorar comandos)
    this.bot.on("message", (msg) => {
      if (msg.text && msg.text.startsWith("/")) return;
      if (msg.sticker) return; // ya manejado arriba
      this.handleUserMessage(msg);
    });
  }

  // ─── Verificación Admin ────────────────────────────────────────

  private isAdmin(chatId: number): boolean {
    return Number(chatId) === Number(this.adminChatId);
  }

  // ─── /start ────────────────────────────────────────────────────

  private async handleStart(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;

    if (this.isAdmin(chatId)) {
      const text = [
        "👋 *¡Hola Admin!*",
        "",
        "Comandos disponibles:",
        "📌 `/agregar <chatId>` — Agregar usuario a seguimiento",
        "❌ `/quitar <chatId>` — Quitar usuario",
        "📋 `/lista` — Ver usuarios en seguimiento",
        "📊 `/estado` — Ver quién avanzó hoy",
        "🔔 `/recordar <chatId>` — Recordatorio manual",
        "🧪 `/probar` — Enviar recordatorio de prueba a todos",
        "🎨 Envía un sticker para obtener su ID",
        "",
        `Tu chat ID: \`${chatId}\``,
      ].join("\n");
      this.send(chatId, text);
    } else {
      const text = [
        "👋 *¡Hola!*",
        "",
        "Soy tu bot de seguimiento de curso. 📚",
        "Cuando avances en tu curso, simplemente escríbeme algo como:",
        "",
        '• "Ya avancé"',
        '• "Listo"',
        '• "Hoy estudié"',
        '• "Ya terminé"',
        "",
        "¡Y dejaré de recordarte por hoy! 🎉",
        "",
        `Tu chat ID: \`${chatId}\``,
      ].join("\n");
      this.send(chatId, text);
    }
  }

  // ─── /agregar <chatId> ─────────────────────────────────────────

  private async handleAgregar(
    msg: TelegramBot.Message,
    match: RegExpExecArray | null,
  ) {
    const chatId = msg.chat.id;
    if (!this.isAdmin(chatId)) return;
    if (!match?.[1]) return;

    const targetId = parseInt(match[1].trim(), 10);
    if (isNaN(targetId)) {
      this.send(chatId, "⚠️ ID inválido. Usa: `/agregar <chatId>`");
      return;
    }

    const user = await this.userService.addUser(targetId);
    this.send(chatId, `✅ Usuario \`${targetId}\` agregado al seguimiento.`);

    // Notificar al usuario
    try {
      this.send(
        targetId,
        '📚 ¡Hola! Has sido agregado al seguimiento de curso. Recibirás recordatorios diarios para avanzar. Cuando avances, solo escríbeme "ya avancé" o "listo". 💪',
      );
    } catch {
      this.send(
        chatId,
        "⚠️ No pude enviar mensaje al usuario. ¿Ya inició chat con el bot?",
      );
    }
  }

  // ─── /quitar <chatId> ──────────────────────────────────────────

  private async handleQuitar(
    msg: TelegramBot.Message,
    match: RegExpExecArray | null,
  ) {
    const chatId = msg.chat.id;
    if (!this.isAdmin(chatId)) return;
    if (!match?.[1]) return;

    const targetId = parseInt(match[1].trim(), 10);
    if (isNaN(targetId)) {
      this.send(chatId, "⚠️ ID inválido.");
      return;
    }

    const removed = await this.userService.removeUser(targetId);
    if (removed) {
      this.send(chatId, `❌ Usuario \`${targetId}\` removido del seguimiento.`);
    } else {
      this.send(chatId, `⚠️ Usuario \`${targetId}\` no encontrado.`);
    }
  }

  // ─── /lista ────────────────────────────────────────────────────

  private async handleLista(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    if (!this.isAdmin(chatId)) return;

    const users = await this.userService.getAllUsers();
    if (users.length === 0) {
      this.send(chatId, "📋 No hay usuarios en seguimiento.");
      return;
    }

    const lines = users.map((u) => {
      const name = u.firstName || u.username || "Sin nombre";
      const status = u.active ? "🟢" : "🔴";
      return `${status} \`${u.id}\` — ${name}`;
    });

    this.send(chatId, `📋 *Usuarios en seguimiento:*\n\n${lines.join("\n")}`);
  }

  // ─── /estado ───────────────────────────────────────────────────

  private async handleEstado(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    if (!this.isAdmin(chatId)) return;

    const { done, pending } = await this.userService.getDailyStatus();

    const doneLines =
      done.length > 0
        ? done
            .map(
              (u) =>
                `  ✅ \`${u.id}\` — ${u.firstName || u.username || "Sin nombre"}`,
            )
            .join("\n")
        : "  Nadie aún 😴";

    const pendingLines =
      pending.length > 0
        ? pending
            .map(
              (u) =>
                `  ⏳ \`${u.id}\` — ${u.firstName || u.username || "Sin nombre"}`,
            )
            .join("\n")
        : "  ¡Todos al día! 🎉";

    const text = [
      "📊 *Estado de hoy:*",
      "",
      "*Ya avanzaron:*",
      doneLines,
      "",
      "*Pendientes:*",
      pendingLines,
    ].join("\n");

    this.send(chatId, text);
  }

  // ─── /recordar <chatId> ────────────────────────────────────────

  private async handleRecordar(
    msg: TelegramBot.Message,
    match: RegExpExecArray | null,
  ) {
    const chatId = msg.chat.id;
    if (!this.isAdmin(chatId)) return;
    if (!match?.[1]) return;

    const targetId = parseInt(match[1].trim(), 10);
    if (isNaN(targetId)) {
      this.send(chatId, "⚠️ ID inválido.");
      return;
    }

    try {
      await this.sendReminderTo(
        targetId,
        "🔔 ¡Hey! Tu admin te envía un recordatorio: ¡avanza en tu curso! 💪",
      );
      this.send(chatId, `🔔 Recordatorio enviado a \`${targetId}\`.`);
    } catch {
      this.send(chatId, `⚠️ No pude enviar recordatorio a \`${targetId}\`.`);
    }
  }

  // ─── /probar — enviar recordatorio Gemini de prueba a todos ────

  private async handleProbar(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    if (!this.isAdmin(chatId)) return;

    const pending = await this.userService.getUsersPendingToday();
    if (pending.length === 0) {
      this.send(chatId, "✅ No hay usuarios pendientes hoy.");
      return;
    }

    this.send(
      chatId,
      `🧪 Enviando recordatorio de prueba a ${pending.length} usuario(s)...`,
    );

    for (const user of pending) {
      try {
        const message = await this.geminiService.generateReminder("afternoon");
        await this.sendReminderTo(user.id, message);
      } catch (err) {
        this.logger.warn(`No se pudo enviar prueba a ${user.id}: ${err}`);
      }
    }

    this.send(chatId, `✅ Recordatorios de prueba enviados.`);
  }

  // ─── /resetdia — limpiar progreso de hoy ───────────────────────

  private async handleResetDia(
    msg: TelegramBot.Message,
    match: RegExpExecArray | null,
  ) {
    const chatId = msg.chat.id;
    if (!this.isAdmin(chatId)) return;

    const targetId = match?.[1]?.trim();

    if (targetId) {
      const id = Number(targetId);
      if (isNaN(id)) {
        this.send(chatId, '⚠️ ID inválido.');
        return;
      }
      const count = await this.userService.resetToday(id);
      const name = this.displayName(id);
      this.send(chatId, count > 0
        ? `🔄 Progreso de hoy de *${name}* reseteado.`
        : `ℹ️ *${name}* no tenía progreso hoy.`,
      );
    } else {
      const count = await this.userService.resetToday();
      this.send(chatId, count > 0
        ? `🔄 Progreso de hoy reseteado para *${count}* usuario(s).`
        : `ℹ️ Nadie había registrado progreso hoy.`,
      );
    }
  }

  // ─── Detección de lenguaje natural ─────────────────────────────

  private async handleUserMessage(msg: TelegramBot.Message) {
    if (!msg.text) return;

    const chatId = msg.chat.id;

    // Solo procesar usuarios en seguimiento
    const user = await this.userService.findById(chatId);
    if (!user || !user.active) return;

    // Detectar con Gemini AI si indica avance
    const isProgress = await this.geminiService.detectsProgress(msg.text);
    if (!isProgress) return;

    const { alreadyLogged } = await this.userService.logDailyProgress(
      chatId,
      msg.text,
    );

    if (alreadyLogged) {
      this.send(chatId, "✅ Ya registraste tu avance hoy. ¡Sigue así! 💪");
      return;
    }

    // Celebración: mensaje con Gemini + sticker/imagen
    const celebration = await this.geminiService.generateCelebration();
    this.send(chatId, celebration);
    await this.sendMedia(chatId, "celebrations");

    // Notificar admin
    const name = this.displayName(chatId, user);
    this.send(
      this.adminChatId,
      `📝 *${name}* registró avance: "${msg.text}"`,
    );
  }

  // ─── Captura de sticker IDs ────────────────────────────────────

  private async handleStickerCapture(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    if (!this.isAdmin(chatId)) return;
    if (!msg.sticker) return;

    const stickerId = msg.sticker.file_id;
    const emoji = msg.sticker.emoji || "";
    const setName = msg.sticker.set_name || "sin pack";

    this.send(
      chatId,
      [
        "🎨 *Sticker capturado:*",
        "",
        `📎 ID: \`${stickerId}\``,
        `${emoji} Emoji: ${emoji}`,
        `📦 Pack: ${setName}`,
        "",
        "Copia el ID y agrégalo al array `REMINDER_STICKERS` o `CELEBRATION_STICKERS` en `bot.service.ts`",
      ].join("\n"),
    );
  }

  // ─── Envío de media ────────────────────────────────────────────

  /** Envía un recordatorio con texto (de Gemini) + media aleatorio */
  async sendReminderTo(chatId: number, text: string) {
    const name = this.displayName(chatId);
    // Juntar todas las opciones disponibles: archivos + stickers
    const options = this.collectMediaOptions('reminders', REMINDER_STICKERS);

    if (options.length > 0) {
      const pick = this.randomItem(options);
      try {
        if (pick.type === 'sticker') {
          this.send(chatId, text);
          await this.bot.sendSticker(chatId, pick.value);
        } else {
          await this.sendMediaFile(chatId, pick.value, text);
        }
        this.send(this.adminChatId, `📤 Recordatorio enviado a *${name}*`);
        return;
      } catch (err) {
        this.logger.warn(`No se pudo enviar media: ${err}`);
      }
    }

    // Fallback: solo texto
    this.send(chatId, text);
    this.send(this.adminChatId, `📤 Recordatorio enviado a *${name}*`);
  }

  /** Envía sticker o archivo media aleatorio de una categoría */
  private async sendMedia(chatId: number, category: string) {
    const stickerPool =
      category === 'celebrations' ? CELEBRATION_STICKERS : REMINDER_STICKERS;
    const options = this.collectMediaOptions(category, stickerPool);

    if (options.length === 0) return;

    const pick = this.randomItem(options);
    try {
      if (pick.type === 'sticker') {
        await this.bot.sendSticker(chatId, pick.value);
      } else {
        await this.sendMediaFile(chatId, pick.value);
      }
    } catch (err) {
      this.logger.warn(`No se pudo enviar media: ${err}`);
    }
  }

  /** Recopila todas las opciones de media disponibles (archivos + stickers) */
  private collectMediaOptions(
    subfolder: string,
    stickerPool: string[],
  ): Array<{ type: 'file' | 'sticker'; value: string }> {
    const options: Array<{ type: 'file' | 'sticker'; value: string }> = [];

    // Agregar archivos de la carpeta media/
    const mediaFiles = this.getAllMedia(subfolder);
    for (const f of mediaFiles) {
      options.push({ type: 'file', value: f });
    }

    // Agregar stickers de Telegram
    for (const s of stickerPool) {
      options.push({ type: 'sticker', value: s });
    }

    return options;
  }

  /** Envía un archivo como foto, video o animación según extensión */
  private async sendMediaFile(
    chatId: number,
    filePath: string,
    caption?: string,
  ) {
    const ext = path.extname(filePath).toLowerCase();
    const stream = fs.createReadStream(filePath) as any;
    const opts = caption ? { caption, parse_mode: "Markdown" as const } : {};

    if (/\.(mp4|mov|avi|mkv)$/.test(ext)) {
      await this.bot.sendVideo(chatId, stream, opts);
    } else if (ext === ".gif") {
      await this.bot.sendAnimation(chatId, stream, opts);
    } else {
      await this.bot.sendPhoto(chatId, stream, opts);
    }
  }

  /** Envía un sticker aleatorio de un pool de IDs */
  private async sendRandomSticker(chatId: number, pool: string[]) {
    if (pool.length === 0) return;
    const stickerId = this.randomItem(pool);
    try {
      await this.bot.sendSticker(chatId, stickerId);
    } catch (err) {
      this.logger.warn(`No se pudo enviar sticker: ${err}`);
    }
  }

  /** Obtiene todos los archivos de media/<subfolder>/ (imágenes, GIFs, videos) */
  private getAllMedia(subfolder: string): string[] {
    const dir = path.join(process.cwd(), 'media', subfolder);
    if (!fs.existsSync(dir)) return [];

    return fs
      .readdirSync(dir)
      .filter((f) => /\.(png|jpg|jpeg|gif|webp|mp4|mov|avi|mkv)$/i.test(f))
      .map((f) => path.join(dir, f));
  }

  // ─── Helpers ───────────────────────────────────────────────────

  private send(chatId: number, text: string) {
    this.bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  }

  /** Obtiene el nombre visible de un usuario para el admin */
  private displayName(chatId: number, user?: { firstName?: string | null; username?: string | null }): string {
    if (USER_ALIASES[chatId]) return USER_ALIASES[chatId];
    if (user?.firstName) return user.firstName;
    if (user?.username) return user.username;
    return String(chatId);
  }

  private randomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}
