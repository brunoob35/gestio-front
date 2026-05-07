import { api } from "./api";
import { normalizeStudent, type StudentRow } from "./students";

export type CustomerAddress = {
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

export type CustomerRow = {
  id: number;
  code: string;
  nome: string;
  cpf: string;
  rg: string;
  email: string;
  telefone: string;
  status: "ativo" | "inativo";
  studentsCount: number;
  contractsCount: number;
  addresses: CustomerAddress[];
  created_at?: string;
  updated_at?: string;
  students?: StudentRow[];
};

export type CustomerStudentPayload = {
  id?: number;
  nome: string;
  nascimento?: string;
};

export type CustomerPayload = {
  nome: string;
  cpf: string;
  email?: string;
  telefone: string;
  rg?: string;
  nascimento?: string;
  enderecos?: CustomerAddress[];
  ativo?: boolean;
  students?: CustomerStudentPayload[];
};

type RawCustomer = Record<string, unknown>;

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

function buildCustomerCode(id: number) {
  return `CL${String(id).padStart(3, "0")}`;
}

function normalizeAddress(item: Record<string, unknown>): CustomerAddress {
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

export function normalizeCustomer(item: RawCustomer): CustomerRow {
  const id = asNumber(item.id) || asNumber(item.ID);
  const rawStudents = Array.isArray(item.students) ? item.students : [];
  const rawAddresses = Array.isArray(item.enderecos) ? item.enderecos : [];

  return {
    id,
    code: buildCustomerCode(id),
    nome: asString(item.nome) || asString(item.name),
    cpf: asString(item.cpf),
    rg: asString(item.rg),
    email: asString(item.email),
    telefone: asString(item.telefone) || asString(item.phone),
    status: asBoolean(item.ativo) || asString(item.status) === "ativo" ? "ativo" : "inativo",
    studentsCount: asNumber(item.students_count) || rawStudents.length,
    contractsCount: asNumber(item.contracts_count),
    addresses: rawAddresses.map((address) => normalizeAddress(address as Record<string, unknown>)),
    created_at: asString(item.created_at) || undefined,
    updated_at: asString(item.updated_at) || undefined,
    students: rawStudents.map((student) => normalizeStudent(student as Record<string, unknown>)),
  };
}

export async function fetchCustomers(search?: string) {
  const response = await api.get("/customers", {
    params: search ? { q: search } : undefined,
  });
  const data = Array.isArray(response.data) ? response.data : [];
  return data.map((item) => normalizeCustomer(item as RawCustomer));
}

export async function fetchCustomer(customerID: number) {
  const response = await api.get(`/customers/${customerID}`);
  return normalizeCustomer((response.data ?? {}) as RawCustomer);
}

export async function fetchCustomerStudents(customerID: number) {
  const response = await api.get(`/customers/${customerID}/students`);
  const data = Array.isArray(response.data) ? response.data : [];
  return data.map((item) => normalizeStudent(item as Record<string, unknown>));
}

export async function fetchCustomerAddresses(customerID: number) {
  const response = await api.get(`/customers/${customerID}/addresses`);
  const data = Array.isArray(response.data) ? response.data : [];
  return data.map((item) => normalizeAddress(item as Record<string, unknown>));
}

export async function createCustomer(payload: CustomerPayload) {
  const response = await api.post("/customers", payload);
  return normalizeCustomer((response.data ?? {}) as RawCustomer);
}

export async function updateCustomer(customerID: number, payload: CustomerPayload) {
  const response = await api.put(`/customers/${customerID}`, payload);
  return normalizeCustomer((response.data ?? {}) as RawCustomer);
}

export async function deleteCustomer(customerID: number) {
  await api.delete(`/customers/${customerID}`);
}
