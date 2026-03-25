/** Fecha de hoy como YYYY-MM-DD */
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
