import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

/** Mensajes de fallback si Gemini no está disponible */
const FALLBACK_MORNING = [
  '☀️ Buenos días Bibi ¿Ya llegaste tempranito o todavía soñando despierta? jaja',
  '🌅 ¡Arriba perezosa! A ver si hoy madrugaste para variar ☕',
  '💤 Buenos días dormilona ¿Ya estás en la ofici o sigues en modo zombie?',
  '🌤️ Ey, reporte de llegada. ¿Fuiste juiciosa hoy o llegaste tarde como siempre? jaja',
  '☀️ ¡Buenos días! La más impuntual del edificio ya llegó, supongo jaja',
  '🌞 Bibi, ¿ya en modo trabajo o modo Instagram en la oficina? jaja',
];

const FALLBACK_LUNCH = [
  '😋 Ey pollita, ve a almorzar que si no te pones malgenio jaja 🍽️',
  '🍴 Hora de ir a comer algo rico. Y no me salgas con que solo café, ¿oyó? jaja',
  '🌮 Bibi, almuerzo YA. Que después me decís que te duele la cabeza por no comer jaja',
  '🍕 Ve a almorzar juiciosa, que te conozco y sos capaz de aguantar hambre hasta las 5 jaja',
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
      `Actúa como un paisa seguro, relajado y molestón (puro banter). Genera un mensaje de buenos días para Bibiana (puedes decirle Bibi).`,
      `El objetivo: Darle buenos días y preguntarle si llegó temprano a la oficina, pero con RECOCHA. Que se note que la estás vigilando de forma chistosa.`,
      `El tono: BANTER puro (recocha colombiana). Como un amigo molestón que la vacila. Nada romántico ni empalagoso. Directo, chistoso, con personalidad. Puedes implicar que suele llegar tarde o quedarse dormida.`,
      `Ejemplos del estilo banter:`,
      `- "Buenos días Bibi ☀️ ¿Hoy sí llegaste temprano o como siempre de últimas? jaja"`,
      `- "Ey perezosa, ¿ya estás en la ofici o todavía peleando con la almohada? ☕ jaja"`,
      `- "Buenos días pollita ¿La impuntual oficial llegó a tiempo hoy? Ojo que te estoy vigilando jaja"`,
      `El mensaje debe:`,
      `- Tener PERSONALIDAD y recocha, nada cursi`,
      `- Ser diferente cada vez (creativo, variado)`,
      `- Usar 1 emoji relevante máximo (☀️, ☕, 🌅, 💤)`,
      `- Máximo 2 oraciones cortas`,
      `- Preguntar sobre si llegó temprano con tono burlón/molestón`,
      `- Terminar con "jaja" siempre`,
      `- No usar comillas ni formato markdown`,
      `- CERO romanticismo, puro vacile`,
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
      `Actúa como un paisa molestón con banter. Genera un mensaje para Bibiana (puedes decirle Bibi, pollita).`,
      `El objetivo: Recordarle que vaya a almorzar, pero con RECOCHA. Como diciéndole que si no come se pone malgenio o empieza a quejarse.`,
      `El tono: BANTER puro, nada romántico. Como un amigo que la vacila porque sabe que se le olvida comer o aguanta hambre. Directo, chistoso, con personalidad paisa.`,
      `Ejemplos del estilo:`,
      `- "Ey Bibi, ve a almorzar que si no, te ponés insoportable jaja 🍽️"`,
      `- "Hora de comer algo Bibi. Y no me salgas con que solo café, eso no cuenta jaja 🍴"`,
      `- "Pollita, almuerzo YA. Que te conozco y sos capaz de aguantar hambre hasta la noche jaja 😋"`,
      `- "Ve a almorzar juiciosa, que después no quiero quejas de dolor de cabeza jaja 🌮"`,
      `El mensaje debe:`,
      `- Tener RECOCHA y banter, nada cursi ni romántico`,
      `- Implicar que se le olvida comer o aguanta hambre`,
      `- Usar expresiones paisas casuales (pollita, ey, juiciosa, ojo con...)`,
      `- Incluir 1 emoji de comida (😋, 🍽️, 🍴, 🌮, 🍕)`,
      `- Ser diferente cada vez (creatividad)`,
      `- Máximo 2 oraciones`,
      `- Terminar con "jaja"`,
      `- No usar comillas ni formato markdown`,
      `- CERO romanticismo, puro vacile amistoso`,
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
