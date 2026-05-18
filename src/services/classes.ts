import { api } from "./api";

export type ClassAddress = {
  id?: number;
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  pais: string;
  complemento: string;
};

export type Class = {
  id: number;
  teacher_id?: number | null;
  id_endereco?: number | null;
  name: string;
  address?: string;
  endereco?: ClassAddress;
  recurrence_desc: string;
  recurrence_json: string;
  student_count?: number;
  lessons_total?: number;
  lessons_completed?: number;
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
  endereco?: ClassAddress;
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
type RawClass = Record<string, unknown>;

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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function normalizeAddress(item: Record<string, unknown>): ClassAddress {
  return {
    id: asNumber(item.id) || undefined,
    cep: asString(item.cep),
    rua: asString(item.rua),
    numero: asString(item.numero),
    bairro: asString(item.bairro),
    cidade: asString(item.cidade),
    estado: asString(item.estado),
    pais: asString(item.pais) || "Brasil",
    complemento: asString(item.complemento),
  };
}

function formatAddress(address?: ClassAddress) {
  if (!address) return undefined;

  const main = [address.rua, address.numero].filter(Boolean).join(", ");
  const region = [address.bairro, address.cidade, address.estado].filter(Boolean).join(" - ");
  const suffix = [address.cep, address.pais].filter(Boolean).join(" • ");

  return [main, region, suffix].filter(Boolean).join(" | ") || undefined;
}

export function normalizeClass(item: RawClass): Class {
  const normalizedAddress = asRecord(item.endereco)
    ? normalizeAddress(asRecord(item.endereco) as Record<string, unknown>)
    : undefined;

  return {
    id: asNumber(item.id),
    teacher_id: (() => {
      const value = asNumber(item.teacher_id);
      return value > 0 ? value : null;
    })(),
    id_endereco: (() => {
      const value = asNumber(item.id_endereco);
      return value > 0 ? value : null;
    })(),
    name: asString(item.name),
    address:
      asString(item.address) ||
      formatAddress(normalizedAddress) ||
      asString(item.endereco) ||
      asString(item.location) ||
      undefined,
    endereco: normalizedAddress,
    recurrence_desc: asString(item.recurrence_desc),
    recurrence_json: asString(item.recurrence_json),
    student_count: asNumber(item.student_count),
    lessons_total: asNumber(item.lessons_total),
    lessons_completed: asNumber(item.lessons_completed),
    created_at: asString(item.created_at),
    updated_at: asString(item.updated_at) || undefined,
    deleted_at: asString(item.deleted_at) || null,
    generated_lessons_count: asNumber(item.generated_lessons_count) || undefined,
  };
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
  const res = await api.get("/classes");
  const data = Array.isArray(res.data) ? res.data : [];
  return data.map((item) => normalizeClass((item ?? {}) as RawClass));
}

export async function createClass(payload: ClassPayload): Promise<Class> {
  const res = await api.post<Class>("/classes", payload);
  return normalizeClass((res.data ?? {}) as RawClass);
}

export async function createPrivateClassFromStudent(payload: PrivateClassPayload): Promise<Class> {
  const res = await api.post<Class>("/classes/private", payload);
  return normalizeClass((res.data ?? {}) as RawClass);
}

export async function updateClass(id: number, payload: ClassPayload): Promise<Class> {
  const res = await api.put<Class>(`/classes/${id}`, payload);
  return normalizeClass((res.data ?? {}) as RawClass);
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
