import { api } from "./api";

export type Class = {
  id: number;
  teacher_id?: number | null;
  name: string;
  recurrence_desc: string;
  recurrence_json: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
  generated_lessons_count?: number;
};

export type ClassPayload = {
  teacher_id?: number | null;
  name: string;
  recurrence_desc: string;
  recurrence_json: string;
};

export type PrivateClassPayload = ClassPayload & {
  student_id: number;
};

export type ClassStudent = {
  id: number;
  nome: string;
  livro?: string;
  alfabetizacao?: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AddStudentToClassResponse = {
  class_id: number;
  student_id: number;
};

type RawClassStudent = Record<string, unknown>;

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

function asBoolean(value: unknown) {
  return value === true || value === 1 || value === "1";
}

export function normalizeClassStudent(item: RawClassStudent): ClassStudent {
  return {
    id: asNumber(item.id),
    nome: asString(item.nome),
    livro: asString(item.livro) || undefined,
    alfabetizacao: asString(item.alfabetizacao) || undefined,
    ativo: asBoolean(item.ativo),
    created_at: asString(item.created_at) || undefined,
    updated_at: asString(item.updated_at) || undefined,
  };
}

export async function fetchClasses(): Promise<Class[]> {
  const res = await api.get<Class[]>("/classes");
  return res.data;
}

export async function createClass(payload: ClassPayload): Promise<Class> {
  const res = await api.post<Class>("/classes", payload);
  return res.data;
}

export async function createPrivateClassFromStudent(payload: PrivateClassPayload): Promise<Class> {
  const res = await api.post<Class>("/classes/private", payload);
  return res.data;
}

export async function updateClass(id: number, payload: ClassPayload): Promise<Class> {
  const res = await api.put<Class>(`/classes/${id}`, payload);
  return res.data;
}

export async function deleteClass(id: number): Promise<void> {
  await api.delete(`/classes/${id}`);
}

export async function fetchClassStudents(id: number): Promise<ClassStudent[]> {
  const res = await api.get(`/classes/${id}/students`);
  const data = Array.isArray(res.data) ? res.data : [];
  return data.map((item) => normalizeClassStudent(item as RawClassStudent));
}

export async function addStudent(
  classID: number,
  studentID: number
): Promise<AddStudentToClassResponse> {
  const res = await api.post<AddStudentToClassResponse>(
    `/classes/${classID}/students/${studentID}`
  );
  return res.data;
}

export async function removeStudent(classID: number, studentID: number): Promise<void> {
  await api.delete(`/classes/${classID}/students/${studentID}`);
}
