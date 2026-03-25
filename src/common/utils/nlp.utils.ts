/**
 * Keywords que indican que el usuario avanzó en el curso.
 * Se buscan como subcadenas normalizadas (lowercase, sin tildes).
 */
const PROGRESS_KEYWORDS: string[] = [
  'ya avance',
  'avance',
  'ya estudie',
  'estudie',
  'ya termine',
  'termine',
  'listo',
  'hecho',
  'ya hice',
  'complete',
  'ya lo hice',
  'avance listo',
  'ya le avance',
  'si avance',
  'si le avance',
  'ya mero acabo',
  'ya acabe',
  'done',
  'ready',
];

/** Quita tildes y pasa a minúsculas */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Detecta si un mensaje indica que el usuario avanzó.
 * Retorna true si alguna keyword se encuentra en el texto.
 */
export function detectsProgress(text: string): boolean {
  const normalized = normalize(text);
  return PROGRESS_KEYWORDS.some((kw) => normalized.includes(kw));
}
