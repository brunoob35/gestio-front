import { useEffect, useMemo, useState } from "react";
import {
  buildRecurrenceDescription,
  type ClassRecurrence,
  type WeekdayKey,
  weekdayOptions,
} from "../../utils/classRecurrence";
import "./RecurrenceModal.css";

type RecurrenceModalProps = {
  open: boolean;
  initialValue: ClassRecurrence | null;
  onClose: () => void;
  onApply: (value: ClassRecurrence) => void;
};

const initialRecurrence: ClassRecurrence = {
  weekdays: [],
  lesson_count: 1,
  start_date: "",
  start_time: "",
};

export default function RecurrenceModal({
  open,
  initialValue,
  onClose,
  onApply,
}: RecurrenceModalProps) {
  const [form, setForm] = useState<ClassRecurrence>(initialRecurrence);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(initialValue ?? initialRecurrence);
    setError("");
  }, [open, initialValue]);

  const preview = useMemo(() => {
    if (!form.weekdays.length || !form.start_date || !form.start_time) return "";
    return buildRecurrenceDescription(form);
  }, [form]);

  if (!open) return null;

  function toggleWeekday(day: WeekdayKey) {
    setForm((current) => {
      const exists = current.weekdays.includes(day);

      return {
        ...current,
        weekdays: exists
          ? current.weekdays.filter((item) => item !== day)
          : [...current.weekdays, day],
      };
    });
  }

  function handleNumberChange(
    event: React.ChangeEvent<HTMLInputElement>,
    field: "lesson_count"
  ) {
    const nextValue = Number(event.target.value);

    setForm((current) => ({
      ...current,
      [field]: Number.isNaN(nextValue) ? 0 : nextValue,
    }));
  }

  function handleTextChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleApply() {
    if (!form.weekdays.length) {
      setError("Selecione pelo menos um dia da semana.");
      return;
    }

    if (!form.start_date || !form.start_time) {
      setError("Informe a data inicial e o horario da turma.");
      return;
    }

    if (form.lesson_count <= 0) {
      setError("Informe quantas aulas a turma tera.");
      return;
    }
    onApply(form);
    onClose();
  }

  return (
    <div className="recurrence-modal__backdrop" onClick={onClose}>
      <div className="recurrence-modal" onClick={(event) => event.stopPropagation()}>
        <div className="recurrence-modal__header">
          <h2>Recorrencia personalizada</h2>
        </div>

        <div className="recurrence-modal__body">
          <div className="recurrence-modal__section">
            <span>Repetir:</span>
            <div className="recurrence-modal__weekdays">
              {weekdayOptions.map((day) => {
                const active = form.weekdays.includes(day.key);

                return (
                  <button
                    key={day.key}
                    type="button"
                    className={`recurrence-modal__weekday ${active ? "is-active" : ""}`}
                    onClick={() => toggleWeekday(day.key)}
                    title={day.label}
                  >
                    {day.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="recurrence-modal__grid">
            <label>
              <span>Inicio</span>
              <input
                name="start_date"
                type="date"
                value={form.start_date}
                onChange={handleTextChange}
              />
            </label>

            <label>
              <span>Horario</span>
              <input
                name="start_time"
                type="time"
                value={form.start_time}
                onChange={handleTextChange}
              />
            </label>

            <label className="recurrence-modal__full">
              <span>Numero de aulas</span>
              <input
                type="number"
                min={1}
                value={form.lesson_count}
                onChange={(event) => handleNumberChange(event, "lesson_count")}
              />
            </label>
          </div>

          {preview ? <p className="recurrence-modal__preview">{preview}</p> : null}
          {error ? <p className="recurrence-modal__error">{error}</p> : null}
        </div>

        <div className="recurrence-modal__actions">
          <button type="button" className="recurrence-modal__link" onClick={onClose}>
            Cancelar
          </button>

          <button type="button" className="recurrence-modal__primary" onClick={handleApply}>
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
