import { useEffect, useState } from "react";
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
  onClose,
  onSubmit,
}: ProfessorModalProps) {
  const [form, setForm] = useState<ProfessorFormValues>(initialForm);
  const [loading, setLoading] = useState(false);

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
  }, [open, initialValues]);

  if (!open) return null;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
          <h2>{mode === "create" ? "Novo Professor" : "Editar Professor"}</h2>

          <button type="button" onClick={onClose} aria-label="Fechar modal">
            ×
          </button>
        </div>

        <form className="professor-modal__form" onSubmit={handleSubmit}>
          <div className="professor-modal__grid">
            <label>
              <span>Nome</span>
              <input
                name="nome"
                value={form.nome}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              <span>E-mail</span>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              <span>Telefone</span>
              <input
                name="telefone"
                value={form.telefone}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              <span>CPF</span>
              <input
                name="cpf"
                value={form.cpf}
                onChange={handleChange}
                required={mode === "create"}
              />
            </label>

            <label>
              <span>RG</span>
              <input
                name="rg"
                value={form.rg}
                onChange={handleChange}
                required={mode === "create"}
              />
            </label>

            <label>
              <span>Data de nascimento</span>
              <input
                name="nascimento"
                type="date"
                value={form.nascimento}
                onChange={handleChange}
                required={mode === "create"}
              />
            </label>

            <label className="professor-modal__full">
              <span>
                {mode === "create" ? "Senha" : "Nova senha (opcional)"}
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
                ? "Criar professor"
                : "Salvar alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}