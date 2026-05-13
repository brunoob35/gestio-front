import { useEffect, useMemo, useState } from "react";
import type {
  Lesson,
  LessonPayload,
  LessonStatusOption,
} from "../../services/lessons";
import type { ProfessorRow } from "../../services/professors";
import {
  buildRecurrenceDescription,
  parseRecurrenceJson,
  type ClassRecurrence,
  type WeekdayKey,
  weekdayOptions,
} from "../../utils/classRecurrence";
import trashIcon from "../../assets/icons/trash-alt-svgrepo-com.svg";
import pencilIcon from "../../assets/icons/pencil-svgrepo-com.svg";
import { getLessonStatusPresentation } from "../../utils/lessonStatus";
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
  classId?: number;
  initialValues?: Partial<ClassFormValues>;
  existingLessons?: Lesson[];
  lessonStatuses?: LessonStatusOption[];
  onClose: () => void;
  onSubmit: (values: ClassFormValues) => Promise<void>;
  onCreateSingleLesson?: (payload: LessonPayload) => Promise<void>;
  onCreateRecurringLessons?: (payloads: LessonPayload[]) => Promise<void>;
  onUpdateLesson?: (
    lessonId: number,
    payload: LessonPayload,
    statusId: number
  ) => Promise<void>;
  onDeleteLesson?: (lessonId: number) => Promise<void>;
};

type LessonEditorValues = {
  lesson_date: string;
  lesson_time: string;
  subject: string;
  vocabulary: string;
  balance: string;
  notes: string;
  status_id: string;
};

const initialForm: ClassFormValues = {
  name: "",
  teacher_id: "",
  recurrence_desc: "",
  recurrence_json: "",
};

const initialLessonEditor: LessonEditorValues = {
  lesson_date: "",
  lesson_time: "",
  subject: "",
  vocabulary: "",
  balance: "",
  notes: "",
  status_id: "1",
};

function extractDateTimeParts(value?: string) {
  if (!value) {
    return {
      date: "",
      time: "",
    };
  }

  const normalized = value.replace(" ", "T");
  return {
    date: normalized.slice(0, 10),
    time: normalized.slice(11, 16),
  };
}

function formatLessonLabel(value: string) {
  const normalized = value.replace(" ", "T");
  const date = normalized.slice(0, 10);
  const time = normalized.slice(11, 16);
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}, ${time}`;
}

function parseWeekday(value: string) {
  switch (value) {
    case "domingo":
      return 0;
    case "segunda":
      return 1;
    case "terca":
      return 2;
    case "quarta":
      return 3;
    case "quinta":
      return 4;
    case "sexta":
      return 5;
    case "sabado":
      return 6;
    default:
      return -1;
  }
}

function generateRecurringLessonDates(recurrence: ClassRecurrence) {
  if (!recurrence.start_date || !recurrence.start_time || recurrence.lesson_count <= 0) {
    return [];
  }

  const allowedWeekdays: number[] = recurrence.weekdays
    .map((day) => parseWeekday(day))
    .filter((value) => value >= 0);

  if (!allowedWeekdays.length) {
    return [];
  }

  const [startYear, startMonth, startDay] = recurrence.start_date.split("-").map(Number);
  const [startHour, startMinute] = recurrence.start_time.split(":").map(Number);

  const baseDate = new Date(Date.UTC(startYear, (startMonth || 1) - 1, startDay || 1, startHour || 0, startMinute || 0));
  const lessonDates: string[] = [];

  for (let offsetDays = 0; lessonDates.length < recurrence.lesson_count && offsetDays < recurrence.lesson_count * 14; offsetDays += 1) {
    const candidate = new Date(baseDate.getTime());
    candidate.setUTCDate(baseDate.getUTCDate() + offsetDays);

    if (!allowedWeekdays.includes(candidate.getUTCDay())) {
      continue;
    }

    const iso = candidate.toISOString().slice(0, 19) + "Z";
    lessonDates.push(iso);
  }

  return lessonDates;
}

export default function ClassModal({
  open,
  mode,
  professors,
  classId,
  initialValues,
  existingLessons = [],
  lessonStatuses = [],
  onClose,
  onSubmit,
  onCreateSingleLesson,
  onCreateRecurringLessons,
  onUpdateLesson,
  onDeleteLesson,
}: ClassModalProps) {
  const [form, setForm] = useState<ClassFormValues>(initialForm);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [singleLessonDate, setSingleLessonDate] = useState("");
  const [singleLessonTime, setSingleLessonTime] = useState("");
  const [singleLessonSubject, setSingleLessonSubject] = useState("");
  const [singleLessonNotes, setSingleLessonNotes] = useState("");
  const [singleLessonLoading, setSingleLessonLoading] = useState(false);
  const [singleLessonFeedback, setSingleLessonFeedback] = useState("");

  const [extraRecurrence, setExtraRecurrence] = useState<ClassRecurrence>({
    weekdays: [],
    lesson_count: 1,
    start_date: "",
    start_time: "",
  });
  const [extraRecurrenceLoading, setExtraRecurrenceLoading] = useState(false);
  const [extraRecurrenceFeedback, setExtraRecurrenceFeedback] = useState("");

  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [lessonEditor, setLessonEditor] = useState<LessonEditorValues>(initialLessonEditor);
  const [lessonEditorLoading, setLessonEditorLoading] = useState(false);
  const [lessonActionFeedback, setLessonActionFeedback] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({
      name: initialValues?.name ?? "",
      teacher_id: initialValues?.teacher_id ?? "",
      recurrence_desc: initialValues?.recurrence_desc ?? "",
      recurrence_json: initialValues?.recurrence_json ?? "",
    });
    setSubmitError("");
    setSingleLessonDate("");
    setSingleLessonTime("");
    setSingleLessonSubject("");
    setSingleLessonNotes("");
    setSingleLessonFeedback("");
    setExtraRecurrence({
      weekdays: [],
      lesson_count: 1,
      start_date: "",
      start_time: "",
    });
    setExtraRecurrenceFeedback("");
    setEditingLessonId(null);
    setLessonEditor(initialLessonEditor);
    setLessonActionFeedback("");
    setSubmitAttempted(false);
  }, [open, initialValues]);

  const recurrence = parseRecurrenceJson(form.recurrence_json);
  const recurrenceForm: ClassRecurrence = recurrence ?? {
    weekdays: [],
    lesson_count: 1,
    start_date: "",
    start_time: "",
  };

  const normalizedLessonStatuses = useMemo(() => {
    if (lessonStatuses.length) return lessonStatuses;
    return [
      { id: 1, nome_status: "pendente" },
      { id: 2, nome_status: "realizada" },
      { id: 3, nome_status: "cancelada" },
      { id: 4, nome_status: "remarcada" },
      { id: 5, nome_status: "pendente reagendamento" },
      { id: 6, nome_status: "indenizada" },
    ];
  }, [lessonStatuses]);

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
    setSubmitAttempted(true);

    if (!form.name.trim()) {
      setSubmitError("Informe o nome da turma antes de salvar.");
      return;
    }

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

  function updateRecurrence(next: ClassRecurrence) {
    setForm((current) => ({
      ...current,
      recurrence_desc: buildRecurrenceDescription(next),
      recurrence_json: JSON.stringify(next),
    }));
    setSubmitError("");
  }

  function toggleWeekday(
    day: WeekdayKey,
    source: "main" | "extra"
  ) {
    if (source === "main") {
      const exists = recurrenceForm.weekdays.includes(day);
      updateRecurrence({
        ...recurrenceForm,
        weekdays: exists
          ? recurrenceForm.weekdays.filter((item) => item !== day)
          : [...recurrenceForm.weekdays, day],
      });
      return;
    }

    setExtraRecurrence((current) => {
      const exists = current.weekdays.includes(day);
      return {
        ...current,
        weekdays: exists
          ? current.weekdays.filter((item) => item !== day)
          : [...current.weekdays, day],
      };
    });
  }

  function handleRecurrenceInputChange(
    event: React.ChangeEvent<HTMLInputElement>,
    field: "start_date" | "start_time" | "lesson_count",
    source: "main" | "extra"
  ) {
    if (source === "main") {
      updateRecurrence({
        ...recurrenceForm,
        [field]:
          field === "lesson_count"
            ? Number(event.target.value) || 0
            : event.target.value,
      } as ClassRecurrence);
      return;
    }

    setExtraRecurrence((current) => ({
      ...current,
      [field]:
        field === "lesson_count"
          ? Number(event.target.value) || 0
          : event.target.value,
    }));
  }

  async function handleCreateSingleLesson() {
    if (!onCreateSingleLesson || !classId) return;

    if (!singleLessonDate || !singleLessonTime) {
      setSingleLessonFeedback("Informe a data e o horário da aula avulsa.");
      return;
    }

    setSingleLessonLoading(true);
    setSingleLessonFeedback("");

    try {
      await onCreateSingleLesson({
        class_id: classId,
        teacher_id: form.teacher_id ? Number(form.teacher_id) : null,
        subject: singleLessonSubject.trim() || undefined,
        notes: singleLessonNotes.trim() || undefined,
        lesson_date: `${singleLessonDate}T${singleLessonTime}:00Z`,
      });

      setSingleLessonDate("");
      setSingleLessonTime("");
      setSingleLessonSubject("");
      setSingleLessonNotes("");
      setSingleLessonFeedback("Aula avulsa criada com sucesso.");
    } catch {
      setSingleLessonFeedback("Não foi possível criar a aula avulsa.");
    } finally {
      setSingleLessonLoading(false);
    }
  }

  async function handleCreateRecurringExtraLessons() {
    if (!onCreateRecurringLessons || !classId) return;

    const generatedDates = generateRecurringLessonDates(extraRecurrence);
    if (!generatedDates.length) {
      setExtraRecurrenceFeedback("Preencha dias, início, horário e quantidade para gerar aulas extras.");
      return;
    }

    setExtraRecurrenceLoading(true);
    setExtraRecurrenceFeedback("");

    try {
      await onCreateRecurringLessons(
        generatedDates.map((lessonDate) => ({
          class_id: classId,
          teacher_id: form.teacher_id ? Number(form.teacher_id) : null,
          lesson_date: lessonDate,
        }))
      );

      setExtraRecurrence({
        weekdays: [],
        lesson_count: 1,
        start_date: "",
        start_time: "",
      });
      setExtraRecurrenceFeedback("Aulas extras criadas com sucesso.");
    } catch {
      setExtraRecurrenceFeedback("Não foi possível criar as aulas extras.");
    } finally {
      setExtraRecurrenceLoading(false);
    }
  }

  function startLessonEdit(lesson: Lesson) {
    const { date, time } = extractDateTimeParts(lesson.lesson_date);
    setEditingLessonId(lesson.id);
    setLessonEditor({
      lesson_date: date,
      lesson_time: time,
      subject: lesson.subject ?? "",
      vocabulary: lesson.vocabulary ?? "",
      balance: lesson.balance ?? "",
      notes: lesson.notes ?? "",
      status_id: String(lesson.status_id || 1),
    });
    setLessonActionFeedback("");
  }

  async function handleSaveLessonEdit() {
    if (!editingLessonId || !classId || !onUpdateLesson) return;
    if (!lessonEditor.lesson_date || !lessonEditor.lesson_time) {
      setLessonActionFeedback("Informe a data e o horário da aula.");
      return;
    }

    setLessonEditorLoading(true);
    setLessonActionFeedback("");

    try {
      await onUpdateLesson(
        editingLessonId,
        {
          class_id: classId,
          teacher_id: form.teacher_id ? Number(form.teacher_id) : null,
          subject: lessonEditor.subject.trim() || undefined,
          vocabulary: lessonEditor.vocabulary.trim() || undefined,
          balance: lessonEditor.balance.trim() || undefined,
          notes: lessonEditor.notes.trim() || undefined,
          lesson_date: `${lessonEditor.lesson_date}T${lessonEditor.lesson_time}:00Z`,
        },
        Number(lessonEditor.status_id)
      );

      setEditingLessonId(null);
      setLessonEditor(initialLessonEditor);
      setLessonActionFeedback("Aula atualizada com sucesso.");
    } catch {
      setLessonActionFeedback("Não foi possível atualizar a aula.");
    } finally {
      setLessonEditorLoading(false);
    }
  }

  async function handleDeleteLesson(lessonId: number) {
    if (!onDeleteLesson) return;
    const confirmed = window.confirm("Deseja remover esta aula?");
    if (!confirmed) return;

    try {
      await onDeleteLesson(lessonId);
      if (editingLessonId === lessonId) {
        setEditingLessonId(null);
        setLessonEditor(initialLessonEditor);
      }
      setLessonActionFeedback("Aula removida com sucesso.");
    } catch {
      setLessonActionFeedback("Não foi possível remover a aula.");
    }
  }

  return (
    <div className="class-modal__backdrop" onClick={onClose}>
      <div className="class-modal" onClick={(event) => event.stopPropagation()}>
        <div className="class-modal__header">
          <h2>{mode === "create" ? "Nova Turma" : "Editar Turma"}</h2>

          <button type="button" onClick={onClose} aria-label="Fechar modal" title="Fechar modal">
            ×
          </button>
        </div>

        <form className="class-modal__form" onSubmit={handleSubmit} noValidate>
          <div className="class-modal__grid">
            <label className={`class-modal__full ${submitAttempted && !form.name.trim() ? "is-invalid" : ""}`}>
              <span>Nome da turma *</span>
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

            <div className={`class-modal__full class-modal__recurrence-card ${submitAttempted && (!form.recurrence_json.trim() || !recurrence || !recurrence.weekdays.length || !recurrence.start_date || !recurrence.start_time || recurrence.lesson_count <= 0) ? "is-invalid" : ""}`}>
              <div className="class-modal__recurrence-header">
                <div>
                  <span>Recorrencia da turma *</span>
                  <p>
                    {recurrence
                      ? buildRecurrenceDescription(recurrence)
                      : "Selecione dias da semana, inicio da recorrencia, horario e numero de aulas."}
                  </p>
                </div>
              </div>

              <div className={`class-modal__weekday-list ${submitAttempted && (!recurrence || !recurrence.weekdays.length) ? "is-invalid" : ""}`}>
                {weekdayOptions.map((day) => {
                  const active = recurrenceForm.weekdays.includes(day.key);
                  return (
                    <button
                      key={day.key}
                      type="button"
                      className={`class-modal__weekday ${active ? "is-active" : ""}`}
                      onClick={() => toggleWeekday(day.key, "main")}
                      title={day.label}
                    >
                      {day.shortLabel}
                    </button>
                  );
                })}
              </div>

              <div className="class-modal__recurrence-grid">
                <label className={submitAttempted && !recurrenceForm.start_date ? "is-invalid" : ""}>
                  <span>Inicio da recorrencia *</span>
                  <input
                    type="date"
                    value={recurrenceForm.start_date}
                    onChange={(event) => handleRecurrenceInputChange(event, "start_date", "main")}
                  />
                </label>

                <label className={submitAttempted && !recurrenceForm.start_time ? "is-invalid" : ""}>
                  <span>Horario da turma *</span>
                  <input
                    type="time"
                    value={recurrenceForm.start_time}
                    onChange={(event) => handleRecurrenceInputChange(event, "start_time", "main")}
                  />
                </label>

                <label className={`class-modal__full ${submitAttempted && recurrenceForm.lesson_count <= 0 ? "is-invalid" : ""}`}>
                  <span>Numero de aulas *</span>
                  <input
                    type="number"
                    min={1}
                    value={recurrenceForm.lesson_count}
                    onChange={(event) => handleRecurrenceInputChange(event, "lesson_count", "main")}
                  />
                </label>
              </div>

              {mode === "edit" && classId && onCreateSingleLesson ? (
                <div className="class-modal__single-lesson-card">
                  <div className="class-modal__single-lesson-header">
                    <div>
                      <span>Adicionar aula avulsa</span>
                      <p>Crie uma aula única fora do padrão da recorrência principal.</p>
                    </div>
                  </div>

                  <div className="class-modal__recurrence-grid">
                    <label>
                      <span>Data da aula</span>
                      <input
                        type="date"
                        value={singleLessonDate}
                        onChange={(event) => setSingleLessonDate(event.target.value)}
                      />
                    </label>

                    <label>
                      <span>Horário da aula</span>
                      <input
                        type="time"
                        value={singleLessonTime}
                        onChange={(event) => setSingleLessonTime(event.target.value)}
                      />
                    </label>

                    <label className="class-modal__full">
                      <span>Assunto</span>
                      <input
                        type="text"
                        value={singleLessonSubject}
                        onChange={(event) => setSingleLessonSubject(event.target.value)}
                        placeholder="Ex.: Aula de reposição"
                      />
                    </label>

                    <label className="class-modal__full">
                      <span>Observações</span>
                      <input
                        type="text"
                        value={singleLessonNotes}
                        onChange={(event) => setSingleLessonNotes(event.target.value)}
                        placeholder="Observações opcionais"
                      />
                    </label>
                  </div>

                  <div className="class-modal__single-lesson-actions">
                    {singleLessonFeedback ? (
                      <p className="class-modal__single-lesson-feedback">{singleLessonFeedback}</p>
                    ) : null}
                    <button
                      type="button"
                      className="class-modal__button class-modal__button--secondary"
                      disabled={singleLessonLoading}
                      onClick={() => void handleCreateSingleLesson()}
                    >
                      {singleLessonLoading ? "Criando aula..." : "Adicionar aula avulsa"}
                    </button>
                  </div>
                </div>
              ) : null}

              {mode === "edit" && classId && onCreateRecurringLessons ? (
                <div className="class-modal__single-lesson-card">
                  <div className="class-modal__single-lesson-header">
                    <div>
                      <span>Adicionar aulas em quantidade</span>
                      <p>Crie uma recorrência extra sem alterar a recorrência principal da turma.</p>
                    </div>
                  </div>

                  <div className="class-modal__weekday-list">
                    {weekdayOptions.map((day) => {
                      const active = extraRecurrence.weekdays.includes(day.key);
                      return (
                        <button
                          key={`extra-${day.key}`}
                          type="button"
                          className={`class-modal__weekday ${active ? "is-active" : ""}`}
                          onClick={() => toggleWeekday(day.key, "extra")}
                          title={day.label}
                        >
                          {day.shortLabel}
                        </button>
                      );
                    })}
                  </div>

                  <div className="class-modal__recurrence-grid">
                    <label>
                      <span>Início da recorrência extra</span>
                      <input
                        type="date"
                        value={extraRecurrence.start_date}
                        onChange={(event) => handleRecurrenceInputChange(event, "start_date", "extra")}
                      />
                    </label>

                    <label>
                      <span>Horário das aulas extras</span>
                      <input
                        type="time"
                        value={extraRecurrence.start_time}
                        onChange={(event) => handleRecurrenceInputChange(event, "start_time", "extra")}
                      />
                    </label>

                    <label className="class-modal__full">
                      <span>Quantidade de aulas extras</span>
                      <input
                        type="number"
                        min={1}
                        value={extraRecurrence.lesson_count}
                        onChange={(event) => handleRecurrenceInputChange(event, "lesson_count", "extra")}
                      />
                    </label>
                  </div>

                  <div className="class-modal__single-lesson-actions">
                    {extraRecurrenceFeedback ? (
                      <p className="class-modal__single-lesson-feedback">{extraRecurrenceFeedback}</p>
                    ) : null}
                    <button
                      type="button"
                      className="class-modal__button class-modal__button--secondary"
                      disabled={extraRecurrenceLoading}
                      onClick={() => void handleCreateRecurringExtraLessons()}
                    >
                      {extraRecurrenceLoading ? "Criando aulas..." : "Adicionar aulas em lote"}
                    </button>
                  </div>
                </div>
              ) : null}

              {mode === "edit" && classId ? (
                <div className="class-modal__single-lesson-card">
                  <div className="class-modal__single-lesson-header">
                    <div>
                      <span>Aulas da turma</span>
                      <p>Edite ou remova aulas específicas sem depender apenas da recorrência.</p>
                    </div>
                  </div>

                  {existingLessons.length ? (
                    <div className="class-modal__lesson-list">
                      {existingLessons.map((lesson) => (
                        <div key={lesson.id} className="class-modal__lesson-row">
                          <div className="class-modal__lesson-main">
                            <strong>{formatLessonLabel(lesson.lesson_date)}</strong>
                            <span>{lesson.subject?.trim() || "Assunto ainda não definido"}</span>
                          </div>

                          <div className="class-modal__lesson-side">
                            {(() => {
                              const status = getLessonStatusPresentation(lesson);
                              return (
                                <span className={`class-modal__lesson-status is-${status.tone}`}>
                                  {status.label}
                                </span>
                              );
                            })()}
                            <button
                              type="button"
                              className="class-modal__lesson-icon"
                              title="Editar aula"
                              aria-label="Editar aula"
                              onClick={() => startLessonEdit(lesson)}
                            >
                              <img src={pencilIcon} alt="Editar aula" />
                            </button>
                            <button
                              type="button"
                              className="class-modal__lesson-icon is-danger"
                              title="Excluir aula"
                              aria-label="Excluir aula"
                              onClick={() => void handleDeleteLesson(lesson.id)}
                            >
                              <img src={trashIcon} alt="Excluir aula" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="class-modal__single-lesson-feedback">
                      Nenhuma aula cadastrada para esta turma.
                    </p>
                  )}

                  {editingLessonId ? (
                    <div className="class-modal__lesson-editor">
                      <div className="class-modal__recurrence-grid">
                        <label>
                          <span>Data</span>
                          <input
                            type="date"
                            value={lessonEditor.lesson_date}
                            onChange={(event) =>
                              setLessonEditor((current) => ({
                                ...current,
                                lesson_date: event.target.value,
                              }))
                            }
                          />
                        </label>

                        <label>
                          <span>Horário</span>
                          <input
                            type="time"
                            value={lessonEditor.lesson_time}
                            onChange={(event) =>
                              setLessonEditor((current) => ({
                                ...current,
                                lesson_time: event.target.value,
                              }))
                            }
                          />
                        </label>

                        <label className="class-modal__full">
                          <span>Status</span>
                          <select
                            value={lessonEditor.status_id}
                            onChange={(event) =>
                              setLessonEditor((current) => ({
                                ...current,
                                status_id: event.target.value,
                              }))
                            }
                          >
                            {normalizedLessonStatuses.map((status) => (
                              <option key={status.id} value={status.id}>
                                {status.nome_status}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="class-modal__full">
                          <span>Assunto</span>
                          <input
                            type="text"
                            value={lessonEditor.subject}
                            onChange={(event) =>
                              setLessonEditor((current) => ({
                                ...current,
                                subject: event.target.value,
                              }))
                            }
                          />
                        </label>

                        <label className="class-modal__full">
                          <span>Vocabulário</span>
                          <input
                            type="text"
                            value={lessonEditor.vocabulary}
                            onChange={(event) =>
                              setLessonEditor((current) => ({
                                ...current,
                                vocabulary: event.target.value,
                              }))
                            }
                          />
                        </label>

                        <label className="class-modal__full">
                          <span>Saldo</span>
                          <input
                            type="text"
                            value={lessonEditor.balance}
                            onChange={(event) =>
                              setLessonEditor((current) => ({
                                ...current,
                                balance: event.target.value,
                              }))
                            }
                          />
                        </label>

                        <label className="class-modal__full">
                          <span>Observações</span>
                          <input
                            type="text"
                            value={lessonEditor.notes}
                            onChange={(event) =>
                              setLessonEditor((current) => ({
                                ...current,
                                notes: event.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>

                      <div className="class-modal__single-lesson-actions">
                        {lessonActionFeedback ? (
                          <p className="class-modal__single-lesson-feedback">{lessonActionFeedback}</p>
                        ) : null}

                        <div className="class-modal__lesson-editor-buttons">
                          <button
                            type="button"
                            className="class-modal__button class-modal__button--secondary"
                            onClick={() => setEditingLessonId(null)}
                          >
                            Cancelar edição
                          </button>

                          <button
                            type="button"
                            className="class-modal__button class-modal__button--primary"
                            disabled={lessonEditorLoading}
                            onClick={() => void handleSaveLessonEdit()}
                          >
                            {lessonEditorLoading ? "Salvando aula..." : "Salvar aula"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
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
