import axios from "axios";
import { Fragment, useEffect, useMemo, useState } from "react";
import GestaoShell from "../components/gestao/GestaoShell";
import ClassModal, {
  type ClassFormValues,
} from "../components/gestao/ClassModal";
import ClassStudentsModal from "../components/gestao/ClassStudentsModal";
import TeacherAssignmentModal from "../components/gestao/TeacherAssignmentModal";
import LessonEditorModal from "../components/gestao/LessonEditorModal";

import {
  addStudent,
  createClass,
  deleteClass,
  fetchClassStudents,
  type Class,
  type ClassStudent,
  removeStudent as removeStudentFromClass,
  updateClass,
} from "../services/classes";
import {
} from "../services/professors";
import {
  addStudentToLesson,
  createLesson,
  deleteLesson,
  fetchLessonStudents,
  fetchLessonStatuses,
  fetchLessonsByClass,
  removeStudentFromLesson,
  type Lesson,
  type LessonPayload,
  type LessonStatusOption,
  updateLesson,
  updateLessonStatus,
} from "../services/lessons";
import { useGestaoData } from "../context/GestaoDataContext";
import { getLessonStatusPresentation } from "../utils/lessonStatus";
import type { StudentRow } from "../services/students";

import eyeIcon from "../assets/icons/eye-show-svgrepo-com.svg";
import pencilIcon from "../assets/icons/pencil-svgrepo-com.svg";
import trashIcon from "../assets/icons/trash-alt-svgrepo-com.svg";
import teacherIcon from "../assets/icons/teacher-professor-avatar-svgrepo-com.svg";
import userPlusIcon from "../assets/icons/user-plus-alt-1-svgrepo-com.svg";

import "./GestaoTurmasPage.css";

type ClassDetails = {
  students: ClassStudent[];
  lessons: Lesson[];
  lessonsLoaded: boolean;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const apiMessage =
      typeof error.response?.data === "string"
        ? error.response.data
        : typeof error.response?.data?.error === "string"
        ? error.response.data.error
        : typeof error.response?.data?.erro === "string"
        ? error.response.data.erro
        : typeof error.message === "string"
        ? error.message
        : "";

    return apiMessage || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function buildClassAddress(values: ClassFormValues) {
  const hasAddress =
    values.cep.trim() ||
    values.rua.trim() ||
    values.numero.trim() ||
    values.bairro.trim() ||
    values.cidade.trim() ||
    values.estado.trim() ||
    values.complemento.trim();

  if (!hasAddress) return undefined;

  return {
    cep: values.cep.trim(),
    rua: values.rua.trim(),
    numero: values.numero.trim(),
    bairro: values.bairro.trim(),
    cidade: values.cidade.trim(),
    estado: values.estado.trim(),
    pais: values.pais.trim() || "Brasil",
    complemento: values.complemento.trim(),
  };
}

export default function GestaoTurmasPage() {
  const [search, setSearch] = useState("");
  const [lessonOrder, setLessonOrder] = useState<"name" | "closest" | "farthest">("name");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [teacherClass, setTeacherClass] = useState<Class | null>(null);
  const [studentClass, setStudentClass] = useState<Class | null>(null);
  const [expandedClassId, setExpandedClassId] = useState<number | null>(null);
  const [detailsLoadingId, setDetailsLoadingId] = useState<number | null>(null);
  const [classStudentsLoadingId, setClassStudentsLoadingId] = useState<number | null>(null);
  const [lessonStudentsLoading, setLessonStudentsLoading] = useState(false);
  const [detailsByClass, setDetailsByClass] = useState<Record<number, ClassDetails>>({});
  const [lessonStatuses, setLessonStatuses] = useState<LessonStatusOption[]>([]);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonStudents, setLessonStudents] = useState<Record<number, StudentRow[]>>({});
  const {
    classes,
    professors,
    allProfessors,
    students,
    loadClasses,
    loadProfessors,
    loadAllProfessors,
    loadStudents,
    upsertClass,
    removeClass,
    invalidateStudentClassLinks,
  } = useGestaoData();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setFeedback("");

      const [classesResult, professorsResult, allProfessorsResult, statusesResult] =
        await Promise.allSettled([
          loadClasses(),
          loadProfessors(),
          loadAllProfessors(),
          fetchLessonStatuses(),
        ]);

      if (cancelled) return;

      if (statusesResult.status === "fulfilled") {
        setLessonStatuses(statusesResult.value);
      }

      const classesFailed = classesResult.status === "rejected";
      const supportDataFailed =
        professorsResult.status === "rejected" ||
        allProfessorsResult.status === "rejected" ||
        statusesResult.status === "rejected";

      if (classesFailed) {
        console.error("Erro ao carregar turmas:", classesResult.reason);
        setFeedback(
          getErrorMessage(
            classesResult.reason,
            "Nao foi possível carregar as turmas cadastradas."
          )
        );
      } else if (supportDataFailed) {
        if (professorsResult.status === "rejected") {
          console.error("Erro ao carregar professores ativos:", professorsResult.reason);
        }
        if (allProfessorsResult.status === "rejected") {
          console.error("Erro ao carregar todos os professores:", allProfessorsResult.reason);
        }
        if (statusesResult.status === "rejected") {
          console.error("Erro ao carregar status de aulas:", statusesResult.reason);
        }

        setFeedback(
          "Alguns dados auxiliares nao puderam ser carregados. Exibindo as turmas disponíveis."
        );
      }

      if (!cancelled) {
        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [loadAllProfessors, loadClasses, loadProfessors]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    const base = classes.filter((c) =>
      c.name.toLowerCase().includes(term)
    );

    return [...base].sort((left, right) => {
      if (lessonOrder === "closest") {
        const leftRemaining = (left.lessons_total ?? 0) - (left.lessons_completed ?? 0);
        const rightRemaining = (right.lessons_total ?? 0) - (right.lessons_completed ?? 0);
        if (leftRemaining !== rightRemaining) return leftRemaining - rightRemaining;
      }

      if (lessonOrder === "farthest") {
        const leftRemaining = (left.lessons_total ?? 0) - (left.lessons_completed ?? 0);
        const rightRemaining = (right.lessons_total ?? 0) - (right.lessons_completed ?? 0);
        if (leftRemaining !== rightRemaining) return rightRemaining - leftRemaining;
      }

      return left.name.localeCompare(right.name);
    });
  }, [classes, lessonOrder, search]);

  const professorNames = useMemo(() => {
    return new Map(allProfessors.map((professor) => [professor.id, professor.nome]));
  }, [allProfessors]);

  async function handleDelete(id: number) {
    if (!confirm("Deseja encerrar a turma? As aulas em aberto serao canceladas.")) return;
    await deleteClass(id);
    removeClass(id);
    setDetailsByClass((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    if (expandedClassId === id) {
      setExpandedClassId(null);
    }
  }

  async function handleCreate(values: ClassFormValues) {
    const createdClass = await createClass({
      name: values.name,
      teacher_id: values.teacher_id ? Number(values.teacher_id) : null,
      recurrence_desc: values.recurrence_desc,
      recurrence_json: values.recurrence_json,
      endereco: buildClassAddress(values),
    });

    upsertClass(createdClass);

    const generatedLessonsCount = createdClass.generated_lessons_count ?? 0;
    setFeedback(
      generatedLessonsCount > 0
        ? `Turma criada com ${generatedLessonsCount} aulas geradas automaticamente.`
        : "Turma criada, mas nenhuma aula foi gerada automaticamente."
    );
  }

  async function handleEdit(values: ClassFormValues) {
    if (!editingClass) return;

    const updatedClass = await updateClass(editingClass.id, {
      name: values.name,
      teacher_id: values.teacher_id ? Number(values.teacher_id) : null,
      recurrence_desc: values.recurrence_desc,
      recurrence_json: values.recurrence_json,
      endereco: buildClassAddress(values),
    });

    const classId = editingClass.id;
    setEditingClass(null);
    upsertClass(updatedClass);
    setDetailsByClass((current) => {
      const next = { ...current };
      delete next[classId];
      return next;
    });
  }

  async function handleTeacherChange(teacherId: number | null) {
    if (!teacherClass) return;

    const updatedClass = await updateClass(teacherClass.id, {
      name: teacherClass.name,
      teacher_id: teacherId,
      recurrence_desc: teacherClass.recurrence_desc,
      recurrence_json: teacherClass.recurrence_json,
      endereco: teacherClass.endereco,
    });

    const classId = teacherClass.id;
    setTeacherClass(null);
    upsertClass(updatedClass);
    setDetailsByClass((current) => {
      const next = { ...current };
      delete next[classId];
      return next;
    });
  }

  async function handleCreateSingleLesson(payload: {
    class_id: number;
    teacher_id?: number | null;
    subject?: string;
    vocabulary?: string;
    balance?: string;
    notes?: string;
    lesson_date: string;
  }) {
    await createLesson(payload);

    const lessons = await fetchLessonsByClass(payload.class_id);
    setDetailsByClass((current) => ({
      ...current,
      [payload.class_id]: {
        students: current[payload.class_id]?.students ?? [],
        lessons,
        lessonsLoaded: true,
      },
    }));
    setFeedback("Aula avulsa adicionada com sucesso.");
  }

  async function refreshClassLessons(classId: number) {
    const lessons = await fetchLessonsByClass(classId);
    setDetailsByClass((current) => ({
      ...current,
      [classId]: {
        students: current[classId]?.students ?? [],
        lessons,
        lessonsLoaded: true,
      },
    }));
    return lessons;
  }

  async function handleCreateRecurringLessons(payloads: LessonPayload[]) {
    if (!payloads.length) return;
    await Promise.all(payloads.map((payload) => createLesson(payload)));
    await refreshClassLessons(payloads[0].class_id);
    setFeedback("Aulas extras adicionadas com sucesso.");
  }

  async function handleUpdateLesson(
    lessonId: number,
    payload: LessonPayload,
    statusId: number
  ) {
    await updateLesson(lessonId, payload);
    await updateLessonStatus(lessonId, statusId);

    setDetailsByClass((current) => {
      const optimisticLessons = (current[payload.class_id]?.lessons ?? []).map((lesson) =>
          lesson.id === lessonId
            ? {
                ...lesson,
                teacher_id: payload.teacher_id ?? null,
                subject: payload.subject,
                vocabulary: payload.vocabulary,
                balance: payload.balance,
                notes: payload.notes,
                lesson_date: payload.lesson_date,
                status_id: statusId,
                status_name:
                  lessonStatuses.find((status) => status.id === statusId)?.nome_status ??
                  lesson.status_name,
              }
            : lesson
      );

      return {
        ...current,
        [payload.class_id]: {
          students: current[payload.class_id]?.students ?? [],
          lessons: optimisticLessons,
          lessonsLoaded: true,
        },
      };
    });

    try {
      await refreshClassLessons(payload.class_id);
    } catch (error) {
      console.error("Erro ao sincronizar aulas após edição:", error);
    }
    setFeedback("Aula atualizada com sucesso.");
  }

  async function handleDeleteLesson(classId: number, lessonId: number) {
    await deleteLesson(lessonId);
    await refreshClassLessons(classId);
    setLessonStudents((current) => {
      const next = { ...current };
      delete next[lessonId];
      return next;
    });
    setFeedback("Aula removida com sucesso.");
  }

  async function handleOpenLessonEditor(classId: number, lesson: Lesson) {
    setEditingLesson(lesson);
    setLessonStudentsLoading(true);

    try {
      await loadStudents();
      const linkedStudents = await fetchLessonStudents(lesson.id);
      setLessonStudents((current) => ({
        ...current,
        [lesson.id]: linkedStudents,
      }));
      await refreshClassLessons(classId);
    } finally {
      setLessonStudentsLoading(false);
    }
  }

  async function handleAddStudentToLesson(lessonId: number, studentId: number) {
    await addStudentToLesson(lessonId, studentId);
    const linkedStudents = await fetchLessonStudents(lessonId);
    setLessonStudents((current) => ({
      ...current,
      [lessonId]: linkedStudents,
    }));
  }

  async function handleRemoveStudentFromLesson(lessonId: number, studentId: number) {
    await removeStudentFromLesson(lessonId, studentId);
    const linkedStudents = await fetchLessonStudents(lessonId);
    setLessonStudents((current) => ({
      ...current,
      [lessonId]: linkedStudents,
    }));
  }

  async function handleToggleExpand(classItem: Class) {
    if (expandedClassId === classItem.id) {
      setExpandedClassId(null);
      return;
    }

    setExpandedClassId(classItem.id);
    setDetailsLoadingId(classItem.id);

    try {
      const existingStudents = detailsByClass[classItem.id]?.students;
      const [students, lessons] = await Promise.all([
        existingStudents !== undefined
          ? Promise.resolve(existingStudents)
          : fetchClassStudents(classItem.id),
        fetchLessonsByClass(classItem.id),
      ]);

      setDetailsByClass((current) => ({
        ...current,
        [classItem.id]: {
          students,
          lessons,
          lessonsLoaded: true,
        },
      }));
    } catch (error) {
      console.error("Erro ao carregar detalhes da turma:", error);
      setDetailsByClass((current) => ({
        ...current,
        [classItem.id]: {
          students: current[classItem.id]?.students ?? [],
          lessons: [],
          lessonsLoaded: true,
        },
      }));
      setFeedback("Nao foi possível carregar todos os detalhes da turma. Exibindo os dados disponíveis.");
    } finally {
      setDetailsLoadingId(null);
    }
  }

  async function ensureClassStudentsLoaded(classItem: Class) {
    if (detailsByClass[classItem.id]?.students !== undefined) {
      return detailsByClass[classItem.id].students;
    }

    setClassStudentsLoadingId(classItem.id);

    try {
      const students = await fetchClassStudents(classItem.id);

      setDetailsByClass((current) => ({
        ...current,
        [classItem.id]: {
          students,
          lessons: current[classItem.id]?.lessons ?? [],
          lessonsLoaded: current[classItem.id]?.lessonsLoaded ?? false,
        },
      }));

      return students;
    } finally {
      setClassStudentsLoadingId(null);
    }
  }

  async function handleManageStudents(classItem: Class) {
    setStudentClass(classItem);
    await Promise.all([
      ensureClassStudentsLoaded(classItem),
      loadStudents(),
    ]);
  }

  async function handleStudentAssignments(studentIds: number[]) {
    if (!studentClass) return;

    const classId = studentClass.id;
    const currentStudentIds = detailsByClass[classId]?.students?.map((student) => student.id) ?? [];
    const idsToAdd = studentIds.filter((studentId) => !currentStudentIds.includes(studentId));
    const idsToRemove = currentStudentIds.filter((studentId) => !studentIds.includes(studentId));

    await Promise.all([
      ...idsToAdd.map((studentId) => addStudent(classId, studentId)),
      ...idsToRemove.map((studentId) => removeStudentFromClass(classId, studentId)),
    ]);

    const refreshedStudents = await fetchClassStudents(classId);

    setDetailsByClass((current) => ({
      ...current,
      [classId]: {
        students: refreshedStudents,
        lessons: current[classId]?.lessons ?? [],
        lessonsLoaded: current[classId]?.lessonsLoaded ?? false,
      },
    }));
    invalidateStudentClassLinks();

    setFeedback("Vínculos de alunos atualizados com sucesso.");
  }

  async function handleStartEditClass(classItem: Class) {
    setEditingClass(classItem);
    setDetailsLoadingId(classItem.id);

    try {
      const students = detailsByClass[classItem.id]?.students ?? await fetchClassStudents(classItem.id);
      const lessons = await fetchLessonsByClass(classItem.id);

      setDetailsByClass((current) => ({
        ...current,
        [classItem.id]: {
          students,
          lessons,
          lessonsLoaded: true,
        },
      }));
    } catch (error) {
      console.error("Erro ao preparar edição da turma:", error);
      setFeedback("Nao foi possível carregar as aulas atuais desta turma.");
    } finally {
      setDetailsLoadingId(null);
    }
  }

  function formatLessonDate(dateValue: string) {
    const normalized = dateValue.replace(" ", "T");
    const datePart = normalized.slice(0, 10);
    const timePart = normalized.slice(11, 16);
    const [year, month, day] = datePart.split("-");

    if (!year || !month || !day || !timePart) {
      return dateValue;
    }

    return `${day}/${month}/${year}, ${timePart}`;
  }

  return (
    <GestaoShell title="Turmas">
      <section className="gestao-professores">
        {feedback ? (
          <div className="gestao-turmas__feedback">
            <p>{feedback}</p>
            <button type="button" onClick={() => setFeedback("")} title="Fechar aviso" aria-label="Fechar aviso">
              ×
            </button>
          </div>
        ) : null}

        <div className="gestao-professores__header">
          <div>
            <h2>Gestão de Turmas</h2>
            <p>Gerencie turmas, horários e alunos vinculados</p>
          </div>

          <button
            type="button"
            className="gestao-professores__create-button"
            onClick={() => setCreateOpen(true)}
          >
            <span>＋</span>
            Nova Turma
          </button>
        </div>

        <div className="gestao-professores__search-card">
          <input
            type="text"
            placeholder="Buscar por nome da turma..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="gestao-turmas__order-select"
            value={lessonOrder}
            onChange={(event) =>
              setLessonOrder(event.target.value as "name" | "closest" | "farthest")
            }
          >
            <option value="name">Ordenar por nome</option>
            <option value="closest">Aulas próximas do máximo</option>
            <option value="farthest">Aulas distantes do máximo</option>
          </select>
        </div>

        <section className="gestao-professores__table-card">
          <div className="gestao-professores__table-header">
            <h3>Turmas Cadastradas</h3>
          </div>

          <div className="gestao-professores__table-wrapper">
            <table className="gestao-professores__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome da Turma</th>
                  <th>Horário</th>
                  <th>Professor</th>
                  <th>Alunos</th>
                  <th>Aulas</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="gestao-professores__empty">
                      Carregando...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="gestao-professores__empty">
                      Nenhuma turma encontrada
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => {
                    const details = detailsByClass[c.id];
                    const isExpanded = expandedClassId === c.id;

                    return (
                      <Fragment key={c.id}>
                        <tr className={isExpanded ? "gestao-turmas__row is-expanded" : "gestao-turmas__row"}>
                          <td>T{String(c.id).padStart(3, "0")}</td>
                          <td>{c.name}</td>
                          <td>{c.recurrence_desc || "Nao informado"}</td>
                          <td>
                            {c.teacher_id
                              ? professorNames.get(c.teacher_id) ?? ""
                              : ""}
                          </td>
                          <td>
                            <div className="gestao-turmas__students-cell">
                              <button type="button" onClick={() => void handleManageStudents(c)} title="Gerenciar alunos" aria-label="Gerenciar alunos">
                                <img src={userPlusIcon} alt="Gerenciar alunos" />
                              </button>
                              <span className="gestao-turmas__students-count">
                                {c.student_count ?? "—"}
                              </span>
                            </div>
                          </td>
                          <td>
                            {`${c.lessons_completed ?? 0}/${c.lessons_total ?? 0}`}
                          </td>
                          <td>
                            <div className="gestao-professores__actions">
                              <button type="button" onClick={() => handleToggleExpand(c)} title={isExpanded ? "Ocultar detalhes da turma" : "Visualizar turma"} aria-label={isExpanded ? "Ocultar detalhes da turma" : "Visualizar turma"}>
                                <img
                                  src={eyeIcon}
                                  alt={isExpanded ? "Ocultar detalhes da turma" : "Visualizar turma"}
                                />
                              </button>

                              <button type="button" onClick={() => void handleStartEditClass(c)} title="Editar turma" aria-label="Editar turma">
                                <img src={pencilIcon} alt="Editar turma" />
                              </button>

                              <button type="button" onClick={() => setTeacherClass(c)} title="Alterar professor" aria-label="Alterar professor">
                                <img src={teacherIcon} alt="Alterar professor" />
                              </button>

                              <button type="button" onClick={() => handleDelete(c.id)} title="Encerrar turma" aria-label="Encerrar turma">
                                <img
                                  className="gestao-professores__trash-icon"
                                  src={trashIcon}
                                  alt="Deletar turma"
                                />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded ? (
                          <tr className="gestao-turmas__details-row">
                            <td colSpan={7}>
                              <div className="gestao-turmas__details-card">
                                {detailsLoadingId === c.id ? (
                                  <p>Carregando detalhes da turma...</p>
                                ) : (
                                  <>
                                    <div className="gestao-turmas__detail-block">
                                      <h4>Professor designado</h4>
                                      <ul>
                                        <li>
                                          {c.teacher_id
                                            ? professorNames.get(c.teacher_id) ?? ""
                                            : "Sem professor designado"}
                                        </li>
                                      </ul>
                                    </div>

                                    <div className="gestao-turmas__detail-block">
                                      <h4>Alunos da turma</h4>
                                      {details?.students?.length ? (
                                        <ul className="gestao-turmas__detail-list">
                                          {details.students.map((student) => (
                                            <li key={student.id}>
                                              <strong>{student.nome}</strong>
                                              <span>{student.ativo ? "Ativo" : "Inativo"}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p>Nenhum aluno vinculado.</p>
                                      )}
                                    </div>

                                    <div className="gestao-turmas__detail-block">
                                      <h4>Aulas</h4>
                                      {details?.lessons?.length ? (
                                        <ul className="gestao-turmas__detail-list">
                                          {details.lessons.map((lesson) => (
                                            <li key={lesson.id}>
                                              <div className="gestao-turmas__lesson-main">
                                                <strong>{formatLessonDate(lesson.lesson_date)}</strong>
                                                <span>
                                                  {lesson.subject?.trim()
                                                    ? lesson.subject
                                                    : "Assunto ainda nao definido"}
                                                </span>
                                              </div>
                                              {(() => {
                                                const status = getLessonStatusPresentation(lesson);
                                                return (
                                                  <div className="gestao-turmas__lesson-side">
                                                    <span className={`gestao-turmas__status-pill is-${status.tone}`}>
                                                      {status.label}
                                                    </span>
                                                    <button
                                                      type="button"
                                                      className="gestao-turmas__lesson-action"
                                                      title="Editar aula"
                                                      aria-label="Editar aula"
                                                      onClick={() => void handleOpenLessonEditor(c.id, lesson)}
                                                    >
                                                      <img src={pencilIcon} alt="Editar aula" />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      className="gestao-turmas__lesson-action is-danger"
                                                      title="Excluir aula"
                                                      aria-label="Excluir aula"
                                                      onClick={() => void handleDeleteLesson(c.id, lesson.id)}
                                                    >
                                                      <img src={trashIcon} alt="Excluir aula" />
                                                    </button>
                                                  </div>
                                                );
                                              })()}
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p>Nenhuma aula cadastrada.</p>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <ClassModal
          open={createOpen}
          mode="create"
          professors={professors}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
        />

        <ClassModal
          open={Boolean(editingClass)}
          mode="edit"
          professors={professors}
          classId={editingClass?.id}
          initialValues={
            editingClass
              ? {
                  name: editingClass.name,
                  teacher_id: editingClass.teacher_id ? String(editingClass.teacher_id) : "",
                  recurrence_desc: editingClass.recurrence_desc,
                  recurrence_json: editingClass.recurrence_json,
                  cep: editingClass.endereco?.cep ?? "",
                  rua: editingClass.endereco?.rua ?? "",
                  numero: editingClass.endereco?.numero ?? "",
                  bairro: editingClass.endereco?.bairro ?? "",
                  cidade: editingClass.endereco?.cidade ?? "",
                  estado: editingClass.endereco?.estado ?? "",
                  pais: editingClass.endereco?.pais ?? "Brasil",
                  complemento: editingClass.endereco?.complemento ?? "",
                }
              : undefined
          }
          onClose={() => setEditingClass(null)}
          onSubmit={handleEdit}
          existingLessons={editingClass ? detailsByClass[editingClass.id]?.lessons ?? [] : []}
          lessonStatuses={lessonStatuses}
          onCreateSingleLesson={handleCreateSingleLesson}
          onCreateRecurringLessons={handleCreateRecurringLessons}
          onUpdateLesson={handleUpdateLesson}
          onDeleteLesson={(lessonId) =>
            editingClass
              ? handleDeleteLesson(editingClass.id, lessonId)
              : Promise.resolve()
          }
        />

        <TeacherAssignmentModal
          open={Boolean(teacherClass)}
          professors={professors}
          currentTeacherId={teacherClass?.teacher_id ?? null}
          className={teacherClass?.name ?? ""}
          onClose={() => setTeacherClass(null)}
          onSubmit={handleTeacherChange}
        />

        <ClassStudentsModal
          open={Boolean(studentClass)}
          className={studentClass?.name ?? ""}
          students={students}
          selectedStudentIds={
            studentClass
              ? (detailsByClass[studentClass.id]?.students ?? []).map((student) => student.id)
              : []
          }
          loading={
            studentClass ? classStudentsLoadingId === studentClass.id : false
          }
          onClose={() => setStudentClass(null)}
          onSubmit={handleStudentAssignments}
        />

        <LessonEditorModal
          open={Boolean(editingLesson)}
          lesson={editingLesson}
          professors={professors}
          lessonStatuses={lessonStatuses}
          allStudents={students}
          linkedStudents={editingLesson ? (lessonStudents[editingLesson.id] ?? []) : []}
          loadingStudents={lessonStudentsLoading}
          onClose={() => setEditingLesson(null)}
          onSave={async (lessonId, payload, statusId) => {
            await handleUpdateLesson(lessonId, payload, statusId);
            const refreshedLessons = await fetchLessonsByClass(payload.class_id);
            const refreshedLesson = refreshedLessons.find((item) => item.id === lessonId) ?? null;
            setEditingLesson(refreshedLesson);
          }}
          onAddStudent={handleAddStudentToLesson}
          onRemoveStudent={handleRemoveStudentFromLesson}
        />
      </section>
    </GestaoShell>
  );
}
