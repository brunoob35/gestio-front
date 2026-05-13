import { api } from "./api";
import { formatPhoneNumber } from "../utils/phone";

export type UserRow = {
  id: number;
  code: string;
  nome: string;
  email: string;
  telefone: string;
  cpf?: string;
  rg?: string;
  nascimento?: string;
  status: string;
};

export type UserPayload = {
  nome: string;
  email: string;
  telefone: string;
  senha?: string;
  cpf?: string;
  rg?: string;
  ativo?: boolean;
  nascimento?: string;
};

type RawUser = Record<string, unknown>;

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

function buildUserCode(id: number) {
  return `U${String(id).padStart(3, "0")}`;
}

function normalizeUser(item: RawUser): UserRow {
  const id = asNumber(item.id) || asNumber(item.ID);
  const ativo = item.ativo === true || item.active === true || item.ativo === 1 || item.active === 1;

  return {
    id,
    code: buildUserCode(id),
    nome: asString(item.nome) || asString(item.name),
    email: asString(item.email),
    telefone: formatPhoneNumber(asString(item.telefone) || asString(item.phone)),
    cpf: asString(item.cpf),
    rg: asString(item.rg),
    nascimento: asString(item.nascimento) || asString(item.birth_date),
    status: ativo ? "ativo" : "inativo",
  };
}

export async function fetchUsers() {
  const response = await api.get("/users");
  const data = Array.isArray(response.data) ? response.data : [];
  return data.map(normalizeUser);
}

export async function createManager(payload: UserPayload) {
  const response = await api.post("/users/gestor", payload);
  return normalizeUser(response.data as RawUser);
}

export async function updateUser(userID: number, payload: UserPayload) {
  const response = await api.put(`/users/${userID}`, payload);
  return response.data;
}

export async function deleteUser(userID: number) {
  const response = await api.delete(`/users/${userID}`);
  return response.data;
}
