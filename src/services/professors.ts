import { api } from "./api";

export type ProfessorRow = {
  id: number;
  code: string;
  nome: string;
  email: string;
  telefone: string;
  cpf?: string;
  rg?: string;
  nascimento?: string;
  turmasAtivas: number;
  status: string;
};

export type ProfessorPayload = {
  nome: string;
  email: string;
  telefone: string;
  senha?: string;
  cpf?: string;
  rg?: string;
  ativo?: boolean;
  nascimento?: string;
};

type RawProfessor = Record<string, unknown>;

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

function buildProfessorCode(id: number) {
  return `P${String(id).padStart(3, "0")}`;
}

function normalizeProfessor(item: RawProfessor): ProfessorRow {
  const id =
    asNumber(item.id) ||
    asNumber(item.ID) ||
    asNumber(item.user_id) ||
    asNumber(item.userID);

  const nome =
    asString(item.nome) ||
    asString(item.name) ||
    asString(item.Nome) ||
    asString(item.Name);

  const email =
    asString(item.email) ||
    asString(item.Email);

  const telefone =
    asString(item.telefone) ||
    asString(item.phone) ||
    asString(item.Phone) ||
    asString(item.Telefone);

  const cpf =
    asString(item.cpf) ||
    asString(item.CPF);

  const rg =
    asString(item.rg) ||
    asString(item.RG);

  const nascimento =
    asString(item.nascimento) ||
    asString(item.birth_date) ||
    asString(item.BirthDate);

  const statusRaw =
    asString(item.status) ||
    asString(item.Status) ||
    (item.active === true ? "ativo" : "") ||
    (item.is_active === true ? "ativo" : "");

  return {
    id,
    code: buildProfessorCode(id),
    nome,
    email,
    telefone,
    cpf,
    rg,
    nascimento,
    turmasAtivas: 0,
    status: statusRaw || "ativo",
  };
}

export async function fetchProfessors() {
  const response = await api.get("/professors");
  const data = Array.isArray(response.data) ? response.data : [];
  return data.map(normalizeProfessor);
}

export async function fetchProfessorClassesCount(professorIds: number[]) {
  if (!professorIds.length) return {};

  const response = await api.post("/professors/classes-count", {
    professor_ids: professorIds,
  });

  const raw = response.data;

  if (Array.isArray(raw)) {
    const counts: Record<number, number> = {};

    raw.forEach((item: Record<string, unknown>) => {
      const id =
        asNumber(item.professor_id) ||
        asNumber(item.id) ||
        asNumber(item.user_id);

      const count =
        asNumber(item.classes_count) ||
        asNumber(item.count) ||
        asNumber(item.total);

      if (id) counts[id] = count;
    });

    return counts;
  }

  if (raw && typeof raw === "object") {
    const counts: Record<number, number> = {};

    Object.entries(raw).forEach(([key, value]) => {
      counts[Number(key)] = asNumber(value);
    });

    return counts;
  }

  return {};
}

export async function createProfessor(payload: ProfessorPayload) {
  const response = await api.post("/users/professors", payload);
  return response.data;
}

export async function updateProfessor(userID: number, payload: ProfessorPayload) {
  const response = await api.put(`/users/${userID}`, payload);
  return response.data;
}

export async function deleteProfessor(userID: number) {
  const response = await api.delete(`/users/${userID}`);
  return response.data;
}