import { useEffect, useMemo, useState } from "react";

import ProfessorShell from "../components/professor/ProfessorShell";
import StatCard from "../components/gestao/StatCard";
import type { Class } from "../services/classes";
import { fetchCurrentProfessorClasses } from "../services/professorArea";

import usersIcon from "../assets/icons/user-group-svgrepo-com.svg";
import bookIcon from "../assets/icons/book-open-svgrepo-com.svg";
import graphIcon from "../assets/icons/graph-svgrepo-com.svg";
import eyeIcon from "../assets/icons/eye-show-svgrepo-com.svg";
import locationIcon from "../assets/icons/location-pin-alt-1-svgrepo-com.svg";

import "./ProfessorClassesPage.css";

function getCompletionRate(classItem: Class) {
  const total = classItem.lessons_total ?? 0;
  const completed = classItem.lessons_completed ?? 0;

  if (total <= 0) return 0;
  return Math.round((completed / total) * 1000) / 10;
}

function formatPercentage(value: number) {
  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}%`;
}

export default function ProfessorClassesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      setLoading(true);
      setError("");

      try {
        const classRows = await fetchCurrentProfessorClasses();
        if (cancelled) return;
        setClasses(classRows);
      } catch (loadError) {
        console.error("Erro ao carregar turmas do professor:", loadError);
        if (!cancelled) {
          setError("Não foi possível carregar as turmas do professor.");
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

  const filteredClasses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return classes;

    return classes.filter((classItem) => {
      return (
        classItem.name.toLowerCase().includes(normalizedQuery) ||
        (classItem.recurrence_desc || "").toLowerCase().includes(normalizedQuery) ||
        (classItem.address || "").toLowerCase().includes(normalizedQuery)
      );
    });
  }, [classes, query]);

  const stats = useMemo(() => {
    const active = filteredClasses.length;
    const students = filteredClasses.reduce((sum, classItem) => sum + (classItem.student_count ?? 0), 0);
    const lessons = filteredClasses.reduce((sum, classItem) => sum + (classItem.lessons_total ?? 0), 0);
    const completed = filteredClasses.reduce(
      (sum, classItem) => sum + (classItem.lessons_completed ?? 0),
      0
    );

    return {
      active,
      students,
      lessons,
      completedRate: lessons > 0 ? Math.round((completed / lessons) * 1000) / 10 : 0,
    };
  }, [filteredClasses]);

  return (
    <ProfessorShell title="Minhas Turmas">
      <div className="professor-classes">
        <section className="professor-classes__hero">
          <h2>Minhas Turmas</h2>
          <p>Consulte as turmas vinculadas ao professor e acompanhe o progresso geral.</p>
        </section>

        {error ? <div className="professor-classes__error">{error}</div> : null}

        <section className="professor-classes__panel">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="professor-classes__search"
            placeholder="Buscar por nome da turma, recorrência ou endereço..."
          />
        </section>

        <section className="professor-classes__stats">
          <StatCard
            title="Turmas Ativas"
            value={String(stats.active)}
            detail="Turmas vinculadas ao professor"
            secondaryDetail="Considerando a busca aplicada"
            icon={usersIcon}
            tone="green"
          />
          <StatCard
            title="Alunos Vinculados"
            value={String(stats.students)}
            detail="Soma de alunos nas turmas"
            secondaryDetail="Base atual do professor"
            icon={bookIcon}
            tone="green"
          />
          <StatCard
            title="Aulas Previstas"
            value={String(stats.lessons)}
            detail="Aulas geradas nas turmas"
            secondaryDetail="Histórico total"
            icon={graphIcon}
            tone="yellow"
          />
          <StatCard
            title="Progresso"
            value={formatPercentage(stats.completedRate)}
            detail="Aulas realizadas no conjunto"
            secondaryDetail="Concluídas sobre previstas"
            icon={graphIcon}
            tone="green"
          />
        </section>

        <section className="professor-classes__panel">
          <header className="professor-classes__panel-header">
            <h3>Turmas Vinculadas</h3>
          </header>

          <div className="professor-classes__table-wrap">
            <table className="professor-classes__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Turma</th>
                  <th>Alunos</th>
                  <th>Aulas</th>
                  <th>Realizadas</th>
                  <th>Recorrência</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="professor-classes__empty">
                      Carregando turmas...
                    </td>
                  </tr>
                ) : filteredClasses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="professor-classes__empty">
                      Nenhuma turma encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredClasses.map((classItem) => (
                    <tr key={classItem.id}>
                      <td>{`T${String(classItem.id).padStart(3, "0")}`}</td>
                      <td>{classItem.name}</td>
                      <td>{classItem.student_count ?? 0}</td>
                      <td>{classItem.lessons_total ?? 0}</td>
                      <td>{classItem.lessons_completed ?? 0}</td>
                      <td>{classItem.recurrence_desc || "Recorrência não informada"}</td>
                      <td>
                        <button
                          type="button"
                          className="professor-classes__icon-button"
                          onClick={() => setSelectedClass(classItem)}
                          aria-label={`Ver detalhes da turma ${classItem.name}`}
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

        {selectedClass ? (
          <div
            className="professor-classes__modal-backdrop"
            role="presentation"
            onClick={() => setSelectedClass(null)}
          >
            <section
              className="professor-classes__modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="professor-class-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="professor-classes__modal-header">
                <div>
                  <h3 id="professor-class-modal-title">{selectedClass.name}</h3>
                  <p>{selectedClass.recurrence_desc || "Recorrência não informada"}</p>
                </div>

                <button
                  type="button"
                  className="professor-classes__modal-close"
                  onClick={() => setSelectedClass(null)}
                  aria-label="Fechar detalhes da turma"
                >
                  ×
                </button>
              </header>

              <div className="professor-classes__modal-grid">
                <article className="professor-classes__detail-card">
                  <strong>Alunos</strong>
                  <span>{selectedClass.student_count ?? 0}</span>
                </article>
                <article className="professor-classes__detail-card">
                  <strong>Aulas previstas</strong>
                  <span>{selectedClass.lessons_total ?? 0}</span>
                </article>
                <article className="professor-classes__detail-card">
                  <strong>Realizadas</strong>
                  <span>{selectedClass.lessons_completed ?? 0}</span>
                </article>
                <article className="professor-classes__detail-card">
                  <strong>Progresso</strong>
                  <span>{formatPercentage(getCompletionRate(selectedClass))}</span>
                </article>
              </div>

              <div className="professor-classes__detail-list">
                <div>
                  <img src={locationIcon} alt="" aria-hidden="true" />
                  <span>{selectedClass.address || "Endereço não informado"}</span>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </ProfessorShell>
  );
}
