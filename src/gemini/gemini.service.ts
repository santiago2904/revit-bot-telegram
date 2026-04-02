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

const FALLBACK_MORNING_REMINDER = [
  '🚨 ALERTA ROJA Bibi: Ya son las 10 AM de Semana Santa y ese Revit sigue pendiente. NO PUEDE SER, a camellar YA jaja',
  '⚠️ CÓDIGO ROJO: 10 AM y PERDIENDO Semana Santa por ese curso. BASTA YA de procrastinar, dale ahora jaja',
  '💥 Bibi EMERGENCIA: Media mañana de Semana Santa y NADA de avance. Se te va TODO el tiempo, hágale YA jaja',
];

const FALLBACK_AFTERNOON = [
  '🔴 CRISIS TOTAL Bibi: 1 PM de Semana Santa y ese Revit sigue ahí. INACEPTABLE, póngase las pilas AHORA jaja',
  '⚠️ EMERGENCIA: Ya es 1 PM y DESPERDICIANDO Semana Santa. Se acabó la paciencia, Revit AHORA jaja',
  '💀 Bibi, recordatorio CRÍTICO: Ya es tarde y perdiendo vacaciones por ese curso. BASTA YA, hágale pues jaja',
];

const FALLBACK_LATE_AFTERNOON = [
  '🚨 ÚLTIMO AVISO: 4 PM, el día casi se acabó y OTRO día de Semana Santa perdido. AHORA O NUNCA jaja',
  '💥 CÓDIGO ROJO: Son las 4 PM y ese Revit sigue pendiente. Si no avanzás AHORA, perdiste TODO el día jaja',
  '⏰ CRISIS FINAL: 4 PM de Semana Santa yéndose. Última oportunidad del día, DALE YA jaja',
];

const FALLBACK_EVENING = [
  '🔴 EMERGENCIA ABSOLUTA: 7 PM, se fue OTRO día COMPLETO de Semana Santa por ese Revit. DALE YA jaja',
  '⚠️ DEFCON 1: Son las 7 PM, PERDISTE el día entero. ¿Querés que Semana Santa se acabe con ese curso pendiente? jaja',
  '💀 ÚLTIMA LLAMADA: 7 PM, día perdido. Si NO avanzás ahora, mañana es lo mismo. BASTA YA jaja',
];

type TimeOfDay = 'morning' | 'morning-reminder' | 'afternoon' | 'late-afternoon' | 'evening';

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

    // Definir contexto según la hora del día
    let timeLabel = '';
    let intensity = '';
    let timeContext = '';

    switch (timeOfDay) {
      case 'morning-reminder':
        timeLabel = 'media mañana (10 AM)';
        intensity = 'MÁXIMA PRESIÓN - tono de comandante en crisis';
        timeContext = 'ALERTA ROJA: ESTAMOS EN SEMANA SANTA y ese curso todavía no está terminado. Cada minuto que pasa es tiempo de vacaciones PERDIDO. Esto es INACEPTABLE.';
        break;
      case 'afternoon':
        timeLabel = 'después del almuerzo (1 PM)';
        intensity = 'NIVEL DE EMERGENCIA - presión absoluta y desesperada';
        timeContext = 'CRISIS TOTAL: Ya es tarde, estamos EN PLENA SEMANA SANTA y el curso sigue pendiente. Se está DESPERDICIANDO Semana Santa por esa procrastinación. BASTA YA.';
        break;
      case 'late-afternoon':
        timeLabel = 'media tarde (4 PM)';
        intensity = 'CÓDIGO ROJO - última oportunidad del día, tono DESESPERADO';
        timeContext = 'ÚLTIMO AVISO: El día casi terminó, estamos EN SEMANA SANTA y ese Revit sigue ahí. Si no avanza AHORA, perdió TODO el día. Esto es CRÍTICO.';
        break;
      case 'evening':
        timeLabel = 'la noche (7 PM)';
        intensity = 'DEFCON 1 - Presión MÁXIMA ABSOLUTA, situación desesperada';
        timeContext = 'EMERGENCIA FINAL: ÚLTIMO MOMENTO DEL DÍA. Estamos EN SEMANA SANTA y se va OTRO día completo sin terminar. Si no actúa YA, perdió 24 horas de vacaciones.';
        break;
    }

      const prompt = [
        `Actúa como un paisa EXTREMADAMENTE molestón y presionante. Genera un mensaje de MÁXIMA PRESIÓN para Bibiana (decile "Bibi") sobre su curso de Autodesk Revit.`,
        `CONTEXTO CRÍTICO ABSOLUTO: YA ESTAMOS EN SEMANA SANTA y ella TODAVÍA no ha terminado ese curso. Se está PERDIENDO días enteros de vacaciones por esa procrastinación INACEPTABLE. ${timeContext} Esto es una EMERGENCIA.`,
        `El tono: ${intensity}. NO es banter, es PRESIÓN REAL. Como un comandante militar EN PLENA CRISIS pero que la quiere. Usa MAYÚSCULAS frecuentemente. Expresiones extremas: "BASTA YA", "NO PUEDE SER", "INACEPTABLE", "EMERGENCIA", "CÓDIGO ROJO", "ALERTA MÁXIMA", "última oportunidad", "se acabó la paciencia", "perdiendo TODO", "CRISIS TOTAL" y siempre "jaja" al final para que no sea agresivo.`,
        `IMPORTANTE: El enfoque debe ser: "se te está YENDO Semana Santa completa", "PERDISTE otro día", "cada segundo cuenta", "vacaciones DESPERDICIADAS", "ya NO hay tiempo", "AHORA O NUNCA".`,
        `Ejemplos del estilo ULTRA DURO:`,
        `- "Bibi, ALERTA ROJA: son las 10 AM de Semana Santa y ese Revit sigue pendiente. NO PUEDE SER, a camellar YA jaja."`,
        `- "CÓDIGO ROJO Bibi: 1 PM de Semana Santa y NADA de avance. Se te va TODO el tiempo de vacaciones, BASTA YA jaja."`,
        `- "EMERGENCIA FINAL: 7 PM, se fue OTRO día COMPLETO de Semana Santa. ¿Querés perder toda la semana? Dale YA jaja."`,
        `Es ${timeLabel}. El mensaje debe:`,
        `- Ser EXTREMADAMENTE presionante y casi agresivo (pero con "jaja" al final)`,
        `- Enfatizar que se está PERDIENDO Semana Santa COMPLETA`,
        `- Ser contundente, directo, SIN sutilezas`,
        `- Usar 2-3 emojis de máxima urgencia (🚨, 🔴, ⚠️, 💥, ⏰, 💀, 🔥)`,
        `- Máximo 2 oraciones MUY cortas y DEVASTADORAS`,
        `- MAYÚSCULAS en palabras clave para énfasis`,
        `- Terminar SIEMPRE con "jaja" para suavizar`,
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
      `Actúa como un paisa seguro, relajado y molestón. Genera un mensaje corto de buenos días para Bibiana (puedes decirle Bibi).`,
      `El objetivo: Preguntarle si ya llegó temprano a la oficina hoy. Es una pregunta cariñosa pero con recocha.`,
      `El tono: Puro "banter" (recocha) y coqueteo disimulado. Como un novio molestón que la quiere ver juiciosa. Usa expresiones colombianas naturales.`,
      `Ejemplos del estilo:`,
      `- "Buenos días ☀️ ¿Ya llegó la más juiciosa a la oficina o todavía está peleando con la almohada? jaja"`,
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
      'morning-reminder': FALLBACK_MORNING_REMINDER,
      afternoon: FALLBACK_AFTERNOON,
      'late-afternoon': FALLBACK_LATE_AFTERNOON,
      evening: FALLBACK_EVENING,
    };
    const pool = pools[timeOfDay];
    return pool[Math.floor(Math.random() * pool.length)];
  }
}
