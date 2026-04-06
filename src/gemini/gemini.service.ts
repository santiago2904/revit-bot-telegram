import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

/** Mensajes de fallback si Gemini no está disponible */
const FALLBACK_MORNING = [
  '☀️ Buenos días mi amor ¿Ya estás en la ofici o todavía soñando conmigo? jaja',
  '🌅 ¡Arriba mi vida! Espero que hoy llegues tempranito a trabajar ☕',
  '💕 Buenos días preciosa ¿La más linda ya llegó a la oficina?',
  '🌤️ Buenos días mi cielo ¿Madrugaste o te quedaste en la cama extrañándome? jaja',
  '☀️ ¡Buenos días hermosa! Reporte de llegada pues, a ver si fuiste juiciosa',
  '🌞 Mi amor, buenos días ¿Ya estás siendo productiva o pensando en mí? jaja',
];

const FALLBACK_LUNCH = [
  '😍 Hola preciosa, ve a almorzar ¿sí? Que necesitas energías y además te ves divina cuando comes jaja 🍽️',
  '💕 Mi vida linda, hora de almorzar. Ve y come rico, que te lo mereces todo 💖',
  '🌹 Belleza, ya es hora de que vayas a comer. No me hagas ir hasta allá a llevarte jaja 🍴',
  '😘 Mi reina hermosa, ve a almorzar. Necesitas estar bien alimentada para brillar como siempre ✨',
];

const FALLBACK_EVENING_730 = [
  '🚨 Bibi, son las 7:30 PM y ese Revit sigue ahí. DALE, que ya es hora de terminar eso jaja',
  '⚠️ Mi vida, 7:30 PM. Ándale con ese curso que se te va la noche jaja',
  '💥 Bibi, EMERGENCIA nocturna: 7:30 PM y pendiente. AHORA sí, a camellar jaja',
];

const FALLBACK_EVENING_830 = [
  '🔴 8:30 PM Bibi, ya casi son las 9. ESE REVIT YA, por favor jaja',
  '⚠️ Mi amor, 8:30 PM. No me hagas seguir molestando, dale al curso jaja',
  '💀 8:30 PM y nada. Bibi, BASTA de procrastinar, necesito verte avanzar jaja',
];

const FALLBACK_EVENING_930 = [
  '🚨 CÓDIGO ROJO: 9:30 PM, se acaba el día. AHORA O NUNCA con ese Revit jaja',
  '⚠️ 9:30 PM Bibi. ÚLTIMA oportunidad del día, dale YA jaja',
  '💥 CRISIS: 9:30 PM. Por favor amor, no dejes que el día termine sin nada jaja',
];

type TimeOfDay = 'morning' | 'lunch' | 'evening-730' | 'evening-830' | 'evening-930';

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

    // Prompt para el almuerzo (piropo + recordatorio de comer)
    if (timeOfDay === 'lunch') {
      return this.generateLunchMessage();
    }

    // Obtener la fecha actual
    const today = new Date();
    const dayName = today.toLocaleDateString('es-CO', { weekday: 'long' });
    const dateStr = today.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
    const currentDate = `${dayName}, ${dateStr}`;

    // Definir contexto según la hora del día (recordatorios nocturnos)
    let timeLabel = '';
    let intensity = '';
    let timeContext = '';

    switch (timeOfDay) {
      case 'evening-730':
        timeLabel = 'las 7:30 PM';
        intensity = 'PRESIÓN MEDIA - tono firme pero cariñoso';
        timeContext = `Son las 7:30 PM del ${currentDate}. Aún hay tiempo para avanzar en el curso. Es momento de empezar antes de que sea muy tarde.`;
        break;
      case 'evening-830':
        timeLabel = 'las 8:30 PM';
        intensity = 'PRESIÓN ALTA - tono más urgente';
        timeContext = `Ya son las 8:30 PM del ${currentDate}. El tiempo se está acabando. Necesita arrancar YA con ese Revit.`;
        break;
      case 'evening-930':
        timeLabel = 'las 9:30 PM';
        intensity = 'MÁXIMA PRESIÓN - tono desesperado pero final';
        timeContext = `CÓDIGO ROJO: 9:30 PM del ${currentDate}. ÚLTIMA oportunidad del día. Si no empieza AHORA, otro día se va completo.`;
        break;
    }

      const prompt = [
        `Actúa como un paisa molestón pero cariñoso. Genera un mensaje recordándole a Bibiana (decile "Bibi") sobre su curso de Autodesk Revit.`,
        `CONTEXTO: Hoy es ${currentDate} y ella todavía no ha avanzado en su curso hoy. ${timeContext}`,
        `El tono: ${intensity}. Es presión REAL pero con cariño. Usa MAYÚSCULAS estratégicamente. Expresiones: "DALE YA", "No puede ser", "BASTA de procrastinar", "AHORA sí", "Última oportunidad" y siempre "jaja" al final para suavizar.`,
        `IMPORTANTE: El enfoque debe ser: "Ya es ${timeLabel}, ${dayName}, hora de avanzar", "El día se está acabando", "Dale aunque sea un ratito", "AHORA O NUNCA".`,
        `Ejemplos del estilo para la noche:`,
        `- "Bibi amor, ya son las 7:30 PM del ${dayName}. Dale aunque sea una horita a ese Revit, no dejes que el día se vaya sin nada jaja."`,
        `- "Mi vida, 8:30 PM y ese curso sigue ahí. DALE YA que se te va la noche completa jaja."`,
        `- "CÓDIGO ROJO Bibi: 9:30 PM. AHORA O NUNCA mi amor, dale media horita antes de dormir jaja."`,
        `Es ${timeLabel}. El mensaje debe:`,
        `- Ser presionante pero con cariño (usar "mi vida", "mi amor" ocasionalmente)`,
        `- Mencionar que hoy es ${dayName} y la hora exacta`,
        `- Ser directo pero no agresivo`,
        `- Usar 1-2 emojis de urgencia (🚨, 🔴, ⚠️, 💥, ⏰)`,
        `- Máximo 2 oraciones cortas`,
        `- MAYÚSCULAS en palabras clave`,
        `- Terminar SIEMPRE con "jaja"`,
        `- No usar comillas ni formato markdown`,
        `Solo responde con el mensaje de texto exacto, nada más.`
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
      `Actúa como un novio cariñoso y tierno pero con toque de recocha paisa. Genera un mensaje de buenos días para Bibiana (puedes decirle Bibi, mi amor, mi vida, preciosa).`,
      `El objetivo: Darle buenos días de manera tierna y dulce, y preguntarle si ya llegó temprano a la oficina. Es pregunta cariñosa con un toque juguetón.`,
      `El tono: MUY tierno y amoroso pero divertido. Como un novio enamorado que la quiere ver juiciosa. Puedes usar expresiones de cariño genuinas mezcladas con humor colombiano suave.`,
      `Ejemplos del estilo tierno pero chistoso:`,
      `- "Buenos días mi amor hermosa ☀️ ¿Ya llegó la más bonita de la oficina o todavía está soñando? jaja 💕"`,
      `- "Mi vida preciosa, buenos días ¿Ya estás en la ofici siendo la más linda del lugar? ☕😘"`,
      `- "Buenos días mi cielo bello ¿Llegaste tempranito o te quedaste extrañándome en la cama? jaja 💖"`,
      `El mensaje debe:`,
      `- Ser TIERNO y AMOROSO primero, chistoso segundo`,
      `- Usar expresiones de cariño genuinas (mi amor, mi vida, preciosa, hermosa, mi cielo)`,
      `- Incluir 2 emojis cariñosos (💕, ☀️, ☕, 😘, 💖, 🌅, ✨)`,
      `- Preguntar sobre si llegó temprano a la oficina de forma dulce`,
      `- Ser diferente cada vez (creativo, variado)`,
      `- Máximo 2 oraciones cortas`,
      `- Terminar con "jaja" o emoji cariñoso`,
      `- No usar comillas, saludos fríos ni formato markdown`,
      `- Nada en tono sexual, solo amor puro y recocha`,
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

  /** Genera un mensaje de piropo y recordatorio de almuerzo */
  private async generateLunchMessage(): Promise<string> {
    if (!this.model) {
      return this.getFallback('lunch');
    }

    const prompt = [
      `Actúa como un novio enamorado y cariñoso. Genera un mensaje para Bibiana (puedes decirle Bibi, mi amor, preciosa, hermosa).`,
      `El objetivo: Hacerle un piropo genuino y dulce, Y recordarle que debe ir a almorzar. Las dos cosas son importantes.`,
      `El tono: MUY romántico y tierno. Como un novio que la adora y se preocupa por que coma bien. Debe sentirse especial y querida.`,
      `Ejemplos del estilo:`,
      `- "Mi amor hermosa, ve a almorzar ¿sí? Te ves preciosa siempre pero necesitas comer rico para tener energía 💕🍽️"`,
      `- "Preciosa, hora de almorzar. Sos demasiado linda como para andar sin comer bien, dale mi vida 😍✨"`,
      `- "Mi vida bella, anda a almorzar que te lo mereces todo. Además cuando comes se te ve esa sonrisa que me mata 🌹💖"`,
      `El mensaje debe:`,
      `- Empezar con un piropo genuino y hermoso (sobre su belleza, su forma de ser, algo específico)`,
      `- Luego recordarle que vaya a almorzar de manera cariñosa`,
      `- Usar expresiones de cariño (mi amor, preciosa, hermosa, mi vida, bella)`,
      `- Incluir 2 emojis románticos/tiernos (😍, 💕, 🌹, 💖, ✨, 🍽️, 🍴)`,
      `- Ser diferente cada vez (creatividad en los piropos)`,
      `- Máximo 2 oraciones`,
      `- Sentirse genuino y amoroso, no forzado`,
      `- No usar comillas ni formato markdown`,
      `- Nada sexual, solo amor puro y admiración`,
      `Solo responde con el mensaje de texto exacto, nada más.`,
    ].join('\n');

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text()?.trim();
      if (text && text.length > 5 && text.length < 500) {
        return text;
      }
      return this.getFallback('lunch');
    } catch (err) {
      this.logger.warn(`Error de Gemini (lunch): ${err}. Usando fallback.`);
      return this.getFallback('lunch');
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
      lunch: FALLBACK_LUNCH,
      'evening-730': FALLBACK_EVENING_730,
      'evening-830': FALLBACK_EVENING_830,
      'evening-930': FALLBACK_EVENING_930,
    };
    const pool = pools[timeOfDay];
    return pool[Math.floor(Math.random() * pool.length)];
  }
}
