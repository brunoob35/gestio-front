import { useEffect, useMemo, useState } from "react";
import type { CustomerRow } from "../../services/customers";
import type { StudentRow } from "../../services/students";
import type { ContractStatusOption, ContractTypeOption } from "../../services/contracts";
import "./ContractModal.css";

type ContractModalProps = {
  open: boolean;
  mode: "create" | "edit";
  customers: CustomerRow[];
  students: StudentRow[];
  contractTypes: ContractTypeOption[];
  contractStatuses: ContractStatusOption[];
  initialValues?: ContractFormValues;
  onClose: () => void;
  onSubmit: (values: ContractFormValues) => Promise<void>;
};

export type ContractFormValues = {
  id_tipo_contrato: string;
  id_status: string;
  valor: string;
  desconto_porcentagem: string;
  valor_final: string;
  parcelas: string;
  parcelas_descricao: string;
  numero_aulas: string;
  periodicidade: string;
  tempo_aula: string;
  tempo_contrato: string;
  inicio_contrato: string;
  vencimento_contrato: string;
  primeira_aula: string;
  responsible_mode: "existing" | "new";
  responsible_customer_id: string;
  responsible_query: string;
  responsible_nome: string;
  responsible_cpf: string;
  responsible_rg: string;
  responsible_email: string;
  responsible_telefone: string;
  responsible_cep: string;
  responsible_rua: string;
  responsible_numero: string;
  responsible_complemento: string;
  responsible_bairro: string;
  responsible_cidade: string;
  responsible_estado: string;
  responsible_pais: string;
  student_mode: "existing" | "new";
  student_id: string;
  student_query: string;
  student_nome: string;
  student_nascimento: string;
};

const initialFormValues: ContractFormValues = {
  id_tipo_contrato: "",
  id_status: "2",
  valor: "",
  desconto_porcentagem: "0",
  valor_final: "",
  parcelas: "",
  parcelas_descricao: "",
  numero_aulas: "",
  periodicidade: "",
  tempo_aula: "",
  tempo_contrato: "",
  inicio_contrato: "",
  vencimento_contrato: "",
  primeira_aula: "",
  responsible_mode: "existing",
  responsible_customer_id: "",
  responsible_query: "",
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
  student_id: "",
  student_query: "",
  student_nome: "",
  student_nascimento: "",
};

function customerOptionValue(customer: CustomerRow) {
  return `${customer.nome} (${customer.code})`;
}

function studentOptionValue(student: StudentRow) {
  return `${student.nome} (${student.code})`;
}

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length <= 11) {
    const local = digits.slice(0, 11);
    if (local.length <= 2) return local ? `(${local}` : "";
    if (local.length <= 7) return `(${local.slice(0, 2)}) ${local.slice(2)}`;
    if (local.length <= 10) {
      return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
    }
    return `(${local.slice(0, 2)}) ${local.slice(2, 3)} ${local.slice(3, 7)}-${local.slice(7)}`;
  }

  const country = digits.slice(0, 2);
  const area = digits.slice(2, 4);
  const rest = digits.slice(4, 13);

  if (rest.length <= 4) return `+${country} (${area}) ${rest}`.trim();
  if (rest.length <= 8) return `+${country} (${area}) ${rest.slice(0, 4)}-${rest.slice(4)}`.trim();
  return `+${country} (${area}) ${rest.slice(0, 1)} ${rest.slice(1, 5)}-${rest.slice(5, 9)}`.trim();
}

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export default function ContractModal({
  open,
  mode,
  customers,
  students,
  contractTypes,
  contractStatuses,
  initialValues,
  onClose,
  onSubmit,
}: ContractModalProps) {
  const [activeTab, setActiveTab] = useState<"contract" | "responsible" | "student">("contract");
  const [values, setValues] = useState<ContractFormValues>(initialFormValues);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues(initialValues ?? initialFormValues);
    setActiveTab("contract");
  }, [initialValues, open]);

  const availableCustomers = useMemo(
    () => [...customers].sort((left, right) => left.nome.localeCompare(right.nome)),
    [customers]
  );

  const availableStudents = useMemo(
    () => [...students].sort((left, right) => left.nome.localeCompare(right.nome)),
    [students]
  );

  if (!open) return null;

  function updateField<Key extends keyof ContractFormValues>(
    field: Key,
    value: ContractFormValues[Key]
  ) {
    setValues((current) => {
      const next = { ...current, [field]: value };

      if (field === "valor" || field === "desconto_porcentagem") {
        const baseValue = Number(String(field === "valor" ? value : next.valor).replace(",", ".")) || 0;
        const discount = Number(
          String(field === "desconto_porcentagem" ? value : next.desconto_porcentagem).replace(",", ".")
        ) || 0;
        const finalValue = Math.max(baseValue * (1 - discount / 100), 0);
        next.valor_final = finalValue ? finalValue.toFixed(2) : "";
      }

      return next;
    });
  }

  function switchResponsibleMode(nextMode: "existing" | "new") {
    setValues((current) => ({
      ...current,
      responsible_mode: nextMode,
      responsible_customer_id: "",
      responsible_query: "",
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
    }));
  }

  function switchStudentMode(nextMode: "existing" | "new") {
    setValues((current) => ({
      ...current,
      student_mode: nextMode,
      student_id: "",
      student_query: "",
      student_nome: "",
      student_nascimento: "",
    }));
  }

  function handleResponsibleQueryChange(query: string) {
    const matched = availableCustomers.find((customer) => customerOptionValue(customer) === query);

    setValues((current) => ({
      ...current,
      responsible_query: query,
      responsible_customer_id: matched ? String(matched.id) : "",
    }));
  }

  function handleStudentQueryChange(query: string) {
    const matched = availableStudents.find((student) => studentOptionValue(student) === query);

    setValues((current) => ({
      ...current,
      student_query: query,
      student_id: matched ? String(matched.id) : "",
      student_nome: matched ? matched.nome : current.student_mode === "existing" ? "" : current.student_nome,
      student_nascimento:
        matched && matched.nascimento ? String(matched.nascimento).slice(0, 10) : current.student_mode === "existing" ? "" : current.student_nascimento,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!values.id_tipo_contrato || !values.valor || !values.valor_final) {
      setActiveTab("contract");
      window.alert("Preencha tipo, valor e valor final do contrato.");
      return;
    }

    if (values.responsible_mode === "existing" && !values.responsible_customer_id) {
      setActiveTab("responsible");
      window.alert("Selecione um responsável existente ou troque para criar um novo.");
      return;
    }

    if (values.responsible_mode === "new") {
      const missingResponsibleField =
        !values.responsible_nome.trim() ||
        !values.responsible_cpf.trim() ||
        !values.responsible_telefone.trim() ||
        !values.responsible_cep.trim() ||
        !values.responsible_rua.trim() ||
        !values.responsible_numero.trim() ||
        !values.responsible_bairro.trim() ||
        !values.responsible_cidade.trim() ||
        !values.responsible_estado.trim();

      if (missingResponsibleField) {
        setActiveTab("responsible");
        window.alert("Preencha os dados obrigatórios do responsável e ao menos um endereço completo.");
        return;
      }
    }

    if (values.student_mode === "existing" && !values.student_id) {
      setActiveTab("student");
      window.alert("Selecione um aluno existente ou troque para criar um novo.");
      return;
    }

    if (values.student_mode === "new" && !values.student_nome.trim()) {
      setActiveTab("student");
      window.alert("Informe o nome do aluno.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit(values);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="contract-modal__backdrop" onClick={onClose}>
      <div className="contract-modal" onClick={(event) => event.stopPropagation()}>
        <div className="contract-modal__header">
          <h2>{mode === "create" ? "Novo Contrato" : "Editar Contrato"}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar modal">
            ×
          </button>
        </div>

        <div className="contract-modal__tabs">
          <button
            type="button"
            className={activeTab === "contract" ? "is-active" : ""}
            onClick={() => setActiveTab("contract")}
          >
            Contrato
          </button>
          <button
            type="button"
            className={activeTab === "responsible" ? "is-active" : ""}
            onClick={() => setActiveTab("responsible")}
          >
            Responsável
          </button>
          <button
            type="button"
            className={activeTab === "student" ? "is-active" : ""}
            onClick={() => setActiveTab("student")}
          >
            Aluno
          </button>
        </div>

        <form className="contract-modal__form" onSubmit={handleSubmit}>
          {activeTab === "contract" ? (
            <div className="contract-modal__grid">
              <label>
                <span>Tipo de contrato *</span>
                <select
                  value={values.id_tipo_contrato}
                  onChange={(event) => updateField("id_tipo_contrato", event.target.value)}
                  required
                >
                  <option value="">Selecione</option>
                  {contractTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.nome_tipo}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Status</span>
                <select
                  value={values.id_status}
                  onChange={(event) => updateField("id_status", event.target.value)}
                >
                  {contractStatuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.nome_status}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Valor *</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.valor}
                  onChange={(event) => updateField("valor", event.target.value)}
                  required
                />
              </label>

              <label>
                <span>Desconto %</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.desconto_porcentagem}
                  onChange={(event) => updateField("desconto_porcentagem", event.target.value)}
                />
              </label>

              <label>
                <span>Valor final *</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.valor_final}
                  onChange={(event) => updateField("valor_final", event.target.value)}
                  required
                />
              </label>

              <label>
                <span>Número de aulas</span>
                <input
                  type="number"
                  min="0"
                  value={values.numero_aulas}
                  onChange={(event) => updateField("numero_aulas", event.target.value)}
                />
              </label>

              <label>
                <span>Parcelas</span>
                <input
                  type="number"
                  min="0"
                  value={values.parcelas}
                  onChange={(event) => updateField("parcelas", event.target.value)}
                />
              </label>

              <label>
                <span>Descrição das parcelas</span>
                <input
                  type="text"
                  value={values.parcelas_descricao}
                  onChange={(event) => updateField("parcelas_descricao", event.target.value)}
                  placeholder="Ex.: 12x no cartão"
                />
              </label>

              <label>
                <span>Periodicidade</span>
                <input
                  type="text"
                  value={values.periodicidade}
                  onChange={(event) => updateField("periodicidade", event.target.value)}
                  placeholder="Ex.: 2x por semana"
                />
              </label>

              <label>
                <span>Tempo de aula</span>
                <input
                  type="text"
                  value={values.tempo_aula}
                  onChange={(event) => updateField("tempo_aula", event.target.value)}
                  placeholder="Ex.: 50 min"
                />
              </label>

              <label>
                <span>Duração do contrato</span>
                <input
                  type="text"
                  value={values.tempo_contrato}
                  onChange={(event) => updateField("tempo_contrato", event.target.value)}
                  placeholder="Ex.: 12 meses"
                />
              </label>

              <label>
                <span>Início do contrato</span>
                <input
                  type="date"
                  value={values.inicio_contrato}
                  onChange={(event) => updateField("inicio_contrato", event.target.value)}
                />
              </label>

              <label>
                <span>Vencimento</span>
                <input
                  type="date"
                  value={values.vencimento_contrato}
                  onChange={(event) => updateField("vencimento_contrato", event.target.value)}
                />
              </label>

              <label className="contract-modal__full">
                <span>Primeira aula</span>
                <input
                  type="datetime-local"
                  value={values.primeira_aula}
                  onChange={(event) => updateField("primeira_aula", event.target.value)}
                />
              </label>
            </div>
          ) : activeTab === "responsible" ? (
            <div className="contract-modal__section">
              <div className="contract-modal__mode-switch">
                <button
                  type="button"
                  className={values.responsible_mode === "existing" ? "is-active" : ""}
                  onClick={() => switchResponsibleMode("existing")}
                >
                  Selecionar existente
                </button>
                <button
                  type="button"
                  className={values.responsible_mode === "new" ? "is-active" : ""}
                  onClick={() => switchResponsibleMode("new")}
                >
                  Criar novo
                </button>
              </div>

              {values.responsible_mode === "existing" ? (
                <div className="contract-modal__grid">
                  <label className="contract-modal__full">
                    <span>Responsável existente</span>
                    <input
                      type="text"
                      list="contract-modal-customers"
                      value={values.responsible_query}
                      onChange={(event) => handleResponsibleQueryChange(event.target.value)}
                      placeholder="Digite para buscar um cliente já cadastrado"
                    />
                  </label>
                </div>
              ) : (
                <div className="contract-modal__grid">
                  <label>
                    <span>Nome do responsável *</span>
                    <input
                      type="text"
                      value={values.responsible_nome}
                      onChange={(event) => updateField("responsible_nome", event.target.value)}
                    />
                  </label>

                  <label>
                    <span>CPF *</span>
                    <input
                      type="text"
                      value={values.responsible_cpf}
                      onChange={(event) => updateField("responsible_cpf", formatCpf(event.target.value))}
                      placeholder="000.000.000-00"
                    />
                  </label>

                  <label>
                    <span>RG</span>
                    <input
                      type="text"
                      value={values.responsible_rg}
                      onChange={(event) => updateField("responsible_rg", event.target.value)}
                    />
                  </label>

                  <label>
                    <span>Email</span>
                    <input
                      type="email"
                      value={values.responsible_email}
                      onChange={(event) => updateField("responsible_email", event.target.value)}
                    />
                  </label>

                  <label>
                    <span>Telefone *</span>
                    <input
                      type="text"
                      value={values.responsible_telefone}
                      onChange={(event) => updateField("responsible_telefone", formatPhone(event.target.value))}
                      placeholder="(00) 00000-0000"
                    />
                  </label>

                  <label>
                    <span>CEP *</span>
                    <input
                      type="text"
                      value={values.responsible_cep}
                      onChange={(event) => updateField("responsible_cep", formatCep(event.target.value))}
                      placeholder="00000-000"
                    />
                  </label>

                  <label className="contract-modal__full">
                    <span>Rua / Logradouro *</span>
                    <input
                      type="text"
                      value={values.responsible_rua}
                      onChange={(event) => updateField("responsible_rua", event.target.value)}
                    />
                  </label>

                  <label>
                    <span>Número *</span>
                    <input
                      type="text"
                      value={values.responsible_numero}
                      onChange={(event) => updateField("responsible_numero", event.target.value)}
                    />
                  </label>

                  <label>
                    <span>Complemento</span>
                    <input
                      type="text"
                      value={values.responsible_complemento}
                      onChange={(event) => updateField("responsible_complemento", event.target.value)}
                    />
                  </label>

                  <label>
                    <span>Bairro *</span>
                    <input
                      type="text"
                      value={values.responsible_bairro}
                      onChange={(event) => updateField("responsible_bairro", event.target.value)}
                    />
                  </label>

                  <label>
                    <span>Cidade *</span>
                    <input
                      type="text"
                      value={values.responsible_cidade}
                      onChange={(event) => updateField("responsible_cidade", event.target.value)}
                    />
                  </label>

                  <label>
                    <span>Estado *</span>
                    <input
                      type="text"
                      value={values.responsible_estado}
                      onChange={(event) => updateField("responsible_estado", event.target.value)}
                    />
                  </label>

                  <label>
                    <span>País</span>
                    <input
                      type="text"
                      value={values.responsible_pais}
                      onChange={(event) => updateField("responsible_pais", event.target.value)}
                    />
                  </label>
                </div>
              )}
            </div>
          ) : (
            <div className="contract-modal__section">
              <div className="contract-modal__mode-switch">
                <button
                  type="button"
                  className={values.student_mode === "existing" ? "is-active" : ""}
                  onClick={() => switchStudentMode("existing")}
                >
                  Selecionar existente
                </button>
                <button
                  type="button"
                  className={values.student_mode === "new" ? "is-active" : ""}
                  onClick={() => switchStudentMode("new")}
                >
                  Criar novo
                </button>
              </div>

              {values.student_mode === "existing" ? (
                <div className="contract-modal__grid">
                  <label className="contract-modal__full">
                    <span>Aluno existente</span>
                    <input
                      type="text"
                      list="contract-modal-students"
                      value={values.student_query}
                      onChange={(event) => handleStudentQueryChange(event.target.value)}
                      placeholder="Digite para buscar um aluno já cadastrado"
                    />
                  </label>
                </div>
              ) : (
                <div className="contract-modal__grid">
                  <label>
                    <span>Nome do aluno *</span>
                    <input
                      type="text"
                      value={values.student_nome}
                      onChange={(event) => updateField("student_nome", event.target.value)}
                    />
                  </label>

                  <label>
                    <span>Data de nascimento</span>
                    <input
                      type="date"
                      value={values.student_nascimento}
                      onChange={(event) => updateField("student_nascimento", event.target.value)}
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="contract-modal__actions">
            <button
              type="button"
              className="contract-modal__button contract-modal__button--secondary"
              onClick={onClose}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="contract-modal__button contract-modal__button--primary"
              disabled={loading}
            >
              {loading ? "Salvando..." : mode === "create" ? "Cadastrar Contrato" : "Salvar Contrato"}
            </button>
          </div>
        </form>

        <datalist id="contract-modal-customers">
          {availableCustomers.map((customer) => (
            <option key={customer.id} value={customerOptionValue(customer)} />
          ))}
        </datalist>

        <datalist id="contract-modal-students">
          {availableStudents.map((student) => (
            <option key={student.id} value={studentOptionValue(student)} />
          ))}
        </datalist>
      </div>
    </div>
  );
}
