import { useEffect, useState } from "react";
import { formatPhoneNumber } from "../../utils/phone";
import "./ProfessorModal.css";

export type ProfessorFormValues = {
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  cpf: string;
  rg: string;
  nascimento: string;
};

type ProfessorModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialValues?: Partial<ProfessorFormValues>;
  entityLabel?: string;
  onClose: () => void;
  onSubmit: (values: ProfessorFormValues) => Promise<void>;
};

const initialForm: ProfessorFormValues = {
  nome: "",
  email: "",
  telefone: "",
  senha: "",
  cpf: "",
  rg: "",
  nascimento: "",
};

export default function ProfessorModal({
  open,
  mode,
  initialValues,
  entityLabel = "Professor",
  onClose,
  onSubmit,
}: ProfessorModalProps) {
  const [form, setForm] = useState<ProfessorFormValues>(initialForm);
  const [loading, setLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;

    setForm({
      nome: initialValues?.nome ?? "",
      email: initialValues?.email ?? "",
      telefone: initialValues?.telefone ?? "",
      senha: "",
      cpf: initialValues?.cpf ?? "",
      rg: initialValues?.rg ?? "",
      nascimento: initialValues?.nascimento ?? "",
    });
    setSubmitAttempted(false);
  }, [open, initialValues]);

  if (!open) return null;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "telefone" ? formatPhoneNumber(value) : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);

    const missingRequiredField =
      !form.nome.trim() ||
      !form.email.trim() ||
      !form.telefone.trim() ||
      (mode === "create" &&
        (!form.cpf.trim() ||
          !form.rg.trim() ||
          !form.nascimento.trim() ||
          !form.senha.trim()));

    if (missingRequiredField) {
      return;
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
    <div className="professor-modal__backdrop" onClick={onClose}>
      <div
        className="professor-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="professor-modal__header">
          <h2>{mode === "create" ? `Novo ${entityLabel}` : `Editar ${entityLabel}`}</h2>

          <button type="button" onClick={onClose} aria-label="Fechar modal" title="Fechar modal">
            ×
          </button>
        </div>

        <form className="professor-modal__form" onSubmit={handleSubmit} noValidate>
          <div className="professor-modal__grid">
            <label className={submitAttempted && !form.nome.trim() ? "is-invalid" : ""}>
              <span>Nome *</span>
              <input
                name="nome"
                value={form.nome}
                onChange={handleChange}
                required
              />
            </label>

            <label className={submitAttempted && !form.email.trim() ? "is-invalid" : ""}>
              <span>E-mail *</span>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </label>

            <label className={submitAttempted && !form.telefone.trim() ? "is-invalid" : ""}>
              <span>Telefone *</span>
              <input
                name="telefone"
                value={form.telefone}
                onChange={handleChange}
                required
              />
            </label>

            <label className={submitAttempted && mode === "create" && !form.cpf.trim() ? "is-invalid" : ""}>
              <span>CPF {mode === "create" ? "*" : ""}</span>
              <input
                name="cpf"
                value={form.cpf}
                onChange={handleChange}
                required={mode === "create"}
              />
            </label>

            <label className={submitAttempted && mode === "create" && !form.rg.trim() ? "is-invalid" : ""}>
              <span>RG {mode === "create" ? "*" : ""}</span>
              <input
                name="rg"
                value={form.rg}
                onChange={handleChange}
                required={mode === "create"}
              />
            </label>

            <label className={submitAttempted && mode === "create" && !form.nascimento.trim() ? "is-invalid" : ""}>
              <span>Data de nascimento {mode === "create" ? "*" : ""}</span>
              <input
                name="nascimento"
                type="date"
                value={form.nascimento}
                onChange={handleChange}
                required={mode === "create"}
              />
            </label>

            <label className={`professor-modal__full ${submitAttempted && mode === "create" && !form.senha.trim() ? "is-invalid" : ""}`}>
              <span>
                {mode === "create" ? "Senha *" : "Nova senha (opcional)"}
              </span>
              <input
                name="senha"
                type="password"
                value={form.senha}
                onChange={handleChange}
                required={mode === "create"}
              />
            </label>
          </div>

          <div className="professor-modal__actions">
            <button
              type="button"
              className="professor-modal__button professor-modal__button--secondary"
              onClick={onClose}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="professor-modal__button professor-modal__button--primary"
              disabled={loading}
            >
              {loading
                ? "Salvando..."
                : mode === "create"
                ? `Criar ${entityLabel.toLowerCase()}`
                : "Salvar alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
