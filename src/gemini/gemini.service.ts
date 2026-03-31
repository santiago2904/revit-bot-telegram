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
  '⚡ Bibi, ya son las 10 y ESTAMOS EN SEMANA SANTA. Ese Revit se tiene que terminar HOY, cero excusas jaja',
  '🚨 10 AM - Se está acabando Semana Santa y ese curso sigue pendiente. MODO URGENTE activado jaja',
  '💥 Buenos días, pollito. Ya estamos en Semana Santa y perdiendo tiempo valioso, a camellar YA jaja',
];

const FALLBACK_AFTERNOON = [
  '🔥 1 PM - Media Semana Santa y todavía con ese Revit pendiente. NO PUEDE SER, póngase las pilas jaja',
  '⚠️ Bibi, recordatorio CRÍTICO: Estamos EN Semana Santa, cada minuto cuenta. Revit AHORA jaja',
  '💪 Ya es tarde y ese curso sigue esperando. Se te va la Semana Santa sin terminar, hágale pues jaja',
];

const FALLBACK_LATE_AFTERNOON = [
  '🚨 4 PM - ALERTA MÁXIMA: Semana Santa se está yendo y ese Revit sigue ahí. Último chance del día jaja',
  '💥 Son las 4 y ya casi perdemos otro día de Semana Santa. MODO DESESPERADO, a camellar jaja',
  '⏰ 4 PM, se acaba el día y la Semana Santa. Si no avanzás ahora, perdiste el día completo jaja',
];

const FALLBACK_EVENING = [
  '🔴 7 PM - ÚLTIMA LLAMADA. Otro día perdido de Semana Santa por ese Revit. Dale YA que mañana es lo mismo jaja',
  '⚠️ EMERGENCIA: Son las 7 PM, se acabó el día y Semana Santa se nos va. Revit AHORA o nada jaja',
  '💀 7 PM - Se fue otro día. ¿Querés que Semana Santa se acabe con ese curso pendiente? Dale pues jaja',
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
        intensity = 'MUY directo y urgente';
        timeContext = 'ESTAMOS EN SEMANA SANTA y ese curso todavía no está terminado. Se está perdiendo tiempo valioso de vacaciones por ese Revit pendiente.';
        break;
      case 'afternoon':
        timeLabel = 'después del almuerzo (1 PM)';
        intensity = 'CRÍTICO y presionante al máximo';
        timeContext = 'Ya es tarde, estamos EN SEMANA SANTA y el curso sigue pendiente. Cada hora que pasa es tiempo de Semana Santa desperdiciado.';
        break;
      case 'late-afternoon':
        timeLabel = 'media tarde (4 PM)';
        intensity = 'DESESPERADO y ultra urgente';
        timeContext = 'El día casi se acabó, estamos EN PLENA SEMANA SANTA y ese Revit sigue ahí. Esto es CRÍTICO, es el último chance del día.';
        break;
      case 'evening':
        timeLabel = 'la noche (7 PM)';
        intensity = 'EMERGENCIA TOTAL - Presión absoluta';
        timeContext = 'ÚLTIMA OPORTUNIDAD DEL DÍA. Estamos EN SEMANA SANTA y se está yendo otro día sin terminar. Si no avanza YA, perdió todo el día.';
        break;
    }

      const prompt = [
        `Actúa como un paisa SÚPER molestón, presionante y directo. Genera un mensaje MUY presionante para Bibiana (puedes decirle "Bibi") sobre su curso de Autodesk Revit.`,
        `CONTEXTO CRÍTICO: YA ESTAMOS EN SEMANA SANTA y ella TODAVÍA no ha terminado ese curso. Se está perdiendo días de vacaciones por esa procrastinación. ${timeContext} Esto es GRAVE.`,
        `El tono: ${intensity}. Más allá del "banter" normal, esto es PRESIÓN REAL pero con cariño. Como un comandante EN CRISIS pero que la quiere. Usa MAYÚSCULAS ocasionalmente para énfasis. Expresiones como: "YA estamos en Semana Santa", "se te va el tiempo", "perdiendo días", "modo emergencia", "AHORA o nunca", "última oportunidad", "se acabó la paciencia" y siempre "jaja" al final para no sonar agresivo.`,
        `IMPORTANTE: Ya NO es "para la otra semana", YA ESTÁN EN SEMANA SANTA. El enfoque es: "te estás perdiendo Semana Santa", "cada minuto cuenta", "se te va el tiempo de vacaciones", "ya perdimos días por ese curso".`,
        `Ejemplos del estilo ULTRA PRESIONANTE:`,
        `- "Bibi, ya son las 10 AM y ESTAMOS EN SEMANA SANTA. Ese Revit se tiene que acabar HOY, se nos está yendo el tiempo jaja."`,
        `- "ALERTA ROJA: Ya es 1 PM de Semana Santa y ese curso sigue pendiente. No puede ser, a camellar YA que se va el día jaja."`,
        `- "Bibi, son las 7 PM, se fue OTRO día de Semana Santa por ese Revit. ¿Querés perder toda la semana? Dale pues jaja."`,
        `Es ${timeLabel}. El mensaje debe:`,
        `- Ser EXTREMADAMENTE presionante (pero sin ser grosero)`,
        `- Enfatizar que YA están EN Semana Santa perdiendo tiempo`,
        `- Ser diferente cada vez, creativo y MUY directo`,
        `- Usar 1-2 emojis de urgencia (🚨, 🔥, ⚠️, 💥, ⏰, 🔴, 💀)`,
        `- Máximo 2 oraciones cortas pero MUY contundentes`,
        `- Usar MAYÚSCULAS estratégicamente para énfasis`,
        `- Terminar con "jaja" para suavizar`,
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
