import { useEffect, useMemo, useState } from "react";
import type { CustomerRow } from "../../services/customers";
import "./StudentModal.css";

export type StudentFormValues = {
  nome: string;
  nascimento: string;
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
};

type StudentModalProps = {
  open: boolean;
  mode: "create" | "edit";
  availableCustomers: CustomerRow[];
  initialValues?: Partial<StudentFormValues>;
  onClose: () => void;
  onSubmit: (values: StudentFormValues) => Promise<void>;
};

const initialForm: StudentFormValues = {
  nome: "",
  nascimento: "",
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
};

const steps = ["Dados Pessoais", "Responsável"] as const;

function customerOptionValue(customer: CustomerRow) {
  return `${customer.nome} (${customer.code})`;
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

export default function StudentModal({
  open,
  mode,
  availableCustomers,
  initialValues,
  onClose,
  onSubmit,
}: StudentModalProps) {
  const [form, setForm] = useState<StudentFormValues>(initialForm);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      nome: initialValues?.nome ?? "",
      nascimento: initialValues?.nascimento ?? "",
      responsible_mode: initialValues?.responsible_mode ?? "existing",
      responsible_customer_id: initialValues?.responsible_customer_id ?? "",
      responsible_query: initialValues?.responsible_query ?? "",
      responsible_nome: initialValues?.responsible_nome ?? "",
      responsible_cpf: initialValues?.responsible_cpf ?? "",
      responsible_rg: initialValues?.responsible_rg ?? "",
      responsible_email: initialValues?.responsible_email ?? "",
      responsible_telefone: initialValues?.responsible_telefone ?? "",
      responsible_cep: initialValues?.responsible_cep ?? "",
      responsible_rua: initialValues?.responsible_rua ?? "",
      responsible_numero: initialValues?.responsible_numero ?? "",
      responsible_complemento: initialValues?.responsible_complemento ?? "",
      responsible_bairro: initialValues?.responsible_bairro ?? "",
      responsible_cidade: initialValues?.responsible_cidade ?? "",
      responsible_estado: initialValues?.responsible_estado ?? "",
      responsible_pais: initialValues?.responsible_pais ?? "Brasil",
    });
    setStep(0);
    setSubmitAttempted(false);
  }, [initialValues, open]);

  const activeCustomers = useMemo(
    () =>
      [...availableCustomers]
        .filter((customer) => customer.status === "ativo")
        .sort((left, right) => left.nome.localeCompare(right.nome)),
    [availableCustomers]
  );

  if (!open) return null;

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function updateField<Key extends keyof StudentFormValues>(field: Key, value: StudentFormValues[Key]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function switchResponsibleMode(nextMode: "existing" | "new") {
    setForm((current) => ({
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

  function handleResponsibleQueryChange(query: string) {
    const matched = activeCustomers.find((customer) => customerOptionValue(customer) === query);

    setForm((current) => ({
      ...current,
      responsible_query: query,
      responsible_customer_id: matched ? String(matched.id) : "",
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitAttempted(true);

    if (!form.nome.trim()) {
      setStep(0);
      return;
    }

    if (form.responsible_mode === "existing" && form.responsible_query.trim() && !form.responsible_customer_id) {
      setStep(1);
      return;
    }

    if (form.responsible_mode === "new") {
      const missingResponsibleField =
        !form.responsible_nome.trim() ||
        !form.responsible_cpf.trim() ||
        !form.responsible_telefone.trim() ||
        !form.responsible_cep.trim() ||
        !form.responsible_rua.trim() ||
        !form.responsible_numero.trim() ||
        !form.responsible_bairro.trim() ||
        !form.responsible_cidade.trim() ||
        !form.responsible_estado.trim();

      if (missingResponsibleField) {
        setStep(1);
        return;
      }
    }

    setLoading(true);

    try {
      await onSubmit(form);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="student-modal__backdrop" onClick={onClose}>
      <div className="student-modal" onClick={(event) => event.stopPropagation()}>
        <div className="student-modal__header">
          <h2>{mode === "create" ? "Cadastrar Novo Aluno" : "Editar Aluno"}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar modal" title="Fechar modal">
            ×
          </button>
        </div>

        <div className="student-modal__tabs">
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              className={step === index ? "is-active" : ""}
              onClick={() => setStep(index)}
            >
              {label}
            </button>
          ))}
        </div>

        <form className="student-modal__form" onSubmit={handleSubmit} noValidate>
          {step === 0 ? (
            <div className="student-modal__grid">
              <label className={submitAttempted && !form.nome.trim() ? "is-invalid" : ""}>
                <span>Nome Completo *</span>
                <input
                  type="text"
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                <span>Data de nascimento</span>
                <input
                  name="nascimento"
                  type="date"
                  value={form.nascimento}
                  onChange={handleChange}
                />
              </label>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="student-modal__section">
              <div className="student-modal__mode-switch">
                <button
                  type="button"
                  className={form.responsible_mode === "existing" ? "is-active" : ""}
                  onClick={() => switchResponsibleMode("existing")}
                >
                  Selecionar existente
                </button>
                <button
                  type="button"
                  className={form.responsible_mode === "new" ? "is-active" : ""}
                  onClick={() => switchResponsibleMode("new")}
                >
                  Criar novo
                </button>
              </div>

              {form.responsible_mode === "existing" ? (
                <div className="student-modal__grid">
                  <label className="student-modal__full">
                    <span>Responsável existente</span>
                    <input
                      type="text"
                      list="student-modal-customers"
                      value={form.responsible_query}
                      onChange={(event) => handleResponsibleQueryChange(event.target.value)}
                      placeholder="Digite para buscar um cliente já cadastrado"
                      className={submitAttempted && form.responsible_query.trim() && !form.responsible_customer_id ? "is-invalid" : ""}
                    />
                  </label>
                </div>
              ) : (
                <div className="student-modal__grid">
                  <label>
                    <span>Nome do responsável *</span>
                    <input
                      type="text"
                      value={form.responsible_nome}
                      onChange={(event) => updateField("responsible_nome", event.target.value)}
                    />
                  </label>

                  <label>
                    <span>CPF *</span>
                    <input
                      type="text"
                      value={form.responsible_cpf}
                      onChange={(event) => updateField("responsible_cpf", formatCpf(event.target.value))}
                      placeholder="000.000.000-00"
                    />
                  </label>

                  <label>
                    <span>RG</span>
                    <input
                      type="text"
                      value={form.responsible_rg}
                      onChange={(event) => updateField("responsible_rg", event.target.value)}
                    />
                  </label>

                  <label>
                    <span>Email</span>
                    <input
                      type="email"
                      value={form.responsible_email}
                      onChange={(event) => updateField("responsible_email", event.target.value)}
                    />
                  </label>

                  <label>
                    <span>Telefone *</span>
                    <input
                      type="text"
                      value={form.responsible_telefone}
                      onChange={(event) => updateField("responsible_telefone", formatPhone(event.target.value))}
                      placeholder="(00) 00000-0000"
                    />
                  </label>

                  <label>
                    <span>CEP *</span>
                    <input
                      type="text"
                      value={form.responsible_cep}
                      onChange={(event) => updateField("responsible_cep", formatCep(event.target.value))}
                      placeholder="00000-000"
                    />
                  </label>

                  <label className="student-modal__full">
                    <span>Rua / Logradouro *</span>
                    <input
                      type="text"
                      value={form.responsible_rua}
                      onChange={(event) => updateField("responsible_rua", event.target.value)}
                    />
                  </label>

                  <label>
                    <span>Número *</span>
                    <input
                      type="text"
                      value={form.responsible_numero}
                      onChange={(event) => updateField("responsible_numero", event.target.value)}
                    />
                  </label>

                  <label>
                    <span>Complemento</span>
                    <input
                      type="text"
                      value={form.responsible_complemento}
                      onChange={(event) => updateField("responsible_complemento", event.target.value)}
                    />
                  </label>

                  <label>
                    <span>Bairro *</span>
                    <input
                      type="text"
                      value={form.responsible_bairro}
                      onChange={(event) => updateField("responsible_bairro", event.target.value)}
                    />
                  </label>

                  <label>
                    <span>Cidade *</span>
                    <input
                      type="text"
                      value={form.responsible_cidade}
                      onChange={(event) => updateField("responsible_cidade", event.target.value)}
                    />
                  </label>

                  <label>
                    <span>Estado *</span>
                    <input
                      type="text"
                      value={form.responsible_estado}
                      onChange={(event) => updateField("responsible_estado", event.target.value)}
                    />
                  </label>

                  <label>
                    <span>País</span>
                    <input
                      type="text"
                      value={form.responsible_pais}
                      onChange={(event) => updateField("responsible_pais", event.target.value)}
                    />
                  </label>
                </div>
              )}

              <datalist id="student-modal-customers">
                {activeCustomers.map((customer) => (
                  <option key={customer.id} value={customerOptionValue(customer)} />
                ))}
              </datalist>
            </div>
          ) : null}

          <div className="student-modal__actions">
            <button
              type="button"
              className="student-modal__button student-modal__button--secondary"
              onClick={onClose}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="student-modal__button student-modal__button--primary"
              disabled={loading}
            >
              {loading
                ? "Salvando..."
                : mode === "create"
                ? "Cadastrar Aluno"
                : "Salvar Alteracoes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
