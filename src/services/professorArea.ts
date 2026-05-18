import { formatPhoneNumber } from "../utils/phone";
import { api } from "./api";
import { normalizeClass, type Class } from "./classes";
import { normalizeLesson, type Lesson } from "./lessons";
import type { ProfessorRow } from "./professors";

type RawRecord = Record<string, unknown>;

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

export async function fetchCurrentProfessor(): Promise<ProfessorRow> {
  const response = await api.get("/professor/me");
  const item = (response.data ?? {}) as RawRecord;
  const id = asNumber(item.id);

  return {
    id,
    code: `P${String(id).padStart(3, "0")}`,
    nome: asString(item.nome),
    email: asString(item.email),
    telefone: formatPhoneNumber(asString(item.telefone)),
    cpf: asString(item.cpf) || undefined,
    rg: asString(item.rg) || undefined,
    nascimento: asString(item.nascimento) || undefined,
    turmasAtivas: 0,
    status: asBoolean(item.ativo) ? "ativo" : "inativo",
  };
}

export async function fetchCurrentProfessorClasses(): Promise<Class[]> {
  const response = await api.get("/professor/classes");
  const data = Array.isArray(response.data) ? response.data : [];
  return data.map((item) => normalizeClass((item ?? {}) as RawRecord));
}

export async function fetchCurrentProfessorLessons(): Promise<Lesson[]> {
  const response = await api.get("/professor/lessons");
  const data = Array.isArray(response.data) ? response.data : [];
  return data.map((item) => normalizeLesson((item ?? {}) as RawRecord));
}

export type ProfessorStudentRow = {
  id: number;
  code: string;
  nome: string;
  class_id: number;
  class_name: string;
  lessons_completed: number;
  lessons_total: number;
  frequency_percentage: number;
  status: "ativo" | "inativo";
};

function normalizeProfessorStudent(item: RawRecord): ProfessorStudentRow {
  const id = asNumber(item.id);

  return {
    id,
    code: `A${String(id).padStart(3, "0")}`,
    nome: asString(item.nome),
    class_id: asNumber(item.class_id),
    class_name: asString(item.class_name),
    lessons_completed: asNumber(item.lessons_completed),
    lessons_total: asNumber(item.lessons_total),
    frequency_percentage: asNumber(item.frequency_percentage),
    status: asBoolean(item.ativo) ? "ativo" : "inativo",
  };
}

export async function fetchCurrentProfessorStudents(): Promise<ProfessorStudentRow[]> {
  const response = await api.get("/professor/students");
  const data = Array.isArray(response.data) ? response.data : [];
  return data.map((item) => normalizeProfessorStudent((item ?? {}) as RawRecord));
}
