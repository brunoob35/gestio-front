import type { Lesson } from "../services/lessons";

type LessonStatusTone =
  | "pending"
  | "completed"
  | "overdue"
  | "reschedule-pending"
  | "rescheduled"
  | "compensated"
  | "cancelled";

type LessonStatusPresentation = {
  label: string;
  tone: LessonStatusTone;
};

function normalizeStatusName(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function parseLessonDate(value?: string) {
  if (!value) return null;
  const normalized = value.replace(" ", "T");
  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp);
}

export function getLessonStatusPresentation(
  lesson: Pick<Lesson, "status_id" | "status_name" | "lesson_date">
): LessonStatusPresentation {
  const statusName = normalizeStatusName(lesson.status_name);
  const lessonDate = parseLessonDate(lesson.lesson_date);
  const isOverduePending =
    (lesson.status_id === 1 || statusName === "pendente") &&
    lessonDate !== null &&
    lessonDate.getTime() < Date.now();

  if (isOverduePending) {
    return {
      label: "Vencida",
      tone: "overdue",
    };
  }

  if (lesson.status_id === 2 || statusName === "realizada") {
    return {
      label: lesson.status_name || "Realizada",
      tone: "completed",
    };
  }

  if (lesson.status_id === 3 || statusName === "cancelada") {
    return {
      label: lesson.status_name || "Cancelada",
      tone: "cancelled",
    };
  }

  if (lesson.status_id === 4 || statusName === "remarcada") {
    return {
      label: lesson.status_name || "Remarcada",
      tone: "rescheduled",
    };
  }

  if (lesson.status_id === 5 || statusName === "pendente reagendamento") {
    return {
      label: lesson.status_name || "Pendente reagendamento",
      tone: "reschedule-pending",
    };
  }

  if (lesson.status_id === 6 || statusName === "indenizada") {
    return {
      label: lesson.status_name || "Indenizada",
      tone: "compensated",
    };
  }

  return {
    label: lesson.status_name || "Pendente",
    tone: "pending",
  };
}
