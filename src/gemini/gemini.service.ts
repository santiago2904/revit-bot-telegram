import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

/** Mensajes de fallback si Gemini no está disponible */
const FALLBACK_MORNING = [
  '☀️ Buenos días mi próxima mujer ¿Ya llegaste tempranito o todavía soñando? jaja',
  '🌅 ¡Arriba perezosa! Ojo que la que va a ser mi esposa tiene que ser puntual ☕ jaja',
  '💤 Buenos días futura señora ¿Ya estás en la ofici o sigues en modo zombie?',
  '🌤️ Ey mi próxima mujer, reporte de llegada. ¿Fuiste juiciosa hoy? jaja',
  '☀️ ¡Buenos días! A ver si mi futura esposa llegó temprano hoy jaja',
  '🌞 Bibi, mi próxima mujer ¿ya en modo trabajo o modo Instagram? jaja',
];

const FALLBACK_LUNCH = [
  '😋 Ey mi próxima mujer, ve a almorzar que si no te pones malgenio jaja 🍽️',
  '🍴 Futura señora, hora de ir a comer. Y no me salgas con que solo café jaja',
  '🌮 Mi próxima esposa, almuerzo YA. Que después te duele la cabeza jaja',
  '🍕 Ve a almorzar mi futura mujer, que te conozco y sos capaz de aguantar hambre jaja',
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

    // Obtener la fecha actual en timezone de Colombia
    const today = new Date();
    const dayName = today.toLocaleDateString('es-CO', { 
      weekday: 'long',
      timeZone: 'America/Bogota'
    });
    const dateStr = today.toLocaleDateString('es-CO', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      timeZone: 'America/Bogota'
    });
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
        `Actúa como un paisa seguro y molestón (puro banter). Genera un mensaje recordándole a Bibiana (puedes decirle Bibi, mi próxima mujer, mi futura esposa) sobre su curso de Autodesk Revit.`,
        `CONTEXTO: Hoy es ${currentDate} y ella todavía no ha avanzado en su curso hoy. ${timeContext}`,
        `El tono: ${intensity}. BANTER con presión pero con personalidad. Usa MAYÚSCULAS estratégicamente. SIEMPRE incluir referencias como "mi próxima mujer", "mi futura esposa" de forma natural. Expresiones: "DALE YA", "No puede ser", "BASTA de procrastinar", "AHORA sí", "Última oportunidad" y siempre "jaja" al final.`,
        `IMPORTANTE: El enfoque debe ser: "Ya es ${timeLabel}, ${dayName}, hora de avanzar mi futura esposa", "El día se está acabando", "Dale aunque sea un ratito", "AHORA O NUNCA".`,
        `Ejemplos del estilo para la noche con referencias:`,
        `- "Mi próxima mujer, ya son las 7:30 PM del ${dayName}. Dale aunque sea una horita a ese Revit, no dejes que el día se vaya sin nada jaja."`,
        `- "Futura señora, 8:30 PM y ese curso sigue ahí. DALE YA que se te va la noche completa jaja."`,
        `- "CÓDIGO ROJO mi futura esposa: 9:30 PM. AHORA O NUNCA, dale media horita antes de dormir jaja."`,
        `Es ${timeLabel}. El mensaje debe:`,
        `- SIEMPRE incluir "mi próxima mujer", "mi futura esposa", "futura señora" de forma natural`,
        `- Ser presionante pero con banter (no romántico, directo)`,
        `- Mencionar que hoy es ${dayName} y la hora exacta`,
        `- Ser directo con personalidad molestona`,
        `- Usar 1-2 emojis de urgencia (🚨, 🔴, ⚠️, 💥, ⏰)`,
        `- Máximo 2 oraciones cortas`,
        `- MAYÚSCULAS en palabras clave`,
        `- Terminar SIEMPRE con "jaja"`,
        `- No usar comillas ni formato markdown`,
        `- Combinar urgencia con referencias naturales de "futura esposa"`,
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
      `Actúa como un paisa seguro, relajado y molestón (puro banter). Genera un mensaje de buenos días para Bibiana (puedes decirle Bibi, mi próxima mujer, mi futura esposa, futura señora).`,
      `El objetivo: Darle buenos días y preguntarle si llegó temprano a la oficina, pero con RECOCHA. SIEMPRE incluir alguna referencia a que es "mi próxima mujer" o "mi futura esposa" de forma natural y casual.`,
      `El tono: BANTER puro con referencias sutiles a que será tu esposa. Como un novio seguro que la vacila. Directo, chistoso, con personalidad. Puedes implicar que suele llegar tarde.`,
      `Ejemplos del estilo banter con "próxima mujer":`,
      `- "Buenos días mi próxima mujer ☀️ ¿Hoy sí llegaste temprano o como siempre tarde? jaja"`,
      `- "Ey futura señora, ¿ya estás en la ofici o todavía peleando con la almohada? ☕ jaja"`,
      `- "Buenos días mi futura esposa ¿La impuntual oficial llegó a tiempo hoy? Ojo pues jaja"`,
      `El mensaje debe:`,
      `- SIEMPRE incluir "mi próxima mujer", "mi futura esposa", "futura señora" u otra alusión similar`,
      `- Tener PERSONALIDAD y recocha, nada cursi`,
      `- Ser diferente cada vez (creativo, variado)`,
      `- Usar 1 emoji relevante máximo (☀️, ☕, 🌅, 💤)`,
      `- Máximo 2 oraciones cortas`,
      `- Preguntar sobre si llegó temprano con tono burlón/molestón`,
      `- Terminar con "jaja" siempre`,
      `- No usar comillas ni formato markdown`,
      `- Combinar banter con referencias naturales de "futura esposa"`,
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
      `Actúa como un paisa seguro, relajado y molestón (puro banter). Genera un mensaje de almuerzo para Bibiana (puedes decirle Bibi, mi próxima mujer, mi futura esposa, futura señora).`,
      `El objetivo: Recordarle ir a almorzar con vacile. SIEMPRE incluir referencia a "mi próxima mujer" o "mi futura esposa".`,
      `El tono: BANTER puro con alusiones naturales de futura esposa. Como un novio seguro que la vacila. Puedes implicar que se le olvida comer o que se pone malgenio si no come.`,
      `Ejemplos del estilo banter con referencias:`,
      `- "Ey mi próxima mujer, ve a almorzar que si no te pones insoportable jaja 🍽️"`,
      `- "Futura señora, a comer YA. Que te conozco y sos capaz de aguantar hambre jaja"`,
      `- "Mi futura esposa, andá a almorzar que después te duele la cabeza jaja 🌮"`,
      `El mensaje debe:`,
      `- SIEMPRE incluir "mi próxima mujer", "mi futura esposa", "futura señora" u otra alusión similar`,
      `- Tener PERSONALIDAD y recocha molestona`,
      `- Ser diferente cada vez (creativo, variado)`,
      `- Usar 1 emoji de comida máximo (🍽️, 🍕, 🌮, 🍴, 😋)`,
      `- Máximo 2 oraciones cortas`,
      `- Implicar que conoces sus mañas con la comida`,
      `- Terminar con "jaja" siempre`,
      `- No usar comillas ni formato markdown`,
      `- Combinar banter con referencias naturales de "futura esposa"`,
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
