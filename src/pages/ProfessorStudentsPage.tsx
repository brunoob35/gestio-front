import { useEffect, useMemo, useState } from "react";

import ProfessorShell from "../components/professor/ProfessorShell";
import {
  fetchCurrentProfessorStudents,
  type ProfessorStudentRow,
} from "../services/professorArea";

import eyeIcon from "../assets/icons/eye-show-svgrepo-com.svg";

import "./ProfessorStudentsPage.css";

function formatFrequency(value: number) {
  const normalized = Number.isFinite(value) ? value : 0;
  const rounded = Math.round(normalized * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

function getFrequencyTone(value: number) {
  if (value < 60) return "critical";
  if (value < 75) return "warning";
  return "default";
}

export default function ProfessorStudentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState<ProfessorStudentRow[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<ProfessorStudentRow | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      setLoading(true);
      setError("");

      try {
        const studentRows = await fetchCurrentProfessorStudents();
        if (cancelled) return;
        setStudents(studentRows);
      } catch (loadError) {
        console.error("Erro ao carregar alunos do professor:", loadError);
        if (!cancelled) {
          setError("Não foi possível carregar os alunos vinculados ao professor.");
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

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return students;

    return students.filter((student) => {
      return (
        student.nome.toLowerCase().includes(normalizedQuery) ||
        student.class_name.toLowerCase().includes(normalizedQuery) ||
        student.code.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [query, students]);

  return (
    <ProfessorShell title="Alunos">
      <div className="professor-students">
        <section className="professor-students__hero">
          <h2>Meus Alunos</h2>
          <p>Consulte alunos e acompanhe a frequência por turma.</p>
        </section>

        {error ? <div className="professor-students__error">{error}</div> : null}

        <section className="professor-students__panel">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="professor-students__search"
            placeholder="Buscar por nome ou turma..."
          />
        </section>

        <section className="professor-students__panel">
          <header className="professor-students__panel-header">
            <h3>Alunos Vinculados</h3>
          </header>

          <div className="professor-students__table-wrap">
            <table className="professor-students__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Turma</th>
                  <th>Aulas Realizadas</th>
                  <th>Frequência</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="professor-students__empty">
                      Carregando alunos...
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="professor-students__empty">
                      Nenhum aluno encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={`${student.id}-${student.class_id}`}>
                      <td>{student.code}</td>
                      <td>{student.nome}</td>
                      <td>{student.class_name}</td>
                      <td>{`${student.lessons_completed}/${student.lessons_total}`}</td>
                      <td>
                        <span
                          className={`professor-students__frequency professor-students__frequency--${getFrequencyTone(
                            student.frequency_percentage
                          )}`}
                        >
                          {formatFrequency(student.frequency_percentage)}
                        </span>
                      </td>
                      <td>
                        <span className="professor-students__status">
                          {student.status}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="professor-students__icon-button"
                          onClick={() => setSelectedStudent(student)}
                          aria-label={`Ver detalhes do aluno ${student.nome}`}
                        >
                          <img src={eyeIcon} alt="" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedStudent ? (
          <div
            className="professor-students__modal-backdrop"
            role="presentation"
            onClick={() => setSelectedStudent(null)}
          >
            <section
              className="professor-students__modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="professor-student-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="professor-students__modal-header">
                <div>
                  <h3 id="professor-student-modal-title">{selectedStudent.nome}</h3>
                  <p>{selectedStudent.class_name}</p>
                </div>

                <button
                  type="button"
                  className="professor-students__modal-close"
                  onClick={() => setSelectedStudent(null)}
                  aria-label="Fechar detalhes do aluno"
                >
                  ×
                </button>
              </header>

              <div className="professor-students__modal-grid">
                <article className="professor-students__detail-card">
                  <strong>Código</strong>
                  <span>{selectedStudent.code}</span>
                </article>
                <article className="professor-students__detail-card">
                  <strong>Turma</strong>
                  <span>{selectedStudent.class_name}</span>
                </article>
                <article className="professor-students__detail-card">
                  <strong>Aulas realizadas</strong>
                  <span>{`${selectedStudent.lessons_completed}/${selectedStudent.lessons_total}`}</span>
                </article>
                <article className="professor-students__detail-card">
                  <strong>Frequência</strong>
                  <span>{formatFrequency(selectedStudent.frequency_percentage)}</span>
                </article>
              </div>

              <div className="professor-students__modal-status-row">
                <span className="professor-students__status">{selectedStudent.status}</span>
                <span
                  className={`professor-students__frequency professor-students__frequency--${getFrequencyTone(
                    selectedStudent.frequency_percentage
                  )}`}
                >
                  {formatFrequency(selectedStudent.frequency_percentage)}
                </span>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </ProfessorShell>
  );
}
