import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

/** Mensajes de fallback si Gemini no está disponible */
const FALLBACK_MORNING = [
  '☀️ ¡Buenos días, Bibi! ¿Llegaste tempranito a la oficina hoy?',
  '🌅 ¡Arriba esa actitud! ¿Ya estás en la ofici o todavía en la cama? jaja',
  '☕ Buenos días, ¿llegó la más juiciosa temprano hoy?',
  '🌤️ ¡Madrugó la pollita! ¿O todavía está dormida? jaja',
  '☀️ ¡Buenos días! Reporte de llegada a la oficina, soldado.',
  '🌞 Ey Bibi, ¿ya estás en modo productivo o todavía en modo sábana?',
];

const FALLBACK_AFTERNOON = [
  '📚 ¿Ya avanzaste en tu curso hoy? ¡Aún estás a tiempo!',
  '💪 La tarde es perfecta para estudiar un poco. ¡Tú puedes!',
  '🎯 Un pequeño avance hoy vale más que mil planes mañana.',
  '📖 ¿Y si le dedicas unos minutos a tu curso? ¡Cada minuto cuenta!',
  '🚀 No dejes para mañana lo que puedes aprender hoy.',
  '⚡ El conocimiento es poder. ¡Dale un ratito a tu curso!',
];

const FALLBACK_EVENING = [
  '🌙 Última llamada del día. ¿Lograste avanzar en tu curso?',
  '🌟 Antes de descansar, ¿le dedicaste tiempo a tu curso hoy?',
  '🔔 Recuerda: la consistencia es clave. ¿Avanzaste hoy?',
  '🎓 Un día sin aprender es un día perdido. ¡Aún tienes chance!',
  '💡 Cierra el día con broche de oro: avanza en tu curso.',
  '🌙 No te vayas a dormir sin haber dado un paso más en tu curso.',
];

type TimeOfDay = 'morning' | 'afternoon' | 'evening';

@Injectable()
export class GeminiService implements OnModuleInit {
  private model: GenerativeModel | null = null;
  private readonly logger = new Logger(GeminiService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY no configurado. Se usarán mensajes predeterminados.',
      );
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    this.logger.log('Gemini AI inicializado correctamente');
  }

  /**
   * Genera un mensaje de recordatorio único usando Gemini.
   * Si falla, retorna un mensaje de fallback.
   */
  async generateReminder(timeOfDay: TimeOfDay): Promise<string> {
    if (!this.model) {
      return this.getFallback(timeOfDay);
    }

    // Prompt diferente para la mañana (buenos días + oficina)
    if (timeOfDay === 'morning') {
      return this.generateMorningMessage();
    }

    const timeLabel =
      timeOfDay === 'afternoon' ? 'la tarde' : 'la noche';

      const prompt = [
        `Actúa como un paisa seguro, relajado y molestón. Genera un mensaje corto para recordarle a Bibiana, pudes decirle bibi que avance en su curso de Autodesk Revit.`,
        `El contexto: Ella es muy procrastinadora y necesitas que termine eso para que esté 100% libre la otra semana (Semana Santa). Tienen pendiente armar un Lego en tu casa y hacer maratón de películas, y no le vas a aceptar excusas de que "tiene que estudiar".`,
        `El tono: Puro "banter" (recocha) y coqueteo disimulado. Debe sonar como un "comandante militar" estricto pero divertido y retador. Presiónala con cariño. Usa expresiones naturales colombianas como "hágale pues", "ojo pues", "póngase las pilas", "modo juicio", "cero excusas" y siempre incluye algún "jaja" para suavizar el golpe.`,
        `Ejemplos del estilo que busco:`,
        `- "Bibi, mucho chisme y poco Revit, póngase las pilas pues que ese Lego no se va a armar solo en Semana Santa jaja."`,
        `- "Reportándose a estudiar, pollito de colores. Ojo pues que la necesito libre la otra semana pa' las películas y no le valgo excusas jaja."`,
        `Es ${timeLabel}. El mensaje debe:`,
        `- Ser diferente cada vez (creativo, variado y directo al grano)`,
        `- Usar 1 o 2 emojis relevantes máximo`,
        `- Tener máximo 2 oraciones cortas`,
        `- Ser una presión divertida y motivadora, cero agresiva`,
        `- No usar comillas, saludos formales ni formato markdown`,
        `Solo responde con el mensaje de texto exacto, nada más.
        nada en tono sexual como por ejemplo este emoji 😈  `
      ].join('\n');
  

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text()?.trim();

      if (text && text.length > 5 && text.length < 500) {
        return text;
      }

      this.logger.warn('Respuesta de Gemini inválida, usando fallback');
      return this.getFallback(timeOfDay);
    } catch (err) {
      this.logger.warn(`Error de Gemini: ${err}. Usando fallback.`);
      return this.getFallback(timeOfDay);
    }
  }

  /**
   * Genera un mensaje de celebración cuando el usuario registra avance.
   */
  async generateCelebration(): Promise<string> {
    if (!this.model) {
      const fallbacks = [
        '🎉 ¡Excelente! ¡Sigue así, vas muy bien!',
        '💪 ¡Genial! Cada día cuenta. ¡Eres imparable!',
        '🚀 ¡Increíble! Un paso más hacia tu meta.',
        '⭐ ¡Muy bien! La constancia es la clave del éxito.',
        '🔥 ¡Así se hace! El esfuerzo de hoy se nota mañana.',
      ];
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    const prompt = [
      `Genera un mensaje corto de felicitación en español para alguien que acaba de estudiar/avanzar en su curso.`,
      `El mensaje debe:`,
      `- Usar 1-2 emojis de celebración`,
      `- Ser entusiasta y positivo`,
      `- Tener máximo 2 oraciones`,
      `- Mencionar que ya no recibirá recordatorios por hoy`,
      `- No usar comillas ni formato markdown`,
      `Solo responde con el mensaje, nada más.`,
    ].join('\n');

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text()?.trim();

      if (text && text.length > 5 && text.length < 500) {
        return text;
      }
      return '🎉 ¡Excelente! ¡Hoy cumpliste, descansa tranquilo!';
    } catch {
      return '🎉 ¡Excelente! ¡Hoy cumpliste, descansa tranquilo!';
    }
  }

  /**
   * Clasifica si un mensaje del usuario indica que avanzó en su curso.
   * Retorna true si Gemini interpreta que sí avanzó, false si no.
   * Usa keywords como fallback si Gemini no está disponible.
   */
  async detectsProgress(message: string): Promise<boolean> {
    if (!this.model) {
      return this.keywordFallback(message);
    }

    const prompt = [
      `Eres un clasificador de intención. Un usuario está siendo recordado de avanzar en su curso de Autodesk Revit.`,
      `El usuario envió este mensaje: "${message}"`,
      `¿El mensaje indica que el usuario YA avanzó, estudió, terminó o hizo progreso en su curso hoy?`,
      `Considera mensajes informales, coloquiales, en español o inglés. Ejemplos positivos:`,
      `- "ya le avancé", "listo", "ya terminé por hoy", "hecho", "sí ya estudié", "ya mero acabo", "done"`,
      `- "acabo de terminar", "le metí una hora", "ya hice mi parte", "juiciosa hoy"`,
      `- Cualquier variación que implique que ya hizo progreso`,
      `Ejemplos negativos (NO indican avance):`,
      `- "hola", "qué tal", "luego le avanzo", "no he podido", "mañana", preguntas, saludos`,
      `Responde ÚNICAMENTE con "SI" o "NO", nada más.`,
    ].join('\n');

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text()?.trim().toUpperCase();
      return text === 'SI' || text === 'SÍ';
    } catch (err) {
      this.logger.warn(`Error clasificando mensaje con Gemini: ${err}. Usando keywords.`);
      return this.keywordFallback(message);
    }
  }

  /** Detección por keywords como fallback */
  /** Genera un mensaje de buenos días preguntando si llegó temprano a la oficina */
  private async generateMorningMessage(): Promise<string> {
    if (!this.model) {
      return this.getFallback('morning');
    }

    const prompt = [
      `Actúa como un paisa seguro, relajado y molestón. Genera un mensaje corto de buenos días para Bibiana (puedes decirle Bibi).`,
      `El objetivo: Preguntarle si ya llegó temprano a la oficina hoy. Es una pregunta cariñosa pero con recocha.`,
      `El tono: Puro "banter" (recocha) y coqueteo disimulado. Como un novio molestón que la quiere ver juiciosa. Usa expresiones colombianas naturales.`,
      `Ejemplos del estilo:`,
      `- "Buenos días pollita ☀️ ¿Ya llegó la más juiciosa a la oficina o todavía está peleando con la almohada? jaja"`,
      `- "Ey Bibi, reporte de llegada temprana a la ofici, ¿o qué? Ojo pues que la estoy vigilando jaja ☕"`,
      `El mensaje debe:`,
      `- Ser diferente cada vez (creativo, variado)`,
      `- Usar 1 o 2 emojis relevantes máximo (☀️, ☕, 🌅, etc.)`,
      `- Tener máximo 2 oraciones cortas`,
      `- Ser divertido, cariñoso y motivador`,
      `- No usar comillas, saludos formales ni formato markdown`,
      `- Nada en tono sexual`,
      `Solo responde con el mensaje de texto exacto, nada más.`,
    ].join('\n');

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text()?.trim();
      if (text && text.length > 5 && text.length < 500) {
        return text;
      }
      return this.getFallback('morning');
    } catch (err) {
      this.logger.warn(`Error de Gemini (morning): ${err}. Usando fallback.`);
      return this.getFallback('morning');
    }
  }

  private keywordFallback(text: string): boolean {
    const normalized = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const keywords = [
      'ya avance', 'avance', 'ya estudie', 'estudie', 'ya termine', 'termine',
      'listo', 'hecho', 'ya hice', 'complete', 'ya lo hice', 'ya le avance',
      'si avance', 'si le avance', 'ya acabe', 'done', 'ready',
    ];
    return keywords.some((kw) => normalized.includes(kw));
  }

  private getFallback(timeOfDay: TimeOfDay): string {
    const pools: Record<TimeOfDay, string[]> = {
      morning: FALLBACK_MORNING,
      afternoon: FALLBACK_AFTERNOON,
      evening: FALLBACK_EVENING,
    };
    const pool = pools[timeOfDay];
    return pool[Math.floor(Math.random() * pool.length)];
  }
}
