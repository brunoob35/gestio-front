import { useEffect, useMemo, useState } from "react";

import GestaoShell from "../components/gestao/GestaoShell";
import StatCard from "../components/gestao/StatCard";
import { useGestaoData } from "../context/GestaoDataContext";
import {
  approveLessonReschedule,
  fetchAllLessons,
  requestLessonReschedule,
  rejectLessonReschedule,
  type Lesson,
  updateLessonStatus,
} from "../services/lessons";
import { getLessonStatusPresentation } from "../utils/lessonStatus";

import calendarIcon from "../assets/icons/calendar-check-svgrepo-com.svg";
import clockIcon from "../assets/icons/clock-two-svgrepo-com.svg";
import warningIcon from "../assets/icons/warning-circle-svgrepo-com.svg";

import "./GestaoPresencasPage.css";

type CalendarDay = {
  date: Date;
  iso: string;
  isCurrentMonth: boolean;
};

type LessonGroup = {
  teacherLabel: string;
  lessons: Lesson[];
};

type RescheduleModalState = {
  lesson: Lesson;
  date: string;
  time: string;
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

function toTime(value?: string) {
  const date = toDate(value);
  if (!date) return "";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
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

function formatShortDateTime(value?: string) {
  const date = toDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTime(value?: string) {
  const date = toDate(value);
  if (!date) return "Horário indefinido";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildReschedulePayload(date: string, time: string) {
  return `${date}T${time}:00Z`;
}

function sameDay(left: Lesson, rightIsoDate: string) {
  return toIsoDate(left.lesson_date) === rightIsoDate;
}

function getTeacherLabel(
  lesson: Lesson,
  classTeacherId: number | null | undefined,
  professorNames: Map<number, string>
) {
  const teacherId = lesson.teacher_id ?? classTeacherId ?? null;
  if (!teacherId) return "Sem professor vinculado";
  return professorNames.get(teacherId) ?? `Professor #${teacherId}`;
}

export default function GestaoPresencasPage() {
  const {
    classes,
    allProfessors,
    hasLoadedClasses,
    hasLoadedAllProfessors,
    loadClasses,
    loadAllProfessors,
  } = useGestaoData();

  const todayIso = useMemo(() => toIsoDate(new Date().toISOString()), []);

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingLessonId, setSavingLessonId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [rescheduleModal, setRescheduleModal] = useState<RescheduleModalState | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      setLoading(true);
      setError("");

      try {
        const pendingLoads: Promise<unknown>[] = [fetchAllLessons()];

        if (!hasLoadedClasses) pendingLoads.push(loadClasses());
        if (!hasLoadedAllProfessors) pendingLoads.push(loadAllProfessors());

        const [lessonRows] = await Promise.all(pendingLoads);

        if (!cancelled) {
          setLessons(lessonRows as Lesson[]);
        }
      } catch (loadError) {
        console.error("Erro ao carregar dados de presenças:", loadError);
        if (!cancelled) {
          setError("Não foi possível carregar as presenças e reagendamentos.");
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
  }, [hasLoadedAllProfessors, hasLoadedClasses, loadAllProfessors, loadClasses]);

  const classMap = useMemo(
    () => new Map(classes.map((classItem) => [classItem.id, classItem])),
    [classes]
  );

  const professorNames = useMemo(
    () => new Map(allProfessors.map((professor) => [professor.id, professor.nome])),
    [allProfessors]
  );

  const lessonsByDay = useMemo(() => {
    const grouped = new Map<string, Lesson[]>();

    lessons.forEach((lesson) => {
      const isoDate = toIsoDate(lesson.lesson_date);
      if (!isoDate) return;

      const existing = grouped.get(isoDate) ?? [];
      existing.push(lesson);
      grouped.set(isoDate, existing);
    });

    return grouped;
  }, [lessons]);

  const selectedLessons = useMemo(() => {
    const dayLessons = lessons.filter((lesson) => sameDay(lesson, selectedDate));
    return [...dayLessons].sort((left, right) => {
      const leftTime = toDate(left.lesson_date)?.getTime() ?? 0;
      const rightTime = toDate(right.lesson_date)?.getTime() ?? 0;
      return leftTime - rightTime;
    });
  }, [lessons, selectedDate]);

  const groupedSelectedLessons = useMemo<LessonGroup[]>(() => {
    const groups = new Map<string, Lesson[]>();

    selectedLessons.forEach((lesson) => {
      const classItem = classMap.get(lesson.class_id);
      const teacherLabel = getTeacherLabel(lesson, classItem?.teacher_id, professorNames);
      const bucket = groups.get(teacherLabel) ?? [];
      bucket.push(lesson);
      groups.set(teacherLabel, bucket);
    });

    return [...groups.entries()]
      .map(([teacherLabel, lessonRows]) => ({
        teacherLabel,
        lessons: lessonRows,
      }))
      .sort((left, right) => {
        const leftStart = toDate(left.lessons[0]?.lesson_date)?.getTime() ?? 0;
        const rightStart = toDate(right.lessons[0]?.lesson_date)?.getTime() ?? 0;
        if (leftStart !== rightStart) return leftStart - rightStart;
        return left.teacherLabel.localeCompare(right.teacherLabel);
      });
  }, [classMap, professorNames, selectedLessons]);

  const pendingReschedules = useMemo(() => {
    return lessons
      .filter((lesson) => lesson.status_id === 5 && lesson.requested_lesson_date)
      .sort((left, right) => {
        const leftTime = toDate(left.requested_lesson_date)?.getTime() ?? 0;
        const rightTime = toDate(right.requested_lesson_date)?.getTime() ?? 0;
        return leftTime - rightTime;
      });
  }, [lessons]);

  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);

  const stats = useMemo(() => {
    const dayLessons = selectedLessons.length;
    const completed = selectedLessons.filter((lesson) => lesson.status_id === 2).length;
    const pendingApproval = pendingReschedules.length;

    return {
      dayLessons,
      completed,
      pendingApproval,
    };
  }, [pendingReschedules.length, selectedLessons]);

  function updateLessonInState(updatedLesson: Lesson) {
    setLessons((current) =>
      current.map((lesson) => (lesson.id === updatedLesson.id ? updatedLesson : lesson))
    );
  }

  async function handleMarkPresence(lesson: Lesson) {
    setSavingLessonId(lesson.id);
    try {
      await updateLessonStatus(lesson.id, 2);
      updateLessonInState({
        ...lesson,
        status_id: 2,
        status_name: "realizada",
      });
    } catch (actionError) {
      console.error("Erro ao marcar presença:", actionError);
      setError("Não foi possível marcar a presença desta aula.");
    } finally {
      setSavingLessonId(null);
    }
  }

  function openRescheduleModal(lesson: Lesson) {
    setRescheduleModal({
      lesson,
      date: toIsoDate(lesson.requested_lesson_date || lesson.lesson_date),
      time: toTime(lesson.requested_lesson_date || lesson.lesson_date),
    });
  }

  async function handleSubmitReschedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!rescheduleModal?.date || !rescheduleModal?.time) {
      setError("Informe a nova data e o novo horário da aula.");
      return;
    }

    setSavingLessonId(rescheduleModal.lesson.id);
    try {
      const updatedLesson = await requestLessonReschedule(rescheduleModal.lesson.id, {
        requested_lesson_date: buildReschedulePayload(
          rescheduleModal.date,
          rescheduleModal.time
        ),
      });
      updateLessonInState(updatedLesson);
      setRescheduleModal(null);
    } catch (actionError) {
      console.error("Erro ao solicitar reagendamento:", actionError);
      setError("Não foi possível solicitar o reagendamento desta aula.");
    } finally {
      setSavingLessonId(null);
    }
  }

  async function handleApproveReschedule(lesson: Lesson) {
    setSavingLessonId(lesson.id);
    try {
      const updatedLesson = await approveLessonReschedule(lesson.id);
      updateLessonInState(updatedLesson);
    } catch (actionError) {
      console.error("Erro ao aprovar reagendamento:", actionError);
      setError("Não foi possível aprovar o reagendamento.");
    } finally {
      setSavingLessonId(null);
    }
  }

  async function handleRejectReschedule(lesson: Lesson) {
    setSavingLessonId(lesson.id);
    try {
      const updatedLesson = await rejectLessonReschedule(lesson.id);
      updateLessonInState(updatedLesson);
    } catch (actionError) {
      console.error("Erro ao recusar reagendamento:", actionError);
      setError("Não foi possível recusar o reagendamento.");
    } finally {
      setSavingLessonId(null);
    }
  }

  return (
    <GestaoShell title="Presenças">
      <div className="gestao-presencas">
        <section className="gestao-presencas__hero">
          <div>
            <h2>Presenças e Reagendamentos</h2>
            <p>Gerencie presenças, calendário e solicitações.</p>
          </div>
        </section>

        {error ? <div className="gestao-presencas__error">{error}</div> : null}

        <div className="gestao-presencas__top-grid">
          <section className="gestao-presencas__panel gestao-presencas__panel--calendar">
            <header className="gestao-presencas__panel-header">
              <div>
                <h3>Calendário</h3>
              </div>
            </header>

            <div className="gestao-presencas__calendar-shell">
              <div className="gestao-presencas__calendar-toolbar">
                <div className="gestao-presencas__calendar-toolbar-actions">
                  <button
                    type="button"
                    onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="gestao-presencas__calendar-today"
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

              <div className="gestao-presencas__weekday-row">
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>

              <div className="gestao-presencas__calendar-grid">
                {calendarDays.map((day) => {
                  const dayLessons = lessonsByDay.get(day.iso) ?? [];
                  const pendingCount = dayLessons.filter((lesson) => lesson.status_id === 5).length;
                  const completedCount = dayLessons.filter((lesson) => lesson.status_id === 2).length;
                  const cancelledCount = dayLessons.filter((lesson) => lesson.status_id === 3).length;
                  const isSelected = day.iso === selectedDate;
                  const isToday = day.iso === todayIso;

                  return (
                    <button
                      key={day.iso}
                      type="button"
                      className={[
                        "gestao-presencas__calendar-day",
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
                      <span className="gestao-presencas__calendar-day-number">
                        {day.date.getDate()}
                      </span>
                      <span className="gestao-presencas__calendar-dots">
                        {completedCount ? (
                          <span className="is-green" title={`${completedCount} realizada(s)`} />
                        ) : null}
                        {pendingCount ? (
                          <span
                            className="is-yellow"
                            title={`${pendingCount} pendente(s) de reagendamento`}
                          />
                        ) : null}
                        {cancelledCount ? (
                          <span className="is-red" title={`${cancelledCount} cancelada(s)`} />
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="gestao-presencas__panel gestao-presencas__panel--day">
            <header className="gestao-presencas__panel-header">
              <div>
                <h3>Aulas de Hoje</h3>
                <p>{formatLongDate(selectedDate)}</p>
              </div>
            </header>

            {loading ? (
              <div className="gestao-presencas__empty-state">Carregando aulas do dia...</div>
            ) : groupedSelectedLessons.length ? (
              <div className="gestao-presencas__teacher-groups">
                {groupedSelectedLessons.map((group) => (
                  <section key={group.teacherLabel} className="gestao-presencas__teacher-group">
                    <header className="gestao-presencas__teacher-header">
                      <h4>{group.teacherLabel}</h4>
                    </header>

                    <div className="gestao-presencas__lesson-list">
                      {group.lessons.map((lesson) => {
                        const classItem = classMap.get(lesson.class_id);
                        const status = getLessonStatusPresentation(lesson);
                        const markPresenceDisabled =
                          savingLessonId === lesson.id ||
                          lesson.status_id === 2 ||
                          lesson.status_id === 3;

                        return (
                          <article key={lesson.id} className="gestao-presencas__lesson-card">
                            <div className="gestao-presencas__lesson-main">
                              <div className="gestao-presencas__lesson-copy">
                                <strong>{classItem?.name || `Turma #${lesson.class_id}`}</strong>
                                <p className="gestao-presencas__lesson-time">
                                  <img src={clockIcon} alt="" aria-hidden="true" />
                                  <span>{formatTime(lesson.lesson_date)}</span>
                                </p>
                                <span
                                  className={`gestao-presencas__status gestao-presencas__status--${status.tone}`}
                                >
                                  {status.label}
                                </span>
                                {lesson.requested_lesson_date ? (
                                  <p className="is-muted">
                                    Novo horário proposto:{" "}
                                    {formatShortDateTime(lesson.requested_lesson_date)}
                                  </p>
                                ) : null}
                              </div>

                              <div className="gestao-presencas__lesson-side">
                                <div className="gestao-presencas__lesson-actions">
                                  <button
                                    type="button"
                                    className="gestao-presencas__action gestao-presencas__action--success"
                                    disabled={markPresenceDisabled}
                                    onClick={() => void handleMarkPresence(lesson)}
                                  >
                                    {lesson.status_id === 2 ? "Presença registrada" : "Marcar presença"}
                                  </button>
                                  <button
                                    type="button"
                                    className="gestao-presencas__action gestao-presencas__action--warning"
                                    disabled={savingLessonId === lesson.id}
                                    onClick={() => openRescheduleModal(lesson)}
                                  >
                                    Reagendar aula
                                  </button>
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="gestao-presencas__empty-state">
                Nenhuma aula encontrada para o dia selecionado.
              </div>
            )}
          </section>
        </div>

        <section className="gestao-presencas__panel">
          <header className="gestao-presencas__panel-header">
            <div className="gestao-presencas__pending-heading">
              <img src={warningIcon} alt="" aria-hidden="true" />
              <div>
              <h3>Solicitações Pendentes</h3>
              <p>Aulas aguardando aprovação de novo horário.</p>
              </div>
            </div>
          </header>

          {pendingReschedules.length ? (
            <div className="gestao-presencas__pending-list">
              {pendingReschedules.map((lesson) => {
                const classItem = classMap.get(lesson.class_id);
                const teacherLabel = getTeacherLabel(lesson, classItem?.teacher_id, professorNames);

                return (
                  <article key={lesson.id} className="gestao-presencas__pending-card">
                    <div className="gestao-presencas__pending-copy">
                      <div className="gestao-presencas__pending-title">
                        <img src={warningIcon} alt="" aria-hidden="true" />
                        <div>
                          <strong>{classItem?.name || `Turma #${lesson.class_id}`}</strong>
                          <span>{teacherLabel}</span>
                        </div>
                      </div>

                      <div className="gestao-presencas__pending-dates">
                        <div>
                          <small>Data original</small>
                          <strong>{formatShortDateTime(lesson.original_lesson_date || lesson.lesson_date)}</strong>
                        </div>
                        <div>
                          <small>Novo horário</small>
                          <strong>{formatShortDateTime(lesson.requested_lesson_date)}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="gestao-presencas__pending-actions">
                      <button
                        type="button"
                        className="gestao-presencas__action gestao-presencas__action--ghost"
                        disabled={savingLessonId === lesson.id}
                        onClick={() => openRescheduleModal(lesson)}
                      >
                        Alterar
                      </button>
                      <button
                        type="button"
                        className="gestao-presencas__action gestao-presencas__action--success"
                        disabled={savingLessonId === lesson.id}
                        onClick={() => void handleApproveReschedule(lesson)}
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        className="gestao-presencas__action gestao-presencas__action--danger"
                        disabled={savingLessonId === lesson.id}
                        onClick={() => void handleRejectReschedule(lesson)}
                      >
                        Recusar
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="gestao-presencas__empty-state">
              Nenhuma solicitação de reagendamento aguardando decisão.
            </div>
          )}
        </section>

        <section className="gestao-presencas__stats">
          <StatCard
            title="Aulas no dia"
            value={String(stats.dayLessons)}
            detail={selectedDate === todayIso ? "Agenda de hoje" : "Agenda da data selecionada"}
            secondaryDetail={formatLongDate(selectedDate)}
            icon={clockIcon}
            tone="blue"
          />
          <StatCard
            title="Presenças registradas"
            value={`${stats.completed}/${stats.dayLessons || 0}`}
            detail={
              stats.dayLessons
                ? `${Math.round((stats.completed / stats.dayLessons) * 100)}% das aulas marcadas`
                : "Nenhuma aula concluída nesta data"
            }
            secondaryDetail="Status realizada"
            icon={calendarIcon}
            tone="green"
          />
          <StatCard
            title="Reagendamentos"
            value={String(stats.pendingApproval)}
            detail="Aguardando aprovação"
            secondaryDetail="Solicitações ativas no sistema"
            icon={warningIcon}
            tone="yellow"
          />
        </section>

        {rescheduleModal ? (
          <div
            className="gestao-presencas__modal-backdrop"
            onClick={() => setRescheduleModal(null)}
          >
            <div
              className="gestao-presencas__modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="gestao-presencas__modal-header">
                <div>
                  <h3>Reagendar aula</h3>
                  <p>
                    {classMap.get(rescheduleModal.lesson.class_id)?.name ||
                      `Turma #${rescheduleModal.lesson.class_id}`}
                  </p>
                </div>
                <button type="button" onClick={() => setRescheduleModal(null)}>
                  ×
                </button>
              </div>

              <form className="gestao-presencas__modal-form" onSubmit={handleSubmitReschedule}>
                <div className="gestao-presencas__modal-grid">
                  <label>
                    <span>Nova data</span>
                    <input
                      type="date"
                      value={rescheduleModal.date}
                      onChange={(event) =>
                        setRescheduleModal((current) =>
                          current
                            ? {
                                ...current,
                                date: event.target.value,
                              }
                            : current
                        )
                      }
                      required
                    />
                  </label>

                  <label>
                    <span>Novo horário</span>
                    <input
                      type="time"
                      value={rescheduleModal.time}
                      onChange={(event) =>
                        setRescheduleModal((current) =>
                          current
                            ? {
                                ...current,
                                time: event.target.value,
                              }
                            : current
                        )
                      }
                      required
                    />
                  </label>
                </div>

                <div className="gestao-presencas__modal-note">
                  O horário atual é preenchido automaticamente para acelerar o reagendamento.
                </div>

                <div className="gestao-presencas__modal-actions">
                  <button type="button" onClick={() => setRescheduleModal(null)}>
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="is-primary"
                    disabled={savingLessonId === rescheduleModal.lesson.id}
                  >
                    Salvar solicitação
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </GestaoShell>
  );
}
