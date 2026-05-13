import type { Lesson } from "../services/lessons";

export type LessonSummary = {
  total: number;
  completed: number;
};

export function getLessonSummary(lessons: Lesson[]): LessonSummary {
  const total = lessons.length;
  const completed = lessons.filter((lesson) => {
    const statusName = lesson.status_name?.trim().toLowerCase() ?? "";
    return lesson.status_id === 2 || statusName === "realizada";
  }).length;

  return {
    total,
    completed,
  };
}
