import { useEffect, useMemo, useState } from "react";

import ProfessorShell from "../components/professor/ProfessorShell";
import StatCard from "../components/gestao/StatCard";
import type { Class } from "../services/classes";
import { updateLessonStatus, type Lesson } from "../services/lessons";
import type { ProfessorRow } from "../services/professors";
import {
  fetchCurrentProfessor,
  fetchCurrentProfessorClasses,
  fetchCurrentProfessorLessons,
} from "../services/professorArea";
import { getLessonStatusPresentation } from "../utils/lessonStatus";

import calendarIcon from "../assets/icons/calendar-check-svgrepo-com.svg";
import clockIcon from "../assets/icons/clock-two-svgrepo-com.svg";
import warningIcon from "../assets/icons/warning-circle-svgrepo-com.svg";
import studentIcon from "../assets/icons/student-svgrepo-com.svg";
import locationIcon from "../assets/icons/location-pin-alt-1-svgrepo-com.svg";

import "./ProfessorHomePage.css";

type CalendarDay = {
  date: Date;
  iso: string;
  isCurrentMonth: boolean;
};

function toDate(value?: string) {
  if (!value) return null;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoDate(value?: string) {
  const date = toDate(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toTimeRange(value?: string) {
  const start = toDate(value);
  if (!start) return "Horário indefinido";

  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const format = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${format.format(start)} - ${format.format(end)}`;
}

function formatMonthLabel(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(value);
}

function formatLongDate(value: string) {
  const date = toDate(value);
  if (!date) return "Data inválida";
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getCalendarDays(month: Date) {
  const monthStart = getMonthStart(month);
  const firstWeekday = monthStart.getDay();
  const startOffset = (firstWeekday + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    return {
      date,
      iso: toIsoDate(date.toISOString()),
      isCurrentMonth: date.getMonth() === month.getMonth(),
    } satisfies CalendarDay;
  });
}

function sameDay(left: Lesson, rightIsoDate: string) {
  return toIsoDate(left.lesson_date) === rightIsoDate;
}

function getWeekRange(date: Date) {
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = normalized.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(normalized);
  start.setDate(normalized.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return { start, end };
}

export default function ProfessorHomePage() {
  const todayIso = useMemo(() => toIsoDate(new Date().toISOString()), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [professor, setProfessor] = useState<ProfessorRow | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [savingLessonId, setSavingLessonId] = useState<number | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      setLoading(true);
      setError("");

      try {
        const [professorRow, classRows, lessonRows] = await Promise.all([
          fetchCurrentProfessor(),
          fetchCurrentProfessorClasses(),
          fetchCurrentProfessorLessons(),
        ]);

        if (cancelled) return;

        setProfessor(professorRow);
        setClasses(classRows);
        setLessons(lessonRows);
      } catch (loadError) {
        console.error("Erro ao carregar área do professor:", loadError);
        if (!cancelled) {
          setError("Não foi possível carregar a agenda do professor.");
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

  const professorLessons = useMemo(() => {
    return [...lessons].sort((left, right) => {
      const leftTime = toDate(left.lesson_date)?.getTime() ?? 0;
      const rightTime = toDate(right.lesson_date)?.getTime() ?? 0;
      return leftTime - rightTime;
    });
  }, [lessons]);

  const lessonsByDay = useMemo(() => {
    const grouped = new Map<string, Lesson[]>();

    professorLessons.forEach((lesson) => {
      const isoDate = toIsoDate(lesson.lesson_date);
      if (!isoDate) return;

      const bucket = grouped.get(isoDate) ?? [];
      bucket.push(lesson);
      grouped.set(isoDate, bucket);
    });

    return grouped;
  }, [professorLessons]);

  const selectedLessons = useMemo(() => {
    return professorLessons.filter((lesson) => sameDay(lesson, selectedDate));
  }, [professorLessons, selectedDate]);

  const pendingLessons = useMemo(
    () => professorLessons.filter((lesson) => lesson.status_id === 5),
    [professorLessons]
  );

  const stats = useMemo(() => {
    const now = new Date();
    const today = professorLessons.filter((lesson) => sameDay(lesson, todayIso)).length;
    const week = getWeekRange(now);
    const weekLessons = professorLessons.filter((lesson) => {
      const lessonDate = toDate(lesson.lesson_date);
      if (!lessonDate) return false;
      return lessonDate >= week.start && lessonDate < week.end;
    }).length;

    return {
      today,
      week: weekLessons,
      pending: pendingLessons.length,
      classes: classes.length,
    };
  }, [classes.length, pendingLessons.length, professorLessons, todayIso]);

  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);

  async function handleChangeLessonStatus(lesson: Lesson, statusID: number) {
    setSavingLessonId(lesson.id);
    setError("");

    try {
      await updateLessonStatus(lesson.id, statusID);
      setLessons((current) =>
        current.map((item) =>
          item.id === lesson.id
            ? {
                ...item,
                status_id: statusID,
              }
            : item
        )
      );
    } catch (updateError) {
      console.error("Erro ao atualizar status da aula:", updateError);
      setError("Não foi possível atualizar o status da aula.");
    } finally {
      setSavingLessonId(null);
    }
  }

  return (
    <ProfessorShell title="Agenda">
      <div className="professor-home">
        <section className="professor-home__hero">
          <div>
            <h2>Minha Agenda</h2>
            <p>
              {professor
                ? `Visualize suas aulas, turmas e informações do professor ${professor.nome}.`
                : "Visualize suas aulas, turmas e informações do professor."}
            </p>
          </div>

          {professor ? (
            <div className="professor-home__teacher-card">
              <strong>{professor.nome}</strong>
              <span>{professor.email}</span>
              <span>{professor.telefone || "Telefone não informado"}</span>
            </div>
          ) : null}
        </section>

        {error ? <div className="professor-home__error">{error}</div> : null}

        <section className="professor-home__stats">
          <StatCard
            title="Aulas Hoje"
            value={String(stats.today)}
            detail="Agenda do dia atual"
            secondaryDetail="Compromissos do professor"
            icon={clockIcon}
            tone="green"
          />
          <StatCard
            title="Aulas Esta Semana"
            value={String(stats.week)}
            detail="Compromissos previstos"
            secondaryDetail="De segunda a domingo"
            icon={calendarIcon}
            tone="green"
          />
          <StatCard
            title="Pendentes"
            value={String(stats.pending)}
            detail="Reagendamentos aguardando retorno"
            secondaryDetail={`${stats.classes} turma(s) ativa(s)`}
            icon={warningIcon}
            tone="yellow"
          />
        </section>

        <div className="professor-home__top-grid">
          <section className="professor-home__panel professor-home__panel--calendar">
            <header className="professor-home__panel-header">
              <div>
                <h3>Calendário</h3>
              </div>
            </header>

            <div className="professor-home__calendar-shell">
              <div className="professor-home__calendar-toolbar">
                <div className="professor-home__calendar-toolbar-actions">
                  <button
                    type="button"
                    onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="professor-home__calendar-today"
                    onClick={() => {
                      const today = new Date();
                      setSelectedDate(todayIso);
                      setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                    }}
                  >
                    Hoje
                  </button>
                </div>
                <strong>{formatMonthLabel(visibleMonth)}</strong>
                <button
                  type="button"
                  onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
                >
                  →
                </button>
              </div>

              <div className="professor-home__weekday-row">
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>

              <div className="professor-home__calendar-grid">
                {calendarDays.map((day) => {
                  const dayLessons = lessonsByDay.get(day.iso) ?? [];
                  const completedCount = dayLessons.filter((lesson) => lesson.status_id === 2).length;
                  const pendingCount = dayLessons.filter((lesson) => lesson.status_id === 5).length;
                  const openCount = dayLessons.filter((lesson) => lesson.status_id === 1).length;
                  const isSelected = day.iso === selectedDate;
                  const isToday = day.iso === todayIso;

                  return (
                    <button
                      key={day.iso}
                      type="button"
                      className={[
                        "professor-home__calendar-day",
                        day.isCurrentMonth ? "" : "is-outside",
                        isSelected ? "is-selected" : "",
                        isToday ? "is-today" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => {
                        setSelectedDate(day.iso);
                        setVisibleMonth(new Date(day.date.getFullYear(), day.date.getMonth(), 1));
                      }}
                    >
                      <span className="professor-home__calendar-day-number">
                        {day.date.getDate()}
                      </span>
                      <span className="professor-home__calendar-dots">
                        {completedCount ? <span className="is-green" /> : null}
                        {openCount ? <span className="is-blue" /> : null}
                        {pendingCount ? <span className="is-yellow" /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="professor-home__panel professor-home__panel--agenda">
            <header className="professor-home__panel-header">
              <div>
                <h3>Agenda do Professor</h3>
                <p>{formatLongDate(selectedDate)}</p>
              </div>
            </header>

            {loading ? (
              <div className="professor-home__empty-state">Carregando agenda...</div>
            ) : selectedLessons.length ? (
              <div className="professor-home__lesson-list">
                {selectedLessons.map((lesson) => {
                  const classItem = classMap.get(lesson.class_id);
                  const status = getLessonStatusPresentation(lesson);
                  const markPresenceDisabled =
                    savingLessonId === lesson.id ||
                    lesson.status_id === 2 ||
                    lesson.status_id === 3;
                  const requestRescheduleDisabled =
                    savingLessonId === lesson.id ||
                    lesson.status_id === 2 ||
                    lesson.status_id === 3 ||
                    lesson.status_id === 5;

                  return (
                    <article key={lesson.id} className="professor-home__lesson-card">
                      <div className="professor-home__lesson-top">
                        <div className="professor-home__lesson-copy">
                          <strong>{classItem?.name || `Turma #${lesson.class_id}`}</strong>
                          <div className="professor-home__lesson-meta">
                            <span>
                              <img src={clockIcon} alt="" aria-hidden="true" />
                              {toTimeRange(lesson.lesson_date)}
                            </span>
                            <span>
                              <img src={locationIcon} alt="" aria-hidden="true" />
                              {classItem?.address || "Endereço não informado"}
                            </span>
                            <span>
                              <img src={studentIcon} alt="" aria-hidden="true" />
                              {classItem?.student_count ?? 0} aluno(s)
                            </span>
                          </div>
                          {classItem?.recurrence_desc ? (
                            <p className="professor-home__lesson-recurrence">
                              {classItem.recurrence_desc}
                            </p>
                          ) : null}
                        </div>

                        <span
                          className={`professor-home__status professor-home__status--${status.tone}`}
                        >
                          {status.label}
                        </span>
                      </div>

                      <div className="professor-home__lesson-actions">
                        <button
                          type="button"
                          className="professor-home__action professor-home__action--success"
                          disabled={markPresenceDisabled}
                          onClick={() => void handleChangeLessonStatus(lesson, 2)}
                        >
                          {lesson.status_id === 2 ? "Presença registrada" : "Dar presença"}
                        </button>
                        <button
                          type="button"
                          className="professor-home__action professor-home__action--warning"
                          disabled={requestRescheduleDisabled}
                          onClick={() => void handleChangeLessonStatus(lesson, 5)}
                        >
                          {lesson.status_id === 5 ? "Reagendamento em aberto" : "Reagendar aula"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="professor-home__empty-state">
                Nenhuma aula encontrada para a data selecionada.
              </div>
            )}
          </section>
        </div>
      </div>
    </ProfessorShell>
  );
}
