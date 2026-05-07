import { useEffect, useState } from "react";
import type { ProfessorRow } from "../../services/professors";
import "./TeacherAssignmentModal.css";

type TeacherAssignmentModalProps = {
  open: boolean;
  professors: ProfessorRow[];
  currentTeacherId?: number | null;
  className: string;
  onClose: () => void;
  onSubmit: (teacherId: number | null) => Promise<void>;
};

export default function TeacherAssignmentModal({
  open,
  professors,
  currentTeacherId,
  className,
  onClose,
  onSubmit,
}: TeacherAssignmentModalProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedTeacherId(currentTeacherId ? String(currentTeacherId) : "");
  }, [open, currentTeacherId]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      await onSubmit(selectedTeacherId ? Number(selectedTeacherId) : null);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="teacher-modal__backdrop" onClick={onClose}>
      <div className="teacher-modal" onClick={(event) => event.stopPropagation()}>
        <div className="teacher-modal__header">
          <h2>Professor da turma</h2>
          <button type="button" onClick={onClose} aria-label="Fechar modal">
            ×
          </button>
        </div>

        <p className="teacher-modal__subtitle">{className}</p>

        <form className="teacher-modal__form" onSubmit={handleSubmit}>
          <label>
            <span>Selecionar professor</span>
            <select
              value={selectedTeacherId}
              onChange={(event) => setSelectedTeacherId(event.target.value)}
            >
              <option value="">Sem professor</option>
              {professors.map((professor) => (
                <option key={professor.id} value={professor.id}>
                  {professor.nome}
                </option>
              ))}
            </select>
          </label>

          <div className="teacher-modal__actions">
            <button type="button" className="teacher-modal__secondary" onClick={onClose}>
              Cancelar
            </button>

            <button type="submit" className="teacher-modal__primary" disabled={loading}>
              {loading ? "Salvando..." : "Salvar professor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
