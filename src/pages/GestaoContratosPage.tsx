import { useEffect, useMemo, useState } from "react";
import GestaoShell from "../components/gestao/GestaoShell";
import ContractModal, {
  type ContractFormValues,
} from "../components/gestao/ContractModal";
import ClassModal, {
  type ClassFormValues,
} from "../components/gestao/ClassModal";
import { useGestaoData } from "../context/GestaoDataContext";
import {
  createClassFromContract,
  createContract,
  fetchContracts,
  fetchContractStatuses,
  fetchContractTypes,
  updateContract,
  type ContractRow,
  type ContractStatusOption,
  type ContractTypeOption,
} from "../services/contracts";
import type { CustomerRow } from "../services/customers";
import type { StudentRow } from "../services/students";
import { buildRecurrenceDescription, type ClassRecurrence } from "../utils/classRecurrence";
import eyeIcon from "../assets/icons/eye-show-svgrepo-com.svg";
import studentIcon from "../assets/icons/student-svgrepo-com.svg";
import contractIcon from "../assets/icons/file-alt-svgrepo-com.svg";
import "./GestaoContratosPage.css";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function formatDateTimeParts(value?: string) {
  if (!value) {
    return {
      date: "",
      time: "",
    };
  }

  const normalized = value.replace("Z", "");
  const date = normalized.slice(0, 10);
  const time = normalized.length >= 16 ? normalized.slice(11, 16) : "";

  return { date, time };
}

function buildStatusClassName(statusName?: string) {
  switch ((statusName ?? "").toLowerCase()) {
    case "ativo":
      return "is-active";
    case "pendente":
      return "is-pending";
    case "vencido":
      return "is-expired";
    case "prox. vencimento":
      return "is-warning";
    default:
      return "";
  }
}

function buildContractInitialValues(
  contract: ContractRow,
  customers: CustomerRow[],
  students: StudentRow[]
): ContractFormValues {
  const responsible = customers.find((item) => item.id === contract.responsible_customer_id);
  const student = students.find((item) => item.id === contract.student_id);

  return {
    id_tipo_contrato: contract.contract_type_id ? String(contract.contract_type_id) : "",
    id_status: contract.status_id ? String(contract.status_id) : "2",
    valor: contract.value ? contract.value.toFixed(2) : "",
    desconto_porcentagem: contract.discount_percentage
      ? String(contract.discount_percentage)
      : "0",
    valor_final: contract.final_value ? contract.final_value.toFixed(2) : "",
    parcelas: contract.installments ? String(contract.installments) : "",
    parcelas_descricao: contract.installments_description ?? "",
    numero_aulas: contract.lessons_count ? String(contract.lessons_count) : "",
    periodicidade: contract.periodicity ?? "",
    tempo_aula: contract.lesson_duration ?? "",
    tempo_contrato: contract.contract_duration ?? "",
    inicio_contrato: contract.start_date ? String(contract.start_date).slice(0, 10) : "",
    vencimento_contrato: contract.due_date ? String(contract.due_date).slice(0, 10) : "",
    primeira_aula: contract.first_lesson_date
      ? String(contract.first_lesson_date).replace("Z", "").slice(0, 16)
      : "",
    responsible_mode: "existing",
    responsible_customer_id: contract.responsible_customer_id
      ? String(contract.responsible_customer_id)
      : "",
    responsible_query: responsible ? `${responsible.nome} (${responsible.code})` : contract.responsible_name,
    responsible_nome: "",
    responsible_cpf: "",
    responsible_rg: "",
    responsible_email: "",
    responsible_telefone: "",
    responsible_cep: "",
    responsible_rua: "",
    responsible_numero: "",
    responsible_complemento: "",
    responsible_bairro: "",
    responsible_cidade: "",
    responsible_estado: "",
    responsible_pais: "Brasil",
    student_mode: "existing",
    student_id: contract.student_id ? String(contract.student_id) : "",
    student_query: student ? `${student.nome} (${student.code})` : contract.student_name,
    student_nome: "",
    student_nascimento: "",
  };
}

function buildContractPayload(values: ContractFormValues) {
  return {
    ...(values.responsible_mode === "existing"
      ? { id_cliente_responsavel: Number(values.responsible_customer_id) }
      : {
          responsavel: {
            nome: values.responsible_nome,
            cpf: values.responsible_cpf,
            rg: values.responsible_rg,
            email: values.responsible_email,
            telefone: values.responsible_telefone,
            enderecos: [
              {
                cep: values.responsible_cep,
                rua: values.responsible_rua,
                numero: values.responsible_numero,
                bairro: values.responsible_bairro,
                cidade: values.responsible_cidade,
                estado: values.responsible_estado,
                pais: values.responsible_pais || "Brasil",
                complemento: values.responsible_complemento,
              },
            ],
          },
        }),
    ...(values.student_mode === "existing"
      ? { id_aluno: Number(values.student_id) }
      : {
          aluno: {
            nome: values.student_nome,
            ...(values.student_nascimento
              ? { nascimento: `${values.student_nascimento}T00:00:00Z` }
              : {}),
          },
        }),
    id_tipo_contrato: Number(values.id_tipo_contrato),
    id_status: values.id_status ? Number(values.id_status) : undefined,
    valor: Number(values.valor),
    desconto_porcentagem: values.desconto_porcentagem
      ? Number(values.desconto_porcentagem)
      : 0,
    valor_final: Number(values.valor_final),
    ...(values.parcelas ? { parcelas: Number(values.parcelas) } : {}),
    ...(values.parcelas_descricao
      ? { parcelas_descricao: values.parcelas_descricao }
      : {}),
    ...(values.numero_aulas ? { numero_aulas: Number(values.numero_aulas) } : {}),
    ...(values.periodicidade ? { periodicidade: values.periodicidade } : {}),
    ...(values.tempo_aula ? { tempo_aula: values.tempo_aula } : {}),
    ...(values.tempo_contrato ? { tempo_contrato: values.tempo_contrato } : {}),
    ...(values.inicio_contrato
      ? { inicio_contrato: `${values.inicio_contrato}T00:00:00Z` }
      : {}),
    ...(values.vencimento_contrato
      ? { vencimento_contrato: `${values.vencimento_contrato}T00:00:00Z` }
      : {}),
    ...(values.primeira_aula ? { primeira_aula: `${values.primeira_aula}:00Z` } : {}),
  };
}

function buildClassInitialValues(contract: ContractRow): ClassFormValues {
  const { date, time } = formatDateTimeParts(contract.first_lesson_date);
  const recurrence: ClassRecurrence = {
    weekdays: [],
    lesson_count: contract.lessons_count ?? 1,
    start_date: date,
    start_time: time,
  };

  return {
    name: `Turma ${contract.student_name}`,
    teacher_id: "",
    recurrence_desc:
      recurrence.start_date && recurrence.start_time
        ? buildRecurrenceDescription(recurrence)
        : "",
    recurrence_json: JSON.stringify(recurrence),
  };
}

export default function GestaoContratosPage() {
  const {
    customers,
    students,
    allProfessors,
    loadCustomers,
    loadStudents,
    loadAllProfessors,
    loadClasses,
  } = useGestaoData();

  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [contractTypes, setContractTypes] = useState<ContractTypeOption[]>([]);
  const [contractStatuses, setContractStatuses] = useState<ContractStatusOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractRow | null>(null);
  const [classSourceContract, setClassSourceContract] = useState<ContractRow | null>(null);

  async function loadContractData() {
    const [contractsData, typesData, statusesData] = await Promise.all([
      fetchContracts(),
      fetchContractTypes(),
      fetchContractStatuses(),
    ]);

    setContracts(contractsData);
    setContractTypes(typesData);
    setContractStatuses(statusesData);
  }

  useEffect(() => {
    async function load() {
      try {
        await Promise.all([
          loadContractData(),
          loadCustomers(),
          loadStudents(),
          loadAllProfessors(),
        ]);
      } finally {
        setLoading(false);
      }
    }

    setLoading(true);
    void load();
  }, [loadAllProfessors, loadCustomers, loadStudents]);

  const filteredContracts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contracts;

    return contracts.filter((contract) => {
      return (
        contract.code.toLowerCase().includes(term) ||
        contract.student_name.toLowerCase().includes(term) ||
        contract.responsible_name.toLowerCase().includes(term) ||
        contract.contract_type_name.toLowerCase().includes(term)
      );
    });
  }, [contracts, search]);

  const summary = useMemo(() => {
    return filteredContracts.reduce(
      (accumulator, contract) => {
        const status = contract.effective_status_name.toLowerCase();
        if (status === "ativo") accumulator.active += 1;
        if (status === "pendente") accumulator.pending += 1;
        if (status === "vencido") accumulator.expired += 1;
        return accumulator;
      },
      { active: 0, pending: 0, expired: 0 }
    );
  }, [filteredContracts]);

  async function handleCreate(values: ContractFormValues) {
    const created = await createContract(buildContractPayload(values));
    setContracts((current) => [created, ...current.filter((item) => item.id !== created.id)]);
    setFeedback("Contrato cadastrado com sucesso.");
    await Promise.all([loadCustomers({ force: true }), loadStudents({ force: true })]);
  }

  async function handleEdit(values: ContractFormValues) {
    if (!editingContract) return;

    const updated = await updateContract(editingContract.id, buildContractPayload(values));
    setContracts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setFeedback("Contrato atualizado com sucesso.");
    setEditingContract(null);
    await Promise.all([loadCustomers({ force: true }), loadStudents({ force: true })]);
  }

  async function handleCreateClass(values: ClassFormValues) {
    if (!classSourceContract) return;

    const result = await createClassFromContract(classSourceContract.id, {
      name: values.name,
      teacher_id: values.teacher_id ? Number(values.teacher_id) : null,
      recurrence_desc: values.recurrence_desc,
      recurrence_json: values.recurrence_json,
    });

    await Promise.all([loadContractData(), loadClasses({ force: true })]);
    setClassSourceContract(null);
    setFeedback(
      result.generated_lessons_count
        ? `Turma criada a partir do contrato com ${result.generated_lessons_count} aulas geradas.`
        : "Turma criada a partir do contrato."
    );
  }

  return (
    <GestaoShell title="Contratos">
      <section className="gestao-contracts">
        {feedback ? (
          <div className="gestao-contracts__feedback">
            <span>{feedback}</span>
            <button type="button" onClick={() => setFeedback("")}>
              ×
            </button>
          </div>
        ) : null}

        <div className="gestao-contracts__header">
          <div>
            <h2>Gestão de Contratos</h2>
            <p>Gerencie contratos, renovações e vínculos com turmas VIP.</p>
          </div>

          <div className="gestao-contracts__header-actions">
            <button type="button" className="gestao-contracts__secondary-button" disabled>
              Renovar Contrato
            </button>
            <button type="button" className="gestao-contracts__primary-button" onClick={() => setCreateOpen(true)}>
              + Novo Contrato
            </button>
          </div>
        </div>

        <div className="gestao-contracts__search-card">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por aluno, responsável ou ID do contrato..."
          />
        </div>

        <div className="gestao-contracts__summary">
          <article className="gestao-contracts__summary-card">
            <div>
              <span>Contratos Ativos</span>
              <strong>{summary.active}</strong>
            </div>
            <div className="gestao-contracts__summary-icon is-active">
              <img src={contractIcon} alt="" aria-hidden="true" />
            </div>
          </article>
          <article className="gestao-contracts__summary-card">
            <div>
              <span>Contratos Pendentes</span>
              <strong>{summary.pending}</strong>
            </div>
            <div className="gestao-contracts__summary-icon is-pending">
              <img src={contractIcon} alt="" aria-hidden="true" />
            </div>
          </article>
          <article className="gestao-contracts__summary-card">
            <div>
              <span>Contratos Vencidos</span>
              <strong>{summary.expired}</strong>
            </div>
            <div className="gestao-contracts__summary-icon is-expired">
              <img src={contractIcon} alt="" aria-hidden="true" />
            </div>
          </article>
        </div>

        <section className="gestao-contracts__table-card">
          <div className="gestao-contracts__table-header">
            <h3>Contratos Cadastrados</h3>
          </div>

          {loading ? (
            <div className="gestao-contracts__empty">
              <p>Carregando contratos...</p>
            </div>
          ) : filteredContracts.length ? (
            <div className="gestao-contracts__table-wrapper">
              <table className="gestao-contracts__table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Aluno</th>
                    <th>Responsável</th>
                    <th>Tipo</th>
                    <th>Data Início</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                    <th>Aulas</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.map((contract) => (
                    <tr key={contract.id}>
                      <td>{contract.code}</td>
                      <td>{contract.student_name}</td>
                      <td>{contract.responsible_name}</td>
                      <td>{contract.contract_type_name}</td>
                      <td>{formatDate(contract.start_date)}</td>
                      <td>{formatDate(contract.due_date)}</td>
                      <td>{formatCurrency(contract.final_value || contract.value)}</td>
                      <td>{contract.lessons_count ?? "—"}</td>
                      <td>
                        <span
                          className={`gestao-contracts__status ${buildStatusClassName(
                            contract.effective_status_name
                          )}`}
                        >
                          {contract.effective_status_name}
                        </span>
                      </td>
                      <td>
                        <div className="gestao-contracts__actions">
                          <button
                            type="button"
                            className="gestao-contracts__icon-button"
                            onClick={() => setEditingContract(contract)}
                            title="Visualizar / editar contrato"
                          >
                            <img src={eyeIcon} alt="" aria-hidden="true" />
                          </button>

                          <button
                            type="button"
                            className="gestao-contracts__icon-button"
                            onClick={() => setClassSourceContract(contract)}
                            title={
                              contract.class_id
                                ? "Este contrato já possui uma turma vinculada"
                                : "Criar turma a partir do contrato"
                            }
                            disabled={Boolean(contract.class_id)}
                          >
                            <img src={studentIcon} alt="" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="gestao-contracts__empty">
              <p>Nenhum contrato encontrado para os filtros atuais.</p>
            </div>
          )}
        </section>
      </section>

      <ContractModal
        open={createOpen}
        mode="create"
        customers={customers}
        students={students}
        contractTypes={contractTypes}
        contractStatuses={contractStatuses}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <ContractModal
        open={Boolean(editingContract)}
        mode="edit"
        customers={customers}
        students={students}
        contractTypes={contractTypes}
        contractStatuses={contractStatuses}
        initialValues={
          editingContract
            ? buildContractInitialValues(editingContract, customers, students)
            : undefined
        }
        onClose={() => setEditingContract(null)}
        onSubmit={handleEdit}
      />

      <ClassModal
        open={Boolean(classSourceContract)}
        mode="create"
        professors={allProfessors}
        initialValues={classSourceContract ? buildClassInitialValues(classSourceContract) : undefined}
        onClose={() => setClassSourceContract(null)}
        onSubmit={handleCreateClass}
      />
    </GestaoShell>
  );
}
