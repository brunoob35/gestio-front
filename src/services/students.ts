import { api } from "./api";
import type { Class } from "./classes";

export type StudentRow = {
  id: number;
  code: string;
  nome: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  responsavel?: string;
  responsavelTelefone?: string;
  classesCount?: number;
  status: "ativo" | "inativo";
  created_at?: string;
  updated_at?: string;
  nascimento?: string;
};

export type StudentPayload = {
  nome: string;
  nascimento?: string;
};

type RawStudent = Record<string, unknown>;

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

function buildStudentCode(id: number) {
  return `A${String(id).padStart(3, "0")}`;
}

export function normalizeStudent(item: RawStudent): StudentRow {
  const id = asNumber(item.id) || asNumber(item.ID);
  const nome = asString(item.nome) || asString(item.Nome);
  const nascimento =
    asString(item.nascimento) ||
    asString(item.birth_date) ||
    asString(item.Nascimento);

  const createdAt =
    asString(item.created_at) ||
    asString(item.CreatedAt);

  const ativo =
    item.ativo === true ||
    item.active === true ||
    item.Ativo === true;

  return {
    id,
    code: buildStudentCode(id),
    nome,
    cpf: "",
    email: "",
    telefone: "",
    responsavel: asString(item.responsavel),
    responsavelTelefone: asString(item.responsavel_telefone),
    classesCount: asNumber(item.classes_count),
    status: ativo ? "ativo" : "inativo",
    created_at: createdAt,
    updated_at: asString(item.updated_at),
    nascimento,
  };
}

export async function fetchStudents(nome?: string) {
  const response = await api.get("/students", {
    params: nome ? { nome } : undefined,
  });
  const data = Array.isArray(response.data) ? response.data : [];
  return data.map(normalizeStudent);
}

export async function createStudent(payload: StudentPayload) {
  const response = await api.post("/students", payload);
  return normalizeStudent(response.data ?? {});
}

export async function updateStudent(studentID: number, payload: StudentPayload) {
  const response = await api.put(`/students/${studentID}`, payload);
  return normalizeStudent(response.data ?? {});
}

export async function deleteStudent(studentID: number) {
  await api.delete(`/students/${studentID}`);
}

export async function fetchStudentClasses(studentID: number): Promise<Class[]> {
  const response = await api.get<Class[]>(`/students/${studentID}/classes`);
  return response.data;
}
