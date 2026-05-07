import { useEffect, useState } from "react";
import type { ProfessorRow } from "../../services/professors";
import {
  buildRecurrenceDescription,
  parseRecurrenceJson,
  type ClassRecurrence,
  weekdayOptions,
} from "../../utils/classRecurrence";
import "./ClassModal.css";

export type ClassFormValues = {
  name: string;
  teacher_id: string;
  recurrence_desc: string;
  recurrence_json: string;
};

type ClassModalProps = {
  open: boolean;
  mode: "create" | "edit";
  professors: ProfessorRow[];
  initialValues?: Partial<ClassFormValues>;
  onClose: () => void;
  onSubmit: (values: ClassFormValues) => Promise<void>;
};

const initialForm: ClassFormValues = {
  name: "",
  teacher_id: "",
  recurrence_desc: "",
  recurrence_json: "",
};

export default function ClassModal({
  open,
  mode,
  professors,
  initialValues,
  onClose,
  onSubmit,
}: ClassModalProps) {
  const [form, setForm] = useState<ClassFormValues>(initialForm);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({
      name: initialValues?.name ?? "",
      teacher_id: initialValues?.teacher_id ?? "",
      recurrence_desc: initialValues?.recurrence_desc ?? "",
      recurrence_json: initialValues?.recurrence_json ?? "",
    });
    setSubmitError("");
  }, [open, initialValues]);

  if (!open) return null;

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!form.recurrence_json.trim()) {
      setSubmitError("Configure a recorrencia da turma antes de salvar.");
      return;
    }

    if (!recurrence || !recurrence.weekdays.length) {
      setSubmitError("Selecione ao menos um dia da semana para a turma.");
      return;
    }

    if (!recurrence.start_date || !recurrence.start_time) {
      setSubmitError("Preencha o inicio da recorrencia e o horario da turma.");
      return;
    }

    if (recurrence.lesson_count <= 0) {
      setSubmitError("Informe um numero de aulas maior que zero.");
      return;
    }

    setLoading(true);
    setSubmitError("");

    try {
      await onSubmit(form);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  const recurrence = parseRecurrenceJson(form.recurrence_json);
  const recurrenceForm: ClassRecurrence = recurrence ?? {
    weekdays: [],
    lesson_count: 1,
    start_date: "",
    start_time: "",
  };

  function updateRecurrence(next: ClassRecurrence) {
    setForm((current) => ({
      ...current,
      recurrence_desc: buildRecurrenceDescription(next),
      recurrence_json: JSON.stringify(next),
    }));
    setSubmitError("");
  }

  function toggleWeekday(day: ClassRecurrence["weekdays"][number]) {
    const exists = recurrenceForm.weekdays.includes(day);

    updateRecurrence({
      ...recurrenceForm,
      weekdays: exists
        ? recurrenceForm.weekdays.filter((item) => item !== day)
        : [...recurrenceForm.weekdays, day],
    });
  }

  function handleRecurrenceInputChange(
    event: React.ChangeEvent<HTMLInputElement>,
    field: "start_date" | "start_time" | "lesson_count"
  ) {
    updateRecurrence({
      ...recurrenceForm,
      [field]:
        field === "lesson_count"
          ? Number(event.target.value) || 0
          : event.target.value,
    } as ClassRecurrence);
  }

  return (
    <div className="class-modal__backdrop" onClick={onClose}>
      <div className="class-modal" onClick={(event) => event.stopPropagation()}>
        <div className="class-modal__header">
          <h2>{mode === "create" ? "Nova Turma" : "Editar Turma"}</h2>

          <button type="button" onClick={onClose} aria-label="Fechar modal">
            ×
          </button>
        </div>

        <form className="class-modal__form" onSubmit={handleSubmit}>
          <div className="class-modal__grid">
            <label className="class-modal__full">
              <span>Nome da turma</span>
              <input
                name="name"
                value={form.name}
                onChange={handleInputChange}
                placeholder="Ex.: Alfabetizacao 1 - Manha"
                required
              />
            </label>

            <label>
              <span>Professor responsavel</span>
              <select
                name="teacher_id"
                value={form.teacher_id}
                onChange={handleInputChange}
              >
                <option value="">Selecionar depois</option>
                {professors.map((professor) => (
                  <option key={professor.id} value={professor.id}>
                    {professor.nome}
                  </option>
                ))}
              </select>
            </label>

            <div className="class-modal__full class-modal__recurrence-card">
              <div className="class-modal__recurrence-header">
                <div>
                  <span>Recorrencia da turma</span>
                  <p>
                    {recurrence
                      ? buildRecurrenceDescription(recurrence)
                      : "Selecione dias da semana, inicio da recorrencia, horario e numero de aulas."}
                  </p>
                </div>
              </div>

              <div className="class-modal__weekday-list">
                {weekdayOptions.map((day) => {
                  const active = recurrenceForm.weekdays.includes(day.key);

                  return (
                    <button
                      key={day.key}
                      type="button"
                      className={`class-modal__weekday ${active ? "is-active" : ""}`}
                      onClick={() => toggleWeekday(day.key)}
                      title={day.label}
                    >
                      {day.shortLabel}
                    </button>
                  );
                })}
              </div>

              <div className="class-modal__recurrence-grid">
                <label>
                  <span>Inicio da recorrencia</span>
                  <input
                    type="date"
                    value={recurrenceForm.start_date}
                    onChange={(event) => handleRecurrenceInputChange(event, "start_date")}
                  />
                </label>

                <label>
                  <span>Horario da turma</span>
                  <input
                    type="time"
                    value={recurrenceForm.start_time}
                    onChange={(event) => handleRecurrenceInputChange(event, "start_time")}
                  />
                </label>

                <label className="class-modal__full">
                  <span>Numero de aulas</span>
                  <input
                    type="number"
                    min={1}
                    value={recurrenceForm.lesson_count}
                    onChange={(event) => handleRecurrenceInputChange(event, "lesson_count")}
                  />
                </label>
              </div>
            </div>
          </div>

          {submitError ? <p className="class-modal__error">{submitError}</p> : null}

          <div className="class-modal__actions">
            <button
              type="button"
              className="class-modal__button class-modal__button--secondary"
              onClick={onClose}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="class-modal__button class-modal__button--primary"
              disabled={loading}
            >
              {loading
                ? "Salvando..."
                : mode === "create"
                ? "Criar turma"
                : "Salvar alteracoes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
