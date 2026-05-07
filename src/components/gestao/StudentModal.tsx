import { useEffect, useState } from "react";
import "./StudentModal.css";

export type StudentFormValues = {
  nome: string;
  nascimento: string;
};

type StudentModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialValues?: Partial<StudentFormValues>;
  onClose: () => void;
  onSubmit: (values: StudentFormValues) => Promise<void>;
};

const initialForm: StudentFormValues = {
  nome: "",
  nascimento: "",
};

const steps = ["Dados Pessoais", "Responsável", "Documentos"] as const;

export default function StudentModal({
  open,
  mode,
  initialValues,
  onClose,
  onSubmit,
}: StudentModalProps) {
  const [form, setForm] = useState<StudentFormValues>(initialForm);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      nome: initialValues?.nome ?? "",
      nascimento: initialValues?.nascimento ?? "",
    });
    setStep(0);
  }, [initialValues, open]);

  if (!open) return null;

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
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
          <button type="button" onClick={onClose} aria-label="Fechar modal">
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

        <form className="student-modal__form" onSubmit={handleSubmit}>
          {step === 0 ? (
            <div className="student-modal__grid">
              <label>
                <span>Nome Completo *</span>
                <input
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                <span>CPF opcional</span>
                <input value="" placeholder="Campo preparado para futura integracao" disabled />
              </label>

              <label>
                <span>Email</span>
                <input value="" placeholder="Campo preparado para futura integracao" disabled />
              </label>

              <label>
                <span>Telefone</span>
                <input value="" placeholder="Campo preparado para futura integracao" disabled />
              </label>

              <label className="student-modal__full">
                <span>Endereco</span>
                <input value="" placeholder="Campo preparado para futura integracao" disabled />
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
            <div className="student-modal__placeholder">
              <h3>Responsável</h3>
              <p>Espaco preparado para integracao futura com clientes e contratos.</p>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="student-modal__placeholder">
              <h3>Documentos</h3>
              <p>Espaco preparado para integracao futura de documentos e auditoria.</p>
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
