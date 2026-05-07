import { Fragment, useEffect, useMemo, useState } from "react";
import GestaoShell from "../components/gestao/GestaoShell";
import ClassModal, {
  type ClassFormValues,
} from "../components/gestao/ClassModal";
import ClassStudentsModal from "../components/gestao/ClassStudentsModal";
import TeacherAssignmentModal from "../components/gestao/TeacherAssignmentModal";

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
  fetchLessonsByClass,
  type Lesson,
} from "../services/lessons";
import { useGestaoData } from "../context/GestaoDataContext";

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

export default function GestaoTurmasPage() {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [teacherClass, setTeacherClass] = useState<Class | null>(null);
  const [studentClass, setStudentClass] = useState<Class | null>(null);
  const [expandedClassId, setExpandedClassId] = useState<number | null>(null);
  const [detailsLoadingId, setDetailsLoadingId] = useState<number | null>(null);
  const [classStudentsLoadingId, setClassStudentsLoadingId] = useState<number | null>(null);
  const [studentCounts, setStudentCounts] = useState<Record<number, number>>({});
  const [detailsByClass, setDetailsByClass] = useState<Record<number, ClassDetails>>({});
  const {
    classes,
    professors,
    allProfessors,
    students,
    hasLoadedClasses,
    hasLoadedProfessors,
    hasLoadedAllProfessors,
    hasLoadedStudents,
    loadClasses,
    loadProfessors,
    loadAllProfessors,
    loadStudents,
    upsertClass,
    removeClass,
    invalidateStudentClassLinks,
  } = useGestaoData();

  async function load() {
    try {
      await Promise.all([
        loadClasses(),
        loadProfessors(),
        loadAllProfessors(),
      ]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (hasLoadedClasses && hasLoadedProfessors && hasLoadedAllProfessors) {
      setLoading(false);
      void load();
      return;
    }

    setLoading(true);
    void load();
  }, [hasLoadedAllProfessors, hasLoadedClasses, hasLoadedProfessors]);

  useEffect(() => {
    if (!classes.length) return;

    const classIdsWithoutCount = classes
      .map((classItem) => classItem.id)
      .filter((classId) => studentCounts[classId] === undefined);

    if (!classIdsWithoutCount.length) return;

    let cancelled = false;

    void Promise.allSettled(
      classIdsWithoutCount.map(async (classId) => {
        const classStudents = await fetchClassStudents(classId);
        return {
          classId,
          count: classStudents.length,
        };
      })
    ).then((results) => {
      if (cancelled) return;

      const nextCounts: Record<number, number> = {};

      results.forEach((result) => {
        if (result.status !== "fulfilled") return;
        nextCounts[result.value.classId] = result.value.count;
      });

      if (Object.keys(nextCounts).length) {
        setStudentCounts((current) => ({
          ...current,
          ...nextCounts,
        }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [classes, studentCounts]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return classes.filter((c) =>
      c.name.toLowerCase().includes(term)
    );
  }, [classes, search]);

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
    setStudentCounts((current) => {
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

  async function handleToggleExpand(classItem: Class) {
    if (expandedClassId === classItem.id) {
      setExpandedClassId(null);
      return;
    }

    setExpandedClassId(classItem.id);

    if (detailsByClass[classItem.id]?.lessonsLoaded) return;

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
      setStudentCounts((current) => ({
        ...current,
        [classItem.id]: students.length,
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
      setStudentCounts((current) => ({
        ...current,
        [classItem.id]: students.length,
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
    setStudentCounts((current) => ({
      ...current,
      [classId]: refreshedStudents.length,
    }));
    invalidateStudentClassLinks();

    setFeedback("Vínculos de alunos atualizados com sucesso.");
  }

  function formatLessonDate(dateValue: string) {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return dateValue;

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  }

  return (
    <GestaoShell title="Turmas">
      <section className="gestao-professores">
        {feedback ? (
          <div className="gestao-turmas__feedback">
            <p>{feedback}</p>
            <button type="button" onClick={() => setFeedback("")}>
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
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="gestao-professores__empty">
                      Carregando...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="gestao-professores__empty">
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
                              <button type="button" onClick={() => void handleManageStudents(c)}>
                                <img src={userPlusIcon} alt="Gerenciar alunos" />
                              </button>
                              <span className="gestao-turmas__students-count">
                                {studentCounts[c.id] ?? "—"}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="gestao-professores__actions">
                              <button type="button" onClick={() => handleToggleExpand(c)}>
                                <img
                                  src={eyeIcon}
                                  alt={isExpanded ? "Ocultar detalhes da turma" : "Visualizar turma"}
                                />
                              </button>

                              <button type="button" onClick={() => setEditingClass(c)}>
                                <img src={pencilIcon} alt="Editar turma" />
                              </button>

                              <button type="button" onClick={() => setTeacherClass(c)}>
                                <img src={teacherIcon} alt="Alterar professor" />
                              </button>

                              <button type="button" onClick={() => handleDelete(c.id)}>
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
                            <td colSpan={6}>
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
                                              <div>
                                                <strong>{formatLessonDate(lesson.lesson_date)}</strong>
                                                <span>
                                                  {lesson.subject?.trim()
                                                    ? lesson.subject
                                                    : "Assunto ainda nao definido"}
                                                </span>
                                              </div>
                                              <span className="gestao-turmas__status-pill">
                                                {lesson.status_name ?? `Status ${lesson.status_id}`}
                                              </span>
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
          initialValues={
            editingClass
              ? {
                  name: editingClass.name,
                  teacher_id: editingClass.teacher_id ? String(editingClass.teacher_id) : "",
                  recurrence_desc: editingClass.recurrence_desc,
                  recurrence_json: editingClass.recurrence_json,
                }
              : undefined
          }
          onClose={() => setEditingClass(null)}
          onSubmit={handleEdit}
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
            (studentClass ? classStudentsLoadingId === studentClass.id : false) ||
            !hasLoadedStudents
          }
          onClose={() => setStudentClass(null)}
          onSubmit={handleStudentAssignments}
        />
      </section>
    </GestaoShell>
  );
}
