export const weekdayOptions = [
  { key: "domingo", shortLabel: "D", label: "Domingo" },
  { key: "segunda", shortLabel: "S", label: "Segunda" },
  { key: "terca", shortLabel: "T", label: "Terca" },
  { key: "quarta", shortLabel: "Q", label: "Quarta" },
  { key: "quinta", shortLabel: "Q", label: "Quinta" },
  { key: "sexta", shortLabel: "S", label: "Sexta" },
  { key: "sabado", shortLabel: "S", label: "Sabado" },
] as const;

export type WeekdayKey = (typeof weekdayOptions)[number]["key"];

export type ClassRecurrence = {
  weekdays: WeekdayKey[];
  lesson_count: number;
  start_date: string;
  start_time: string;
};

const weekdayOrder = weekdayOptions.map((item) => item.key);

export function sortWeekdays(weekdays: string[]) {
  return [...weekdays].sort(
    (left, right) => weekdayOrder.indexOf(left as WeekdayKey) - weekdayOrder.indexOf(right as WeekdayKey)
  ) as WeekdayKey[];
}

export function buildRecurrenceDescription(recurrence: ClassRecurrence) {
  const dayLabels = sortWeekdays(recurrence.weekdays)
    .map((day) => weekdayOptions.find((item) => item.key === day)?.label.slice(0, 3))
    .filter(Boolean)
    .join(", ");

  return `${dayLabels} as ${recurrence.start_time}, ${recurrence.lesson_count} aulas, inicio ${formatDate(
    recurrence.start_date
  )}`;
}

export function parseRecurrenceJson(raw: string) {
  if (!raw.trim()) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ClassRecurrence>;

    if (
      !Array.isArray(parsed.weekdays) ||
      typeof parsed.lesson_count !== "number" ||
      typeof parsed.start_date !== "string" ||
      typeof parsed.start_time !== "string"
    ) {
      return null;
    }

    return {
      weekdays: sortWeekdays(parsed.weekdays),
      lesson_count: parsed.lesson_count,
      start_date: parsed.start_date,
      start_time: parsed.start_time,
    } satisfies ClassRecurrence;
  } catch {
    return null;
  }
}

export function formatDate(value: string) {
  if (!value) return "";

  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;

  return `${day}/${month}/${year}`;
}
