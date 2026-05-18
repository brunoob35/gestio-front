import { Fragment, useEffect, useMemo, useState } from "react";
import GestaoShell from "../components/gestao/GestaoShell";
import StudentModal, {
  type StudentFormValues,
} from "../components/gestao/StudentModal";
import ClassModal, {
  type ClassFormValues,
} from "../components/gestao/ClassModal";
import LessonEditorModal from "../components/gestao/LessonEditorModal";
import { useGestaoData } from "../context/GestaoDataContext";
import {
  createStudent,
  deleteStudent,
  fetchStudentClasses,
  type StudentRow,
  updateStudent,
} from "../services/students";
import {
  createCustomer,
  fetchCustomer,
  fetchCustomerAddresses,
  fetchCustomerStudents,
  updateCustomer,
} from "../services/customers";
import {
  addStudentToLesson,
  deleteLesson,
  fetchLessonStatuses,
  fetchLessonStudents,
  fetchLessonsByClass,
  type Lesson,
  type LessonPayload,
  type LessonStatusOption,
  removeStudentFromLesson,
  updateLesson,
  updateLessonStatus,
} from "../services/lessons";
import {
  createPrivateClassFromStudent,
  type Class,
} from "../services/classes";
import calendarIcon from "../assets/icons/calendar-check-svgrepo-com.svg";
import pencilIcon from "../assets/icons/pencil-svgrepo-com.svg";
import trashIcon from "../assets/icons/trash-alt-svgrepo-com.svg";
import eyeIcon from "../assets/icons/eye-show-svgrepo-com.svg";
import bookOpenIcon from "../assets/icons/book-open-svgrepo-com.svg";
import { getLessonStatusPresentation } from "../utils/lessonStatus";
import "./GestaoAlunosPage.css";

type StudentClassesState = Record<number, Class[]>;
type LessonState = Record<number, Lesson[]>;

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

export default function GestaoAlunosPage() {
  const {
    students,
    customers,
    allProfessors,
    studentClassLinksVersion,
    loadClasses,
    loadCustomers,
    loadStudents,
    loadAllProfessors,
    upsertStudent,
    upsertCustomer,
    removeStudent,
    invalidateStudentClassLinks,
  } = useGestaoData();

  const [search, setSearch] = useState("");
  const [alphabeticalOrder, setAlphabeticalOrder] = useState<"az" | "za">("az");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [classSourceStudent, setClassSourceStudent] = useState<StudentRow | null>(null);
  const [classSourceAddress, setClassSourceAddress] = useState<{
    cep: string;
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    pais: string;
    complemento: string;
  } | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [timelineCollapsed, setTimelineCollapsed] = useState(false);
  const [classesCollapsed, setClassesCollapsed] = useState(false);
  const [studentClasses, setStudentClasses] = useState<StudentClassesState>({});
  const [classesLoadingStudentId, setClassesLoadingStudentId] = useState<number | null>(null);
  const [expandedClassId, setExpandedClassId] = useState<number | null>(null);
  const [classLessons, setClassLessons] = useState<LessonState>({});
  const [lessonsLoadingClassId, setLessonsLoadingClassId] = useState<number | null>(null);
  const [lessonStatuses, setLessonStatuses] = useState<LessonStatusOption[]>([]);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonStudentsLoading, setLessonStudentsLoading] = useState(false);
  const [lessonStudents, setLessonStudents] = useState<Record<number, StudentRow[]>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [, , , statuses] = await Promise.all([
          loadStudents(),
          loadCustomers(),
          loadAllProfessors(),
          fetchLessonStatuses(),
        ]);
        if (!cancelled) {
          setLessonStatuses(statuses);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [loadAllProfessors, loadCustomers, loadStudents]);

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

  const classesForSelectedStudent = selectedStudent ? studentClasses[selectedStudent.id] ?? [] : [];

  const professorNames = useMemo(() => {
    return new Map(allProfessors.map((professor) => [professor.id, professor.nome]));
  }, [allProfessors]);

  function normalizeDigits(value?: string) {
    return String(value ?? "").replace(/\D/g, "");
  }

  function inferResponsibleCustomerId(student?: StudentRow | null) {
    if (!student?.responsavel) return "";

    const studentPhone = normalizeDigits(student.responsavelTelefone);
    const exactMatch = customers.find((customer) => {
      if (customer.nome !== student.responsavel) return false;
      if (!studentPhone) return true;
      return normalizeDigits(customer.telefone) === studentPhone;
    });

    if (exactMatch) return String(exactMatch.id);

    const uniqueByName = customers.filter((customer) => customer.nome === student.responsavel);
    return uniqueByName.length === 1 ? String(uniqueByName[0].id) : "";
  }

  async function handleOpenClassModalFromStudent(student: StudentRow) {
    setClassSourceStudent(student);
    setClassSourceAddress(null);

    const customerId = inferResponsibleCustomerId(student);
    if (!customerId) return;

    try {
      const addresses = await fetchCustomerAddresses(Number(customerId));
      const primaryAddress = addresses[0];
      if (!primaryAddress) return;

      setClassSourceAddress({
        cep: primaryAddress.cep ?? "",
        rua: primaryAddress.rua ?? "",
        numero: primaryAddress.numero ?? "",
        bairro: primaryAddress.bairro ?? "",
        cidade: primaryAddress.cidade ?? "",
        estado: primaryAddress.estado ?? "",
        pais: primaryAddress.pais || "Brasil",
        complemento: primaryAddress.complemento ?? "",
      });
    } catch (error) {
      console.error("Não foi possível carregar o endereço do responsável para a turma.", error);
    }
  }

  async function syncStudentResponsible(
    student: Pick<StudentRow, "id" | "nome" | "nascimento">,
    previousCustomerId?: number,
    nextCustomerId?: number
  ) {
    const targetPreviousId =
      previousCustomerId && previousCustomerId !== nextCustomerId ? previousCustomerId : undefined;
    const targetNextId = nextCustomerId || undefined;

    async function updateCustomerStudentsList(
      customerID: number,
      updater: (linkedStudents: StudentRow[]) => StudentRow[]
    ) {
      const [customer, linkedStudents, addresses] = await Promise.all([
        fetchCustomer(customerID),
        fetchCustomerStudents(customerID),
        fetchCustomerAddresses(customerID),
      ]);

      const nextStudents = updater(linkedStudents);

      await updateCustomer(customerID, {
        nome: customer.nome,
        cpf: customer.cpf,
        rg: customer.rg,
        email: customer.email,
        telefone: customer.telefone,
        enderecos: addresses.map((address) => ({
          cep: address.cep,
          rua: address.rua,
          numero: address.numero,
          bairro: address.bairro,
          cidade: address.cidade,
          estado: address.estado,
          pais: address.pais,
          complemento: address.complemento,
        })),
        students: nextStudents.map((linkedStudent) => ({
          id: linkedStudent.id,
          nome: linkedStudent.nome,
          ...(linkedStudent.nascimento
            ? { nascimento: `${String(linkedStudent.nascimento).slice(0, 10)}T00:00:00Z` }
            : {}),
        })),
        ativo: customer.status === "ativo",
      });
    }

    if (targetPreviousId) {
      await updateCustomerStudentsList(targetPreviousId, (linkedStudents) =>
        linkedStudents.filter((linkedStudent) => linkedStudent.id !== student.id)
      );
    }

    if (targetNextId) {
      await updateCustomerStudentsList(targetNextId, (linkedStudents) => {
        if (linkedStudents.some((linkedStudent) => linkedStudent.id === student.id)) {
          return linkedStudents;
        }

        return [
          ...linkedStudents,
          {
            id: student.id,
            code: `A${String(student.id).padStart(3, "0")}`,
            nome: student.nome,
            nascimento: student.nascimento,
            status: "ativo",
          },
        ];
      });
    }
  }

  async function createResponsibleCustomerForStudent(
    student: Pick<StudentRow, "id" | "nome" | "nascimento">,
    values: StudentFormValues
  ) {
    const createdCustomer = await createCustomer({
      nome: values.responsible_nome,
      cpf: values.responsible_cpf,
      rg: values.responsible_rg,
      email: values.responsible_email,
      telefone: values.responsible_telefone,
      enderecos: [
        {
          cep: values.responsible_cep,
          rua: values.responsible_rua,
          numero: values.responsible_numero,
          bairro: values.responsible_bairro,
          cidade: values.responsible_cidade,
          estado: values.responsible_estado,
          pais: values.responsible_pais || "Brasil",
          complemento: values.responsible_complemento,
        },
      ],
      students: [
        {
          id: student.id,
          nome: student.nome,
          ...(student.nascimento
            ? { nascimento: `${String(student.nascimento).slice(0, 10)}T00:00:00Z` }
            : {}),
        },
      ],
    });

    upsertCustomer(createdCustomer);
    return createdCustomer;
  }

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

    if (values.responsible_mode === "new") {
      await createResponsibleCustomerForStudent(
        {
          id: created.id,
          nome: created.nome,
          nascimento: created.nascimento,
        },
        values
      );
    } else {
      const responsibleCustomerId = values.responsible_customer_id
        ? Number(values.responsible_customer_id)
        : undefined;

      if (responsibleCustomerId) {
        await syncStudentResponsible(
          {
            id: created.id,
            nome: created.nome,
            nascimento: created.nascimento,
          },
          undefined,
          responsibleCustomerId
        );
      }
    }

    const refreshedStudents = await loadStudents({ force: true });
    await loadCustomers({ force: true });
    const refreshedStudent = refreshedStudents.find((student) => student.id === created.id) ?? created;
    upsertStudent(refreshedStudent);
    setSelectedStudentId(refreshedStudent.id);
  }

  async function handleEdit(values: StudentFormValues) {
    if (!editingStudent) return;

    const previousResponsibleCustomerId = inferResponsibleCustomerId(editingStudent);

    const updated = await updateStudent(editingStudent.id, {
      nome: values.nome,
      ...(values.nascimento ? { nascimento: `${values.nascimento}T00:00:00Z` } : {}),
    });

    const previousCustomerId = previousResponsibleCustomerId
      ? Number(previousResponsibleCustomerId)
      : undefined;
    const nextCustomerId = values.responsible_customer_id
      ? Number(values.responsible_customer_id)
      : undefined;

    if (values.responsible_mode === "new") {
      if (previousCustomerId) {
        await syncStudentResponsible(
          {
            id: updated.id,
            nome: updated.nome,
            nascimento: updated.nascimento,
          },
          previousCustomerId,
          undefined
        );
      }

      await createResponsibleCustomerForStudent(
        {
          id: updated.id,
          nome: updated.nome,
          nascimento: updated.nascimento,
        },
        values
      );
    } else if (previousCustomerId !== nextCustomerId) {
      await syncStudentResponsible(
        {
          id: updated.id,
          nome: updated.nome,
          nascimento: updated.nascimento,
        },
        previousCustomerId,
        nextCustomerId
      );
    }

    const refreshedStudents = await loadStudents({ force: true });
    await loadCustomers({ force: true });
    const refreshedStudent = refreshedStudents.find((student) => student.id === editingStudent.id) ?? updated;
    upsertStudent(refreshedStudent);
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
      endereco: buildClassAddress(values),
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

  async function refreshClassLessons(classId: number) {
    const lessons = await fetchLessonsByClass(classId);
    setClassLessons((current) => ({
      ...current,
      [classId]: lessons,
    }));
    return lessons;
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

  async function handleUpdateLessonEntry(
    lessonId: number,
    payload: LessonPayload,
    statusId: number
  ) {
    await updateLesson(lessonId, payload);
    await updateLessonStatus(lessonId, statusId);

    setClassLessons((current) => {
      const optimisticLessons = (current[payload.class_id] ?? []).map((lesson) =>
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
        [payload.class_id]: optimisticLessons,
      };
    });

    try {
      await refreshClassLessons(payload.class_id);
    } catch (error) {
      console.error("Erro ao sincronizar aulas após edição:", error);
    }
  }

  async function handleDeleteLessonEntry(classId: number, lessonId: number) {
    await deleteLesson(lessonId);
    await refreshClassLessons(classId);
    setLessonStudents((current) => {
      const next = { ...current };
      delete next[lessonId];
      return next;
    });
  }

  async function handleAddStudentToLessonEntry(lessonId: number, studentId: number) {
    await addStudentToLesson(lessonId, studentId);
    const linkedStudents = await fetchLessonStudents(lessonId);
    setLessonStudents((current) => ({
      ...current,
      [lessonId]: linkedStudents,
    }));
  }

  async function handleRemoveStudentFromLessonEntry(lessonId: number, studentId: number) {
    await removeStudentFromLesson(lessonId, studentId);
    const linkedStudents = await fetchLessonStudents(lessonId);
    setLessonStudents((current) => ({
      ...current,
      [lessonId]: linkedStudents,
    }));
  }

  function formatDate(value?: string) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("pt-BR").format(date);
  }

  function formatDateTime(value?: string) {
    if (!value) return "—";
    const normalized = value.replace(" ", "T");
    const datePart = normalized.slice(0, 10);
    const timePart = normalized.slice(11, 16);
    const [year, month, day] = datePart.split("-");

    if (!year || !month || !day || !timePart) return value;
    return `${day}/${month}/${year}, ${timePart}`;
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
                  <td colSpan={7} className="gestao-professores__empty">
                    Carregando alunos...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="gestao-professores__empty">
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
                            void handleOpenClassModalFromStudent(student);
                          }}
                          title="Criar turma a partir deste aluno"
                          aria-label="Criar turma a partir deste aluno"
                        >
                          <img src={bookOpenIcon} alt="Criar turma a partir do aluno" />
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
                        <button type="button" onClick={() => setSelectedStudentId(student.id)} title="Ver aluno" aria-label="Ver aluno">
                          <img src={eyeIcon} alt="Ver aluno" />
                        </button>
                        <button type="button" onClick={() => setEditingStudent(student)} title="Editar aluno" aria-label="Editar aluno">
                          <img src={pencilIcon} alt="Editar aluno" />
                        </button>
                        <button type="button" onClick={() => handleDelete(student)} title="Desativar aluno" aria-label="Desativar aluno">
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
                          <span>
                            {classItem.recurrence_desc || "Sem recorrência informada"}
                            {" · "}
                            {`${classItem.lessons_completed ?? 0}/${classItem.lessons_total ?? 0} aulas`}
                          </span>
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
                                  <div className="gestao-alunos__lesson-main">
                                    <strong>{formatDateTime(lesson.lesson_date)}</strong>
                                    <span>
                                      {lesson.subject?.trim()
                                        ? lesson.subject
                                        : "Assunto ainda não definido"}
                                    </span>
                                  </div>
                                  {(() => {
                                    const status = getLessonStatusPresentation(lesson);
                                    return (
                                      <div className="gestao-alunos__lesson-side">
                                        <span className={`gestao-turmas__status-pill is-${status.tone}`}>
                                          {status.label}
                                        </span>
                                        <button
                                          type="button"
                                          className="gestao-alunos__lesson-action"
                                          title="Editar aula"
                                          aria-label="Editar aula"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            void handleOpenLessonEditor(classItem.id, lesson);
                                          }}
                                        >
                                          <img src={pencilIcon} alt="Editar aula" />
                                        </button>
                                        <button
                                          type="button"
                                          className="gestao-alunos__lesson-action is-danger"
                                          title="Excluir aula"
                                          aria-label="Excluir aula"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            void handleDeleteLessonEntry(classItem.id, lesson.id);
                                          }}
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
          availableCustomers={customers}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
        />

        <StudentModal
          open={Boolean(editingStudent)}
          mode="edit"
          availableCustomers={customers}
          initialValues={
            editingStudent
              ? {
                  nome: editingStudent.nome,
                  nascimento: editingStudent.nascimento?.slice(0, 10) ?? "",
                  responsible_mode: "existing",
                  responsible_customer_id: inferResponsibleCustomerId(editingStudent),
                  responsible_query: (() => {
                    const customerId = inferResponsibleCustomerId(editingStudent);
                    if (!customerId) return "";
                    const customer = customers.find((item) => String(item.id) === customerId);
                    return customer ? `${customer.nome} (${customer.code})` : "";
                  })(),
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
                  cep: classSourceAddress?.cep ?? "",
                  rua: classSourceAddress?.rua ?? "",
                  numero: classSourceAddress?.numero ?? "",
                  bairro: classSourceAddress?.bairro ?? "",
                  cidade: classSourceAddress?.cidade ?? "",
                  estado: classSourceAddress?.estado ?? "",
                  pais: classSourceAddress?.pais ?? "Brasil",
                  complemento: classSourceAddress?.complemento ?? "",
                }
              : undefined
          }
          onClose={() => {
            setClassSourceStudent(null);
            setClassSourceAddress(null);
          }}
          onSubmit={handleCreateClassFromStudent}
        />

        <LessonEditorModal
          open={Boolean(editingLesson)}
          lesson={editingLesson}
          professors={allProfessors}
          lessonStatuses={lessonStatuses}
          allStudents={students}
          linkedStudents={editingLesson ? lessonStudents[editingLesson.id] ?? [] : []}
          loadingStudents={lessonStudentsLoading}
          onClose={() => setEditingLesson(null)}
          onSave={async (lessonId, payload, statusId) => {
            await handleUpdateLessonEntry(lessonId, payload, statusId);
            const refreshedLessons = await fetchLessonsByClass(payload.class_id);
            const refreshedLesson = refreshedLessons.find((item) => item.id === lessonId) ?? null;
            setEditingLesson(refreshedLesson);
          }}
          onAddStudent={handleAddStudentToLessonEntry}
          onRemoveStudent={handleRemoveStudentFromLessonEntry}
        />
      </section>
    </GestaoShell>
  );
}
