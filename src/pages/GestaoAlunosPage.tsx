import { Fragment, useEffect, useMemo, useState } from "react";
import GestaoShell from "../components/gestao/GestaoShell";
import StudentModal, {
  type StudentFormValues,
} from "../components/gestao/StudentModal";
import ClassModal, {
  type ClassFormValues,
} from "../components/gestao/ClassModal";
import { useGestaoData } from "../context/GestaoDataContext";
import {
  createStudent,
  deleteStudent,
  fetchStudentClasses,
  type StudentRow,
  updateStudent,
} from "../services/students";
import { fetchLessonsByClass, type Lesson } from "../services/lessons";
import {
  createPrivateClassFromStudent,
  type Class,
} from "../services/classes";
import calendarIcon from "../assets/icons/calendar-check-svgrepo-com.svg";
import pencilIcon from "../assets/icons/pencil-svgrepo-com.svg";
import trashIcon from "../assets/icons/trash-alt-svgrepo-com.svg";
import eyeIcon from "../assets/icons/eye-show-svgrepo-com.svg";
import studentIcon from "../assets/icons/student-svgrepo-com.svg";
import "./GestaoAlunosPage.css";

type StudentClassesState = Record<number, Class[]>;
type LessonState = Record<number, Lesson[]>;

export default function GestaoAlunosPage() {
  const {
    students,
    allProfessors,
    studentClassLinksVersion,
    hasLoadedStudents,
    hasLoadedAllProfessors,
    loadClasses,
    loadStudents,
    loadAllProfessors,
    upsertStudent,
    removeStudent,
    invalidateStudentClassLinks,
  } = useGestaoData();

  const [search, setSearch] = useState("");
  const [alphabeticalOrder, setAlphabeticalOrder] = useState<"az" | "za">("az");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [classSourceStudent, setClassSourceStudent] = useState<StudentRow | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [timelineCollapsed, setTimelineCollapsed] = useState(false);
  const [classesCollapsed, setClassesCollapsed] = useState(false);
  const [studentClasses, setStudentClasses] = useState<StudentClassesState>({});
  const [classesLoadingStudentId, setClassesLoadingStudentId] = useState<number | null>(null);
  const [expandedClassId, setExpandedClassId] = useState<number | null>(null);
  const [classLessons, setClassLessons] = useState<LessonState>({});
  const [lessonsLoadingClassId, setLessonsLoadingClassId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        await Promise.all([
          loadStudents(),
          loadAllProfessors(),
        ]);
      } finally {
        setLoading(false);
      }
    }

    if (hasLoadedStudents && hasLoadedAllProfessors) {
      setLoading(false);
      void loadStudents();
      void loadAllProfessors();
      return;
    }

    setLoading(true);
    void load();
  }, [hasLoadedAllProfessors, hasLoadedStudents]);

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();

    const bySearch = term
      ? students.filter((student) => student.nome.toLowerCase().includes(term))
      : students;

    return [...bySearch].sort((left, right) => {
      const comparison = left.nome.localeCompare(right.nome);
      return alphabeticalOrder === "az" ? comparison : comparison * -1;
    });
  }, [alphabeticalOrder, search, students]);

  const activeStudents = useMemo(
    () => filteredStudents.filter((student) => student.status === "ativo"),
    [filteredStudents]
  );

  const inactiveStudents = useMemo(
    () => filteredStudents.filter((student) => student.status === "inativo"),
    [filteredStudents]
  );

  useEffect(() => {
    if (!filteredStudents.length) {
      setSelectedStudentId(null);
      return;
    }

    if (!selectedStudentId || !filteredStudents.some((item) => item.id === selectedStudentId)) {
      setSelectedStudentId(filteredStudents[0].id);
    }
  }, [filteredStudents, selectedStudentId]);

  const selectedStudent = useMemo(() => {
    return filteredStudents.find((student) => student.id === selectedStudentId) ?? null;
  }, [filteredStudents, selectedStudentId]);

  const professorNames = useMemo(() => {
    return new Map(allProfessors.map((professor) => [professor.id, professor.nome]));
  }, [allProfessors]);

  async function loadStudentClasses(studentID: number, options?: { force?: boolean }) {
    const force = options?.force ?? false;

    if (!force && studentClasses[studentID]) return;

    setClassesLoadingStudentId(studentID);
    try {
      const data = await fetchStudentClasses(studentID);
      setStudentClasses((current) => ({
        ...current,
        [studentID]: data,
      }));
    } finally {
      setClassesLoadingStudentId(null);
    }
  }

  useEffect(() => {
    if (!selectedStudentId || classesCollapsed) return;
    void loadStudentClasses(selectedStudentId);
  }, [classesCollapsed, selectedStudentId]);

  useEffect(() => {
    setStudentClasses({});
    setExpandedClassId(null);
    setClassLessons({});
  }, [studentClassLinksVersion]);

  useEffect(() => {
    if (!selectedStudentId || classesCollapsed) return;
    void loadStudentClasses(selectedStudentId, { force: true });
  }, [classesCollapsed, selectedStudentId, studentClassLinksVersion]);

  async function handleCreate(values: StudentFormValues) {
    const created = await createStudent({
      nome: values.nome,
      ...(values.nascimento ? { nascimento: `${values.nascimento}T00:00:00Z` } : {}),
    });

    upsertStudent(created);
    setSelectedStudentId(created.id);
  }

  async function handleEdit(values: StudentFormValues) {
    if (!editingStudent) return;

    const updated = await updateStudent(editingStudent.id, {
      nome: values.nome,
      ...(values.nascimento ? { nascimento: `${values.nascimento}T00:00:00Z` } : {}),
    });

    upsertStudent(updated);
    setEditingStudent(null);
  }

  async function handleDelete(student: StudentRow) {
    const confirmed = window.confirm(`Deseja desativar o aluno ${student.nome}?`);
    if (!confirmed) return;

    await deleteStudent(student.id);
    removeStudent(student.id);
  }

  async function handleCreateClassFromStudent(values: ClassFormValues) {
    if (!classSourceStudent) return;

    await createPrivateClassFromStudent({
      student_id: classSourceStudent.id,
      name: values.name,
      teacher_id: values.teacher_id ? Number(values.teacher_id) : null,
      recurrence_desc: values.recurrence_desc,
      recurrence_json: values.recurrence_json,
    });

    invalidateStudentClassLinks();
    await Promise.all([
      loadClasses({ force: true }),
      loadStudents({ force: true }),
      loadStudentClasses(classSourceStudent.id, { force: true }),
    ]);
    setExpandedClassId(null);
    setClassLessons({});
    setClassSourceStudent(null);
  }

  async function handleToggleClass(classItem: Class) {
    if (expandedClassId === classItem.id) {
      setExpandedClassId(null);
      return;
    }

    setExpandedClassId(classItem.id);

    if (classLessons[classItem.id]) return;

    setLessonsLoadingClassId(classItem.id);
    try {
      const lessons = await fetchLessonsByClass(classItem.id);
      setClassLessons((current) => ({
        ...current,
        [classItem.id]: lessons,
      }));
    } finally {
      setLessonsLoadingClassId(null);
    }
  }

  function formatDate(value?: string) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("pt-BR").format(date);
  }

  function formatDateTime(value?: string) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  }

  function formatAge(value?: string) {
    if (!value) return "—";

    const birthDate = new Date(value);
    if (Number.isNaN(birthDate.getTime())) return "—";

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    const dayDifference = today.getDate() - birthDate.getDate();

    if (monthDifference < 0 || (monthDifference === 0 && dayDifference < 0)) {
      age -= 1;
    }

    return age >= 0 ? `${age} anos` : "—";
  }

  const classesForSelectedStudent = selectedStudent ? studentClasses[selectedStudent.id] ?? [] : [];

  function toggleAlphabeticalOrder() {
    setAlphabeticalOrder((current) => (current === "az" ? "za" : "az"));
  }

  function renderStudentTable(title: string, items: StudentRow[], emptyMessage: string) {
    return (
      <section className="gestao-professores__table-card">
        <div className="gestao-professores__table-header">
          <h3>{title}</h3>
        </div>

        <div className="gestao-professores__table-wrapper">
          <table className="gestao-professores__table">
            <thead>
              <tr>
                <th>ID</th>
                <th>
                  <div className="gestao-alunos__name-header">
                    <span>Nome</span>
                    <button
                      type="button"
                      className="gestao-alunos__sort-button"
                      onClick={toggleAlphabeticalOrder}
                      aria-label={`Ordenar nomes em ${alphabeticalOrder === "az" ? "ordem decrescente" : "ordem crescente"}`}
                    >
                      {alphabeticalOrder === "az" ? "↑" : "↓"}
                    </button>
                  </div>
                </th>
                <th>Idade</th>
                <th>Turma</th>
                <th>Responsável</th>
                <th>Status</th>
                <th>Data Matrícula</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="gestao-professores__empty">
                    Carregando alunos...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="gestao-professores__empty">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                items.map((student) => (
                  <tr
                    key={student.id}
                    className={selectedStudentId === student.id ? "gestao-alunos__row is-selected" : "gestao-alunos__row"}
                    onClick={() => setSelectedStudentId(student.id)}
                  >
                    <td>{student.code}</td>
                    <td>{student.nome}</td>
                    <td>{formatAge(student.nascimento)}</td>
                    <td>
                      <div className="gestao-alunos__count-cell">
                        <span>{student.classesCount ?? 0}</span>
                        <button
                          type="button"
                          className="gestao-alunos__icon-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setClassSourceStudent(student);
                          }}
                          title="Criar turma a partir deste aluno"
                        >
                          <img src={studentIcon} alt="Criar turma a partir do aluno" />
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="gestao-alunos__contact-cell">
                        <span>{student.responsavel || "—"}</span>
                        <span>{student.responsavelTelefone || "—"}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`gestao-alunos__status gestao-alunos__status--${student.status}`}>
                        {student.status}
                      </span>
                    </td>
                    <td>
                      <div className="gestao-alunos__date-cell">
                        <img src={calendarIcon} alt="" aria-hidden="true" />
                        <span>{formatDate(student.created_at)}</span>
                      </div>
                    </td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <div className="gestao-professores__actions">
                        <button type="button" onClick={() => setSelectedStudentId(student.id)}>
                          <img src={eyeIcon} alt="Ver aluno" />
                        </button>
                        <button type="button" onClick={() => setEditingStudent(student)}>
                          <img src={pencilIcon} alt="Editar aluno" />
                        </button>
                        <button type="button" onClick={() => handleDelete(student)}>
                          <img
                            className="gestao-professores__trash-icon"
                            src={trashIcon}
                            alt="Desativar aluno"
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <GestaoShell title="Alunos">
      <section className="gestao-alunos">
        <div className="gestao-professores__header">
          <div>
            <h2>Cadastro de Alunos</h2>
            <p>Gerencie informações e histórico de alunos</p>
          </div>

          <button
            type="button"
            className="gestao-professores__create-button"
            onClick={() => setCreateOpen(true)}
          >
            <span>＋</span>
            Novo Aluno
          </button>
        </div>

        <div className="gestao-professores__search-card">
          <input
            type="text"
            placeholder="Buscar por nome do aluno..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {renderStudentTable("Alunos Ativos", activeStudents, "Nenhum aluno ativo encontrado.")}

        <section className="gestao-alunos__panel-card">
          <button
            type="button"
            className="gestao-alunos__collapse-header"
            onClick={() => setTimelineCollapsed((current) => !current)}
          >
            <div>
              <h3>Histórico e Timeline</h3>
              <p>Espaço preparado para auditoria futura do aluno</p>
            </div>
            <span>{timelineCollapsed ? "+" : "−"}</span>
          </button>

          {!timelineCollapsed ? (
            <div className="gestao-alunos__placeholder-body">
              <p>Nenhum evento de auditoria disponível por enquanto.</p>
            </div>
          ) : null}
        </section>

        <section className="gestao-alunos__panel-card">
          <button
            type="button"
            className="gestao-alunos__collapse-header"
            onClick={() => setClassesCollapsed((current) => !current)}
          >
            <div>
              <h3>Turmas do Aluno</h3>
              <p>Todas as turmas vinculadas, inclusive inativas</p>
            </div>
            <span>{classesCollapsed ? "+" : "−"}</span>
          </button>

          {!classesCollapsed ? (
            classesLoadingStudentId === selectedStudentId ? (
              <div className="gestao-alunos__placeholder-body">
                <p>Carregando turmas do aluno...</p>
              </div>
            ) : classesForSelectedStudent.length ? (
              <div className="gestao-alunos__class-list">
                {classesForSelectedStudent.map((classItem) => {
                  const isExpanded = expandedClassId === classItem.id;
                  const lessons = classLessons[classItem.id] ?? [];

                  return (
                    <Fragment key={classItem.id}>
                      <button
                        type="button"
                        className="gestao-alunos__class-row"
                        onClick={() => handleToggleClass(classItem)}
                      >
                        <div>
                          <strong>{classItem.name}</strong>
                          <span>{classItem.recurrence_desc || "Sem recorrência informada"}</span>
                        </div>
                        <div className="gestao-alunos__class-meta">
                          <span>
                            {classItem.teacher_id
                              ? professorNames.get(classItem.teacher_id) ?? ""
                              : "Sem professor"}
                          </span>
                          <span className={classItem.deleted_at ? "is-inactive" : "is-active"}>
                            {classItem.deleted_at ? "inativa" : "ativa"}
                          </span>
                        </div>
                      </button>

                      {isExpanded ? (
                        <div className="gestao-alunos__lesson-box">
                          {lessonsLoadingClassId === classItem.id ? (
                            <p>Carregando aulas da turma...</p>
                          ) : lessons.length ? (
                            <ul className="gestao-alunos__lesson-list">
                              {lessons.map((lesson) => (
                                <li key={lesson.id}>
                                  <div>
                                    <strong>{formatDateTime(lesson.lesson_date)}</strong>
                                    <span>
                                      {lesson.subject?.trim()
                                        ? lesson.subject
                                        : "Assunto ainda não definido"}
                                    </span>
                                  </div>
                                  <span className="gestao-turmas__status-pill">
                                    {lesson.status_name ?? `Status ${lesson.status_id}`}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p>Nenhuma aula cadastrada para esta turma.</p>
                          )}
                        </div>
                      ) : null}
                    </Fragment>
                  );
                })}
              </div>
            ) : (
              <div className="gestao-alunos__placeholder-body">
                <p>Nenhuma turma vinculada a este aluno.</p>
              </div>
            )
          ) : null}
        </section>

        {renderStudentTable("Alunos Inativos", inactiveStudents, "Nenhum aluno inativo encontrado.")}

        <StudentModal
          open={createOpen}
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
        />

        <StudentModal
          open={Boolean(editingStudent)}
          mode="edit"
          initialValues={
            editingStudent
              ? {
                  nome: editingStudent.nome,
                  nascimento: editingStudent.nascimento?.slice(0, 10) ?? "",
                }
              : undefined
          }
          onClose={() => setEditingStudent(null)}
          onSubmit={handleEdit}
        />

        <ClassModal
          open={Boolean(classSourceStudent)}
          mode="create"
          professors={allProfessors}
          initialValues={
            classSourceStudent
              ? {
                  name: `Turma ${classSourceStudent.nome}`,
                  teacher_id: "",
                  recurrence_desc: "",
                  recurrence_json: "",
                }
              : undefined
          }
          onClose={() => setClassSourceStudent(null)}
          onSubmit={handleCreateClassFromStudent}
        />
      </section>
    </GestaoShell>
  );
}
