import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import GestaoShell from "../components/gestao/GestaoShell";
import ProfessorModal, {
  type ProfessorFormValues,
} from "../components/gestao/ProfessorModal";

import {
  createProfessor,
  deleteProfessor,
  fetchProfessorClassesCount,
  fetchProfessors,
  type ProfessorRow,
  updateProfessor,
} from "../services/professors";

import bookOpenIcon from "../assets/icons/book-open-svgrepo-com.svg";
import eyeIcon from "../assets/icons/eye-show-svgrepo-com.svg";
import pencilIcon from "../assets/icons/pencil-svgrepo-com.svg";
import trashIcon from "../assets/icons/trash-alt-svgrepo-com.svg";

import "./GestaoProfessoresPage.css";

export default function GestaoProfessoresPage() {
  const navigate = useNavigate();

  const [professors, setProfessors] = useState<ProfessorRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editingProfessor, setEditingProfessor] = useState<ProfessorRow | null>(null);

  async function loadData() {
    setLoading(true);

    try {
      const baseProfessors = await fetchProfessors();
      const ids = baseProfessors.map((item) => item.id);

      let counts: Record<number, number> = {};

      try {
        counts = await fetchProfessorClassesCount(ids);
      } catch (error) {
        console.error("Erro ao carregar contagem de turmas:", error);
      }

      const merged = baseProfessors.map((item) => ({
        ...item,
        turmasAtivas: counts[item.id] ?? 0,
      }));

      setProfessors(merged);
    } catch (error) {
      console.error("Erro ao carregar professores:", error);
      setProfessors([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredProfessors = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return professors;

    return professors.filter((item) => {
      return (
        item.nome.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term)
      );
    });
  }, [professors, search]);

  async function handleCreate(values: ProfessorFormValues) {
    await createProfessor({
      nome: values.nome,
      email: values.email,
      senha: values.senha,
      cpf: values.cpf,
      rg: values.rg,
      telefone: values.telefone,
      ativo: true,
      nascimento: `${values.nascimento}T00:00:00Z`,
    });

    await loadData();
  }

  async function handleEdit(values: ProfessorFormValues) {
    if (!editingProfessor) return;

    await updateProfessor(editingProfessor.id, {
      nome: values.nome,
      email: values.email,
      telefone: values.telefone,
      cpf: values.cpf,
      rg: values.rg,
      ...(values.nascimento
        ? { nascimento: `${values.nascimento}T00:00:00Z` }
        : {}),
      ...(values.senha ? { senha: values.senha } : {}),
    });

    setEditingProfessor(null);
    await loadData();
  }

  async function handleDelete(professor: ProfessorRow) {
    const confirmed = window.confirm(
      `Deseja desativar o professor ${professor.nome}?`
    );

    if (!confirmed) return;

    await deleteProfessor(professor.id);
    await loadData();
  }

  function handleViewProfessor(professor: ProfessorRow) {
    navigate(`/gestao/professores/${professor.id}`);
  }

  function normalizeDateToInput(dateValue?: string) {
    if (!dateValue) return "";
    return dateValue.slice(0, 10);
  }

  return (
    <GestaoShell title="Professores">
      <section className="gestao-professores">
        <div className="gestao-professores__header">
          <div>
            <h2>Gestão de Professores</h2>
            <p>Cadastre e gerencie professores do sistema</p>
          </div>

          <button
            type="button"
            className="gestao-professores__create-button"
            onClick={() => setCreateOpen(true)}
          >
            <span>＋</span>
            Novo Professor
          </button>
        </div>

        <div className="gestao-professores__search-card">
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <section className="gestao-professores__table-card">
          <div className="gestao-professores__table-header">
            <h3>Professores Cadastrados</h3>
          </div>

          <div className="gestao-professores__table-wrapper">
            <table className="gestao-professores__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Telefone</th>
                  <th>Turmas Ativas</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="gestao-professores__empty">
                      Carregando professores...
                    </td>
                  </tr>
                ) : filteredProfessors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="gestao-professores__empty">
                      Nenhum professor encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredProfessors.map((professor) => (
                    <tr key={professor.id}>
                      <td>{professor.code}</td>
                      <td>{professor.nome}</td>
                      <td>{professor.email}</td>
                      <td>{professor.telefone}</td>
                      <td>
                        <div className="gestao-professores__classes">
                          <img src={bookOpenIcon} alt="" aria-hidden="true" />
                          <span>{professor.turmasAtivas}</span>
                        </div>
                      </td>
                      <td>
                        <span className="gestao-professores__status">
                          {professor.status}
                        </span>
                      </td>
                      <td>
                        <div className="gestao-professores__actions">
                          <button
                            type="button"
                            title="Ver como professor"
                            onClick={() => handleViewProfessor(professor)}
                          >
                            <img src={eyeIcon} alt="Ver professor" />
                          </button>

                          <button
                            type="button"
                            title="Editar professor"
                            onClick={() => setEditingProfessor(professor)}
                          >
                            <img src={pencilIcon} alt="Editar professor" />
                          </button>

                          <button
                            type="button"
                            title="Desativar professor"
                            onClick={() => handleDelete(professor)}
                            className="is-danger"
                          >
                            <img
                              src={trashIcon}
                              alt="Desativar professor"
                              className="gestao-professores__trash-icon"
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

        <ProfessorModal
          open={createOpen}
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
        />

        <ProfessorModal
          open={!!editingProfessor}
          mode="edit"
          initialValues={
            editingProfessor
              ? {
                  nome: editingProfessor.nome,
                  email: editingProfessor.email,
                  telefone: editingProfessor.telefone,
                  cpf: editingProfessor.cpf ?? "",
                  rg: editingProfessor.rg ?? "",
                  nascimento: normalizeDateToInput(editingProfessor.nascimento),
                }
              : undefined
          }
          onClose={() => setEditingProfessor(null)}
          onSubmit={handleEdit}
        />
      </section>
    </GestaoShell>
  );
}