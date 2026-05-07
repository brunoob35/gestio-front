import { useEffect, useMemo, useState } from "react";
import type { StudentRow } from "../../services/students";
import "./ClassStudentsModal.css";

type ClassStudentsModalProps = {
  open: boolean;
  className: string;
  students: StudentRow[];
  selectedStudentIds: number[];
  loading?: boolean;
  onClose: () => void;
  onSubmit: (studentIds: number[]) => Promise<void>;
};

export default function ClassStudentsModal({
  open,
  className,
  students,
  selectedStudentIds,
  loading = false,
  onClose,
  onSubmit,
}: ClassStudentsModalProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setSelectedIds(selectedStudentIds);
  }, [open, selectedStudentIds]);

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();

    return [...students]
      .sort((left, right) => left.nome.localeCompare(right.nome))
      .filter((student) => {
        if (!term) return true;
        return student.nome.toLowerCase().includes(term);
      });
  }, [search, students]);

  if (!open) return null;

  function handleToggle(studentId: number) {
    setSelectedIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    try {
      await onSubmit(selectedIds);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="class-students-modal__backdrop" onClick={onClose}>
      <div className="class-students-modal" onClick={(event) => event.stopPropagation()}>
        <div className="class-students-modal__header">
          <div>
            <h2>Alunos da turma</h2>
            <p>{className}</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar modal">
            ×
          </button>
        </div>

        <form className="class-students-modal__form" onSubmit={handleSubmit}>
          <label className="class-students-modal__search">
            <span>Buscar aluno</span>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar por nome..."
            />
          </label>

          <div className="class-students-modal__summary">
            <strong>{selectedIds.length}</strong>
            <span>aluno(s) vinculado(s)</span>
          </div>

          <div className="class-students-modal__list">
            {loading ? (
              <p className="class-students-modal__empty">Carregando alunos vinculados...</p>
            ) : filteredStudents.length ? (
              filteredStudents.map((student) => {
                const checked = selectedIds.includes(student.id);

                return (
                  <label key={student.id} className={checked ? "is-selected" : ""}>
                    <div>
                      <strong>{student.nome}</strong>
                      <span>{student.status === "ativo" ? "Ativo" : "Inativo"}</span>
                    </div>

                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggle(student.id)}
                    />
                  </label>
                );
              })
            ) : (
              <p className="class-students-modal__empty">Nenhum aluno encontrado.</p>
            )}
          </div>

          <div className="class-students-modal__actions">
            <button
              type="button"
              className="class-students-modal__secondary"
              onClick={onClose}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="class-students-modal__primary"
              disabled={saving || loading}
            >
              {saving ? "Salvando..." : "Salvar vínculos"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
