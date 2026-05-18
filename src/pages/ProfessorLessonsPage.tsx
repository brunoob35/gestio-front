import { useEffect, useMemo, useState } from "react";

import ProfessorShell from "../components/professor/ProfessorShell";
import StatCard from "../components/gestao/StatCard";
import type { Class } from "../services/classes";
import type { Lesson } from "../services/lessons";
import {
  fetchCurrentProfessorClasses,
  fetchCurrentProfessorLessons,
} from "../services/professorArea";
import { getLessonStatusPresentation } from "../utils/lessonStatus";

import calendarIcon from "../assets/icons/calendar-check-svgrepo-com.svg";
import clockIcon from "../assets/icons/clock-two-svgrepo-com.svg";
import warningIcon from "../assets/icons/warning-circle-svgrepo-com.svg";
import eyeIcon from "../assets/icons/eye-show-svgrepo-com.svg";
import studentIcon from "../assets/icons/student-svgrepo-com.svg";
import locationIcon from "../assets/icons/location-pin-alt-1-svgrepo-com.svg";

import "./ProfessorLessonsPage.css";

type LessonFilter =
  | "all"
  | "scheduled"
  | "completed"
  | "cancelled"
  | "rescheduled"
  | "reschedule"
  | "overdue";

function toDate(value?: string) {
  if (!value) return null;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatLessonCode(id: number) {
  return `A${String(id).padStart(3, "0")}`;
}

function formatDate(value?: string) {
  const date = toDate(value);
  if (!date) return "Data inválida";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatTimeRange(value?: string) {
  const start = toDate(value);
  if (!start) return "Horário indefinido";

  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function getFilterValue(lesson: Lesson): LessonFilter | "pending" {
  const status = getLessonStatusPresentation(lesson);

  if (status.tone === "overdue") return "overdue";
  if (lesson.status_id === 2) return "completed";
  if (lesson.status_id === 3) return "cancelled";
  if (lesson.status_id === 4) return "rescheduled";
  if (lesson.status_id === 5) return "reschedule";
  return "scheduled";
}

function toMonthValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function lessonMatchesMonth(lesson: Lesson, monthValue: string) {
  if (!monthValue) return true;
  const date = toDate(lesson.lesson_date);
  if (!date) return false;
  return toMonthValue(date) === monthValue;
}

export default function ProfessorLessonsPage() {
  const currentMonth = useMemo(() => toMonthValue(new Date()), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [monthFilter, setMonthFilter] = useState(currentMonth);
  const [filter, setFilter] = useState<LessonFilter>("all");
  const [classes, setClasses] = useState<Class[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      setLoading(true);
      setError("");

      try {
        const [classRows, lessonRows] = await Promise.all([
          fetchCurrentProfessorClasses(),
          fetchCurrentProfessorLessons(),
        ]);

        if (cancelled) return;

        setClasses(classRows);
        setLessons(lessonRows);
      } catch (loadError) {
        console.error("Erro ao carregar aulas do professor:", loadError);
        if (!cancelled) {
          setError("Não foi possível carregar as aulas do professor.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, []);

  const classMap = useMemo(
    () => new Map(classes.map((classItem) => [classItem.id, classItem])),
    [classes]
  );

  const sortedLessons = useMemo(() => {
    return [...lessons].sort((left, right) => {
      const leftTime = toDate(left.lesson_date)?.getTime() ?? 0;
      const rightTime = toDate(right.lesson_date)?.getTime() ?? 0;
      return rightTime - leftTime;
    });
  }, [lessons]);

  const filteredLessons = useMemo(() => {
    return sortedLessons.filter((lesson) => {
      const matchesMonth = lessonMatchesMonth(lesson, monthFilter);
      const matchesStatus = filter === "all" || getFilterValue(lesson) === filter;
      return matchesMonth && matchesStatus;
    });
  }, [filter, monthFilter, sortedLessons]);

  const stats = useMemo(() => {
    const completed = filteredLessons.filter((lesson) => lesson.status_id === 2).length;
    const pending = filteredLessons.filter((lesson) => lesson.status_id === 1 || lesson.status_id === 5).length;
    const cancelled = filteredLessons.filter((lesson) => lesson.status_id === 3).length;

    return {
      total: filteredLessons.length,
      completed,
      pending,
      cancelled,
    };
  }, [filteredLessons]);

  const selectedClass = selectedLesson ? classMap.get(selectedLesson.class_id) : undefined;

  return (
    <ProfessorShell title="Minhas Aulas">
      <div className="professor-lessons">
        <section className="professor-lessons__hero">
          <h2>Minhas Aulas</h2>
          <p>Histórico e controle das aulas ministradas.</p>
        </section>

        {error ? <div className="professor-lessons__error">{error}</div> : null}

        <section className="professor-lessons__panel">
          <div className="professor-lessons__filters">
            <label className="professor-lessons__month">
              <span className="sr-only">Filtrar aulas por mês</span>
              <input
                type="month"
                value={monthFilter}
                onChange={(event) => setMonthFilter(event.target.value)}
              />
            </label>

            <label className="professor-lessons__select">
              <span className="sr-only">Filtrar aulas por status</span>
              <select value={filter} onChange={(event) => setFilter(event.target.value as LessonFilter)}>
                <option value="all">Todos os status</option>
                <option value="scheduled">Agendadas</option>
                <option value="overdue">Vencidas</option>
                <option value="completed">Realizadas</option>
                <option value="reschedule">Pendentes reagendamento</option>
                <option value="rescheduled">Remarcadas</option>
                <option value="cancelled">Canceladas</option>
              </select>
            </label>
          </div>
        </section>

        <section className="professor-lessons__stats">
          <StatCard
            title="Total de Aulas"
            value={String(stats.total)}
            detail="Aulas vinculadas ao professor"
            secondaryDetail="Considerando os filtros aplicados"
            icon={calendarIcon}
            tone="green"
          />
          <StatCard
            title="Realizadas"
            value={String(stats.completed)}
            detail="Aulas concluídas"
            secondaryDetail="Status finalizado"
            icon={clockIcon}
            tone="green"
          />
          <StatCard
            title="Pendentes"
            value={String(stats.pending)}
            detail="Agendadas ou aguardando retorno"
            secondaryDetail="Demandam acompanhamento"
            icon={warningIcon}
            tone="yellow"
          />
          <StatCard
            title="Canceladas"
            value={String(stats.cancelled)}
            detail="Aulas encerradas sem realização"
            secondaryDetail="Histórico preservado"
            icon={warningIcon}
            tone="red"
          />
        </section>

        <section className="professor-lessons__panel">
          <header className="professor-lessons__panel-header">
            <h3>Histórico de Aulas</h3>
          </header>

          <div className="professor-lessons__table-wrap">
            <table className="professor-lessons__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Data</th>
                  <th>Horário</th>
                  <th>Turma</th>
                  <th>Presença</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="professor-lessons__empty">
                      Carregando aulas...
                    </td>
                  </tr>
                ) : filteredLessons.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="professor-lessons__empty">
                      Nenhuma aula encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredLessons.map((lesson) => {
                    const status = getLessonStatusPresentation(lesson);
                    const lessonClass = classMap.get(lesson.class_id);
                    const totalStudents = lessonClass?.student_count ?? 0;

                    return (
                      <tr key={lesson.id}>
                        <td>{formatLessonCode(lesson.id)}</td>
                        <td>{formatDate(lesson.lesson_date)}</td>
                        <td>{formatTimeRange(lesson.lesson_date)}</td>
                        <td>{lessonClass?.name || "Turma não encontrada"}</td>
                        <td>{`${totalStudents}/${totalStudents}`}</td>
                        <td>
                          <span
                            className={`professor-lessons__status professor-lessons__status--${status.tone}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="professor-lessons__icon-button"
                            onClick={() => setSelectedLesson(lesson)}
                            aria-label={`Ver detalhes da aula ${formatLessonCode(lesson.id)}`}
                          >
                            <img src={eyeIcon} alt="" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedLesson ? (
          <div
            className="professor-lessons__modal-backdrop"
            role="presentation"
            onClick={() => setSelectedLesson(null)}
          >
            <section
              className="professor-lessons__modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="professor-lesson-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="professor-lessons__modal-header">
                <div>
                  <h3 id="professor-lesson-modal-title">
                    Aula {formatLessonCode(selectedLesson.id)}
                  </h3>
                  <p>{selectedClass?.name || "Turma não encontrada"}</p>
                </div>

                <button
                  type="button"
                  className="professor-lessons__modal-close"
                  onClick={() => setSelectedLesson(null)}
                  aria-label="Fechar detalhes da aula"
                >
                  ×
                </button>
              </header>

              <div className="professor-lessons__modal-grid">
                <article className="professor-lessons__detail-card">
                  <strong>Data</strong>
                  <span>{formatDate(selectedLesson.lesson_date)}</span>
                </article>
                <article className="professor-lessons__detail-card">
                  <strong>Horário</strong>
                  <span>{formatTimeRange(selectedLesson.lesson_date)}</span>
                </article>
                <article className="professor-lessons__detail-card">
                  <strong>Status</strong>
                  <span>{getLessonStatusPresentation(selectedLesson).label}</span>
                </article>
                <article className="professor-lessons__detail-card">
                  <strong>Alunos vinculados</strong>
                  <span>{selectedClass?.student_count ?? 0}</span>
                </article>
              </div>

              <div className="professor-lessons__detail-list">
                <div>
                  <img src={studentIcon} alt="" aria-hidden="true" />
                  <span>{selectedClass?.name || "Turma não encontrada"}</span>
                </div>
                <div>
                  <img src={locationIcon} alt="" aria-hidden="true" />
                  <span>{selectedClass?.address || "Endereço não informado"}</span>
                </div>
              </div>

              {selectedLesson.subject || selectedLesson.vocabulary || selectedLesson.balance || selectedLesson.notes ? (
                <div className="professor-lessons__notes">
                  {selectedLesson.subject ? (
                    <p>
                      <strong>Assunto:</strong> {selectedLesson.subject}
                    </p>
                  ) : null}
                  {selectedLesson.vocabulary ? (
                    <p>
                      <strong>Vocabulário:</strong> {selectedLesson.vocabulary}
                    </p>
                  ) : null}
                  {selectedLesson.balance ? (
                    <p>
                      <strong>Saldo:</strong> {selectedLesson.balance}
                    </p>
                  ) : null}
                  {selectedLesson.notes ? (
                    <p>
                      <strong>Observações:</strong> {selectedLesson.notes}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>
        ) : null}
      </div>
    </ProfessorShell>
  );
}
