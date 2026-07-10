export const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
] as const;

export function getWeekdayLabel(weekday: number) {
  return WEEKDAY_LABELS[weekday] ?? "Dia inválido";
}
