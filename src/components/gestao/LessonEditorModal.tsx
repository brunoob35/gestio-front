import { useEffect, useMemo, useState } from "react";
import type { Lesson, LessonPayload, LessonStatusOption } from "../../services/lessons";
import type { ProfessorRow } from "../../services/professors";
import type { StudentRow } from "../../services/students";
import trashIcon from "../../assets/icons/trash-alt-svgrepo-com.svg";
import "./LessonEditorModal.css";

type LessonEditorModalProps = {
  open: boolean;
  lesson: Lesson | null;
  professors: ProfessorRow[];
  lessonStatuses: LessonStatusOption[];
  allStudents: StudentRow[];
  linkedStudents: StudentRow[];
  loadingStudents: boolean;
  onClose: () => void;
  onSave: (lessonId: number, payload: LessonPayload, statusId: number) => Promise<void>;
  onAddStudent: (lessonId: number, studentId: number) => Promise<void>;
  onRemoveStudent: (lessonId: number, studentId: number) => Promise<void>;
};

type FormState = {
  teacher_id: string;
  lesson_date: string;
  lesson_time: string;
  subject: string;
  vocabulary: string;
  balance: string;
  notes: string;
  status_id: string;
};

type FeedbackState = {
  type: "success" | "error";
  text: string;
};

const initialForm: FormState = {
  teacher_id: "",
  lesson_date: "",
  lesson_time: "",
  subject: "",
  vocabulary: "",
  balance: "",
  notes: "",
  status_id: "1",
};

function extractDateTimeParts(value?: string) {
  if (!value) return { date: "", time: "" };
  const normalized = value.replace(" ", "T");
  return {
    date: normalized.slice(0, 10),
    time: normalized.slice(11, 16),
  };
}

export default function LessonEditorModal({
  open,
  lesson,
  professors,
  lessonStatuses,
  allStudents,
  linkedStudents,
  loadingStudents,
  onClose,
  onSave,
  onAddStudent,
  onRemoveStudent,
}: LessonEditorModalProps) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [studentLoading, setStudentLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  useEffect(() => {
    if (!open || !lesson) return;
    const { date, time } = extractDateTimeParts(lesson.lesson_date);
    setForm({
      teacher_id: lesson.teacher_id ? String(lesson.teacher_id) : "",
      lesson_date: date,
      lesson_time: time,
      subject: lesson.subject ?? "",
      vocabulary: lesson.vocabulary ?? "",
      balance: lesson.balance ?? "",
      notes: lesson.notes ?? "",
      status_id: String(lesson.status_id || 1),
    });
    setSelectedStudentId("");
    setFeedback(null);
  }, [open, lesson]);

  const availableStudents = useMemo(() => {
    const linkedIds = new Set(linkedStudents.map((student) => student.id));
    return allStudents.filter((student) => !linkedIds.has(student.id) && student.status === "ativo");
  }, [allStudents, linkedStudents]);

  if (!open || !lesson) return null;
  const currentLesson = lesson;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!form.lesson_date || !form.lesson_time) {
      setFeedback({
        type: "error",
        text: "Informe a data e o horário da aula.",
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      await onSave(
        currentLesson.id,
        {
          class_id: currentLesson.class_id,
          teacher_id: form.teacher_id ? Number(form.teacher_id) : null,
          subject: form.subject.trim() || undefined,
          vocabulary: form.vocabulary.trim() || undefined,
          balance: form.balance.trim() || undefined,
          notes: form.notes.trim() || undefined,
          lesson_date: `${form.lesson_date}T${form.lesson_time}:00Z`,
        },
        Number(form.status_id)
      );
      setFeedback({
        type: "success",
        text: "Aula atualizada com sucesso.",
      });
      onClose();
    } catch {
      setFeedback({
        type: "error",
        text: "Não foi possível atualizar a aula.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddStudent() {
    if (!selectedStudentId) {
      setFeedback({
        type: "error",
        text: "Selecione um aluno para vincular à aula.",
      });
      return;
    }

    setStudentLoading(true);
    setFeedback(null);
    try {
      await onAddStudent(currentLesson.id, Number(selectedStudentId));
      setSelectedStudentId("");
      setFeedback({
        type: "success",
        text: "Aluno extra adicionado à aula.",
      });
    } catch {
      setFeedback({
        type: "error",
        text: "Não foi possível adicionar o aluno à aula.",
      });
    } finally {
      setStudentLoading(false);
    }
  }

  async function handleRemoveStudent(studentId: number) {
    setStudentLoading(true);
    setFeedback(null);
    try {
      await onRemoveStudent(currentLesson.id, studentId);
      setFeedback({
        type: "success",
        text: "Aluno removido da aula.",
      });
    } catch {
      setFeedback({
        type: "error",
        text: "Não foi possível remover o aluno da aula.",
      });
    } finally {
      setStudentLoading(false);
    }
  }

  return (
    <div className="lesson-editor__backdrop" onClick={onClose}>
      <div className="lesson-editor" onClick={(event) => event.stopPropagation()}>
        <div className="lesson-editor__header">
          <h2>Editar Aula</h2>
          <button type="button" onClick={onClose} aria-label="Fechar modal" title="Fechar modal">
            ×
          </button>
        </div>

        <form className="lesson-editor__form" onSubmit={handleSubmit}>
          <div className="lesson-editor__grid">
            <label>
              <span>Professor</span>
              <select
                value={form.teacher_id}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    teacher_id: event.target.value,
                  }))
                }
              >
                <option value="">Sem professor</option>
                {professors.map((professor) => (
                  <option key={professor.id} value={professor.id}>
                    {professor.nome}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Status</span>
              <select
                value={form.status_id}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status_id: event.target.value,
                  }))
                }
              >
                {lessonStatuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.nome_status}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Data</span>
              <input
                type="date"
                value={form.lesson_date}
                onChange={(event) =>
                  setForm((current) => ({
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
                value={form.lesson_time}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    lesson_time: event.target.value,
                  }))
                }
              />
            </label>

            <label className="lesson-editor__full">
              <span>Assunto</span>
              <input
                type="text"
                value={form.subject}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    subject: event.target.value,
                  }))
                }
              />
            </label>

            <label className="lesson-editor__full">
              <span>Vocabulário</span>
              <textarea
                value={form.vocabulary}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    vocabulary: event.target.value,
                  }))
                }
              />
            </label>

            <label className="lesson-editor__full">
              <span>Saldo</span>
              <textarea
                value={form.balance}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    balance: event.target.value,
                  }))
                }
              />
            </label>

            <label className="lesson-editor__full">
              <span>Observações</span>
              <textarea
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <div className="lesson-editor__students-card">
            <div>
              <h3>Alunos vinculados à aula</h3>
              <p>Você pode adicionar um aluno extra exclusivamente nesta aula.</p>
            </div>

            <div className="lesson-editor__students-add">
              <select
                value={selectedStudentId}
                onChange={(event) => setSelectedStudentId(event.target.value)}
                disabled={studentLoading || loadingStudents}
              >
                <option value="">Selecionar aluno extra</option>
                {availableStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.nome}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="lesson-editor__button lesson-editor__button--secondary"
                disabled={studentLoading || loadingStudents}
                onClick={() => void handleAddStudent()}
              >
                {studentLoading ? "Salvando..." : "Adicionar aluno"}
              </button>
            </div>

            {loadingStudents ? (
              <p className="lesson-editor__helper">Carregando alunos da aula...</p>
            ) : linkedStudents.length ? (
              <ul className="lesson-editor__students-list">
                {linkedStudents.map((student) => (
                  <li key={student.id}>
                    <div>
                      <strong>{student.nome}</strong>
                      <span>{student.status}</span>
                    </div>
                    <button
                      type="button"
                      className="lesson-editor__student-remove"
                      title="Remover aluno da aula"
                      aria-label="Remover aluno da aula"
                      onClick={() => void handleRemoveStudent(student.id)}
                    >
                      <img src={trashIcon} alt="Remover aluno da aula" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="lesson-editor__helper">Nenhum aluno extra vinculado a esta aula.</p>
            )}
          </div>

          {feedback ? (
            <p className={`lesson-editor__feedback is-${feedback.type}`}>
              {feedback.text}
            </p>
          ) : null}

          <div className="lesson-editor__actions">
            <button
              type="button"
              className="lesson-editor__button lesson-editor__button--secondary"
              onClick={onClose}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="lesson-editor__button lesson-editor__button--primary"
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar aula"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
