import { api } from "./api";
import type { CustomerAddress } from "./customers";
import type { Class, ClassPayload } from "./classes";

export type ContractTypeOption = {
  id: number;
  nome_tipo: string;
};

export type ContractStatusOption = {
  id: number;
  nome_status: string;
};

export type ContractRow = {
  id: number;
  code: string;
  student_id: number;
  student_name: string;
  responsible_customer_id: number;
  responsible_name: string;
  representative_customer_id: number;
  representative_name: string;
  contract_type_id: number;
  contract_type_name: string;
  status_id: number;
  status_name: string;
  effective_status_id: number;
  effective_status_name: string;
  class_id?: number;
  value: number;
  final_value: number;
  discount_percentage: number;
  lessons_count?: number;
  installments?: number;
  installments_description?: string;
  periodicity?: string;
  lesson_duration?: string;
  contract_duration?: string;
  start_date?: string;
  due_date?: string;
  first_lesson_date?: string;
  representative_email?: string;
  representative_cpf?: string;
  representative_phone?: string;
  representative_rg?: string;
  representative_civil_status?: string;
  created_at?: string;
  updated_at?: string;
};

export type ContractCustomerPayload = {
  nome: string;
  cpf: string;
  rg: string;
  email: string;
  telefone: string;
  enderecos: CustomerAddress[];
};

export type ContractStudentPayload = {
  nome: string;
  nascimento?: string;
};

export type ContractPayload = {
  id_cliente_responsavel?: number;
  id_cliente_representante?: number;
  id_aluno?: number;
  id_tipo_contrato: number;
  id_status?: number;
  valor: number;
  desconto_porcentagem?: number;
  valor_final: number;
  parcelas?: number;
  parcelas_descricao?: string;
  numero_aulas?: number;
  periodicidade?: string;
  tempo_aula?: string;
  tempo_contrato?: string;
  inicio_contrato?: string;
  vencimento_contrato?: string;
  primeira_aula?: string;
  email_representante?: string;
  cpf_representante?: string;
  rg?: string;
  telefone_representante?: string;
  est_civil_representante?: string;
  responsavel?: ContractCustomerPayload;
  aluno?: ContractStudentPayload;
};

type RawRecord = Record<string, unknown>;

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

function buildContractCode(id: number) {
  return `C${String(id).padStart(3, "0")}`;
}

export function normalizeContract(item: RawRecord): ContractRow {
  const id = asNumber(item.id);

  return {
    id,
    code: buildContractCode(id),
    student_id: asNumber(item.id_aluno),
    student_name: asString(item.student_name),
    responsible_customer_id: asNumber(item.id_cliente_responsavel),
    responsible_name: asString(item.responsible_name),
    representative_customer_id: asNumber(item.id_cliente_representante),
    representative_name: asString(item.representative_name),
    contract_type_id: asNumber(item.id_tipo_contrato),
    contract_type_name: asString(item.contract_type_name),
    status_id: asNumber(item.id_status),
    status_name: asString(item.status_name),
    effective_status_id: asNumber(item.effective_status_id),
    effective_status_name: asString(item.effective_status_name),
    class_id: asNumber(item.id_turma) || undefined,
    value: asNumber(item.valor),
    final_value: asNumber(item.valor_final),
    discount_percentage: asNumber(item.desconto_porcentagem),
    lessons_count: asNumber(item.numero_aulas) || undefined,
    installments: asNumber(item.parcelas) || undefined,
    installments_description: asString(item.parcelas_descricao) || undefined,
    periodicity: asString(item.periodicidade) || undefined,
    lesson_duration: asString(item.tempo_aula) || undefined,
    contract_duration: asString(item.tempo_contrato) || undefined,
    start_date: asString(item.inicio_contrato) || undefined,
    due_date: asString(item.vencimento_contrato) || undefined,
    first_lesson_date: asString(item.primeira_aula) || undefined,
    representative_email: asString(item.email_representante) || undefined,
    representative_cpf: asString(item.cpf_representante) || undefined,
    representative_phone: asString(item.telefone_representante) || undefined,
    representative_rg: asString(item.rg) || undefined,
    representative_civil_status: asString(item.est_civil_representante) || undefined,
    created_at: asString(item.created_at) || undefined,
    updated_at: asString(item.updated_at) || undefined,
  };
}

export async function fetchContracts(search?: string) {
  const response = await api.get("/contracts", {
    params: search ? { q: search } : undefined,
  });
  const data = Array.isArray(response.data) ? response.data : [];
  return data.map((item) => normalizeContract(item as RawRecord));
}

export async function fetchContract(contractID: number) {
  const response = await api.get(`/contracts/${contractID}`);
  return normalizeContract((response.data ?? {}) as RawRecord);
}

export async function fetchContractTypes() {
  const response = await api.get("/contracts/types");
  const data = Array.isArray(response.data) ? response.data : [];
  return data.map((item) => ({
    id: asNumber((item as RawRecord).id),
    nome_tipo: asString((item as RawRecord).nome_tipo),
  }));
}

export async function fetchContractStatuses() {
  const response = await api.get("/contracts/statuses");
  const data = Array.isArray(response.data) ? response.data : [];
  return data.map((item) => ({
    id: asNumber((item as RawRecord).id),
    nome_status: asString((item as RawRecord).nome_status),
  }));
}

export async function createContract(payload: ContractPayload) {
  const response = await api.post("/contracts", payload);
  return normalizeContract((response.data ?? {}) as RawRecord);
}

export async function updateContract(contractID: number, payload: ContractPayload) {
  const response = await api.put(`/contracts/${contractID}`, payload);
  return normalizeContract((response.data ?? {}) as RawRecord);
}

export async function createClassFromContract(contractID: number, payload: ClassPayload) {
  const response = await api.post(`/contracts/${contractID}/class`, payload);
  const data = (response.data ?? {}) as RawRecord;
  return {
    contract_id: asNumber(data.contract_id),
    class_id: asNumber(data.class_id),
    generated_lessons_count: asNumber(data.generated_lessons_count),
    class: (data.class ?? null) as Class | null,
  };
}
