import { api } from "./api";
import { normalizeStudent, type StudentRow } from "./students";

export type Lesson = {
  id: number;
  status_id: number;
  status_name?: string;
  teacher_id?: number | null;
  class_id: number;
  subject?: string;
  vocabulary?: string;
  balance?: string;
  notes?: string;
  lesson_date: string;
  created_at?: string;
  updated_at?: string;
};

export type LessonPayload = {
  class_id: number;
  teacher_id?: number | null;
  status_id?: number;
  subject?: string;
  vocabulary?: string;
  balance?: string;
  notes?: string;
  lesson_date: string;
};

export type LessonStatusOption = {
  id: number;
  nome_status: string;
};

type RawLesson = Record<string, unknown>;

function asString(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function asNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function asNullableNumber(value: unknown) {
  const parsed = asNumber(value);
  return parsed > 0 ? parsed : null;
}

export function normalizeLesson(item: RawLesson): Lesson {
  return {
    id: asNumber(item.id),
    status_id: asNumber(item.status_id),
    status_name: asString(item.status_name) || undefined,
    teacher_id: asNullableNumber(item.teacher_id),
    class_id: asNumber(item.class_id),
    subject: asString(item.subject) || undefined,
    vocabulary: asString(item.vocabulary) || undefined,
    balance: asString(item.balance) || undefined,
    notes: asString(item.notes) || undefined,
    lesson_date: asString(item.lesson_date),
    created_at: asString(item.created_at) || undefined,
    updated_at: asString(item.updated_at) || undefined,
  };
}

export async function fetchLessonsByClass(classID: number): Promise<Lesson[]> {
  const response = await api.get(`/classes/${classID}/lessons`);
  const data = Array.isArray(response.data) ? response.data : [];
  return data.map((item) => normalizeLesson(item as RawLesson));
}

export async function createLesson(payload: LessonPayload) {
  const response = await api.post("/lessons", payload);
  return normalizeLesson((response.data ?? {}) as RawLesson);
}

export async function updateLesson(lessonID: number, payload: LessonPayload) {
  const response = await api.put(`/lessons/${lessonID}`, payload);
  return response.data;
}

export async function updateLessonStatus(lessonID: number, statusID: number) {
  const response = await api.patch(`/lessons/${lessonID}/status`, {
    status_id: statusID,
  });
  return response.data;
}

export async function deleteLesson(lessonID: number) {
  await api.delete(`/lessons/${lessonID}`);
}

export async function fetchLessonStatuses() {
  const response = await api.get("/lessons/statuses");
  const data = Array.isArray(response.data) ? response.data : [];
  return data.map((item) => ({
    id: asNumber((item as RawLesson).id),
    nome_status: asString((item as RawLesson).nome_status),
  }));
}

export async function fetchLessonStudents(lessonID: number): Promise<StudentRow[]> {
  const response = await api.get(`/lessons/${lessonID}/students`);
  const data = Array.isArray(response.data) ? response.data : [];
  return data.map((item) => normalizeStudent((item ?? {}) as Record<string, unknown>));
}

export async function addStudentToLesson(
  lessonID: number,
  studentID: number,
  note?: string
) {
  const response = await api.post(`/lessons/${lessonID}/students/${studentID}`, {
    note,
  });
  return response.data;
}

export async function removeStudentFromLesson(lessonID: number, studentID: number) {
  await api.delete(`/lessons/${lessonID}/students/${studentID}`);
}
