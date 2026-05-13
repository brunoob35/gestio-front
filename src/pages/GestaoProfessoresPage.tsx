import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import GestaoShell from "../components/gestao/GestaoShell";
import ProfessorModal, {
  type ProfessorFormValues,
} from "../components/gestao/ProfessorModal";

import {
  createProfessor,
  deleteProfessor,
  fetchAllProfessors,
  fetchProfessorClassesCount,
  fetchProfessors,
  type ProfessorRow,
  updateProfessor,
} from "../services/professors";
import {
  createManager,
  deleteUser,
  fetchUsers,
  type UserRow,
  updateUser,
} from "../services/users";

import bookOpenIcon from "../assets/icons/book-open-svgrepo-com.svg";
import eyeIcon from "../assets/icons/eye-show-svgrepo-com.svg";
import pencilIcon from "../assets/icons/pencil-svgrepo-com.svg";
import trashIcon from "../assets/icons/trash-alt-svgrepo-com.svg";

import "./GestaoProfessoresPage.css";

export default function GestaoProfessoresPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  const [createProfessorOpen, setCreateProfessorOpen] = useState(false);
  const [createManagerOpen, setCreateManagerOpen] = useState(false);
  const [editingProfessor, setEditingProfessor] = useState<ProfessorRow | null>(null);
  const [editingManager, setEditingManager] = useState<UserRow | null>(null);
  const [professors, setProfessors] = useState<ProfessorRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const [allProfessorsBase, activeProfessorsBase, allUsers] = await Promise.all([
          fetchAllProfessors(),
          fetchProfessors(),
          fetchUsers(),
        ]);

        const professorIds = allProfessorsBase.map((item) => item.id);
        let counts: Record<number, number> = {};

        if (professorIds.length) {
          try {
            counts = await fetchProfessorClassesCount(professorIds);
          } catch (error) {
            console.error("Erro ao carregar contagem de turmas dos professores:", error);
          }
        }

        const activeProfessorIds = new Set(activeProfessorsBase.map((item) => item.id));
        const mergedProfessors = allProfessorsBase
          .map((item) => ({
            ...item,
            turmasAtivas: counts[item.id] ?? item.turmasAtivas ?? 0,
            status: activeProfessorIds.has(item.id) ? "ativo" : "inativo",
          }))
          .sort((left, right) => left.nome.localeCompare(right.nome));

        const professorIdSet = new Set(mergedProfessors.map((item) => item.id));
        const managerUsers = allUsers
          .filter((user) => !professorIdSet.has(user.id))
          .sort((left, right) => left.nome.localeCompare(right.nome));

        if (!cancelled) {
          setProfessors(mergedProfessors);
          setUsers(managerUsers);
        }
      } catch (error) {
        console.error("Erro ao carregar usuários:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProfessors = useMemo(() => {
    const term = search.trim().toLowerCase();
    const targetStatus = showInactive ? "inativo" : "ativo";

    return professors.filter((item) => {
      if (item.status !== targetStatus) return false;
      if (!term) return true;

      return (
        item.nome.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term)
      );
    });
  }, [professors, search, showInactive]);

  const filteredManagers = useMemo(() => {
    const term = search.trim().toLowerCase();
    const targetStatus = showInactive ? "inativo" : "ativo";

    return users.filter((item) => {
      if (item.status !== targetStatus) return false;
      if (!term) return true;

      return (
        item.nome.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term)
      );
    });
  }, [users, search, showInactive]);

  async function handleCreateProfessor(values: ProfessorFormValues) {
    const createdProfessor = await createProfessor({
      nome: values.nome,
      email: values.email,
      senha: values.senha,
      cpf: values.cpf,
      rg: values.rg,
      telefone: values.telefone,
      ativo: true,
      nascimento: `${values.nascimento}T00:00:00Z`,
    });

    setProfessors((current) =>
      [...current, {
        id: createdProfessor.id,
        code: `P${String(createdProfessor.id).padStart(3, "0")}`,
        nome: values.nome,
        email: values.email,
        telefone: values.telefone,
        cpf: values.cpf,
        rg: values.rg,
        nascimento: `${values.nascimento}T00:00:00Z`,
        turmasAtivas: 0,
        status: "ativo",
      }].sort((left, right) => left.nome.localeCompare(right.nome))
    );
  }

  async function handleCreateManager(values: ProfessorFormValues) {
    const createdManager = await createManager({
      nome: values.nome,
      email: values.email,
      senha: values.senha,
      cpf: values.cpf,
      rg: values.rg,
      telefone: values.telefone,
      ativo: true,
      nascimento: values.nascimento ? `${values.nascimento}T00:00:00Z` : undefined,
    });

    setUsers((current) =>
      [...current, {
        ...createdManager,
        nome: values.nome,
        email: values.email,
        telefone: values.telefone,
        cpf: values.cpf,
        rg: values.rg,
        nascimento: values.nascimento ? `${values.nascimento}T00:00:00Z` : undefined,
        status: "ativo",
      }].sort((left, right) => left.nome.localeCompare(right.nome))
    );
  }

  async function handleEditProfessor(values: ProfessorFormValues) {
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

    setProfessors((current) =>
      current
        .map((item) =>
          item.id === editingProfessor.id
            ? {
                ...item,
                nome: values.nome,
                email: values.email,
                telefone: values.telefone,
                cpf: values.cpf,
                rg: values.rg,
                nascimento: values.nascimento
                  ? `${values.nascimento}T00:00:00Z`
                  : item.nascimento,
              }
            : item
        )
        .sort((left, right) => left.nome.localeCompare(right.nome))
    );
    setEditingProfessor(null);
  }

  async function handleEditManager(values: ProfessorFormValues) {
    if (!editingManager) return;

    await updateUser(editingManager.id, {
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

    setUsers((current) =>
      current
        .map((item) =>
          item.id === editingManager.id
            ? {
                ...item,
                nome: values.nome,
                email: values.email,
                telefone: values.telefone,
                cpf: values.cpf,
                rg: values.rg,
                nascimento: values.nascimento
                  ? `${values.nascimento}T00:00:00Z`
                  : item.nascimento,
              }
            : item
        )
        .sort((left, right) => left.nome.localeCompare(right.nome))
    );
    setEditingManager(null);
  }

  async function handleDeleteProfessor(professor: ProfessorRow) {
    const confirmed = window.confirm(
      `Deseja ${showInactive ? "remover" : "desativar"} o professor ${professor.nome}?`
    );

    if (!confirmed) return;

    await deleteProfessor(professor.id);
    setProfessors((current) =>
      current.map((item) =>
        item.id === professor.id
          ? { ...item, status: "inativo", turmasAtivas: item.turmasAtivas }
          : item
      )
    );
  }

  async function handleDeleteManager(manager: UserRow) {
    const confirmed = window.confirm(
      `Deseja ${showInactive ? "remover" : "desativar"} o gestor ${manager.nome}?`
    );

    if (!confirmed) return;

    await deleteUser(manager.id);
    setUsers((current) =>
      current.map((item) =>
        item.id === manager.id ? { ...item, status: "inativo" } : item
      )
    );
  }

  function handleViewProfessor(professor: ProfessorRow) {
    navigate(`/gestao/professores/${professor.id}`);
  }

  function normalizeDateToInput(dateValue?: string) {
    if (!dateValue) return "";
    return dateValue.slice(0, 10);
  }

  return (
    <GestaoShell title="Usuários">
      <section className="gestao-professores">
        <div className="gestao-professores__header">
          <div>
            <h2>Gestão de Usuários</h2>
            <p>Cadastre e gerencie professores e gestores do sistema</p>
          </div>

          <div className="gestao-professores__header-actions">
            <button
              type="button"
              className="gestao-professores__create-button"
              onClick={() => setCreateProfessorOpen(true)}
            >
              <span>＋</span>
              Novo Professor
            </button>

            <button
              type="button"
              className="gestao-professores__create-button gestao-professores__create-button--secondary"
              onClick={() => setCreateManagerOpen(true)}
            >
              <span>＋</span>
              Novo Gestor
            </button>

            <button
              type="button"
              className="gestao-professores__create-button gestao-professores__create-button--ghost"
              onClick={() => setShowInactive((current) => !current)}
            >
              <img src={eyeIcon} alt="" aria-hidden="true" />
              {showInactive ? "Ativos" : "Inativos"}
            </button>
          </div>
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
            <h3>{showInactive ? "Professores Inativos" : "Professores Cadastrados"}</h3>
          </div>

          <div className="gestao-professores__table-wrapper">
            <table className="gestao-professores__table">
              <thead>
                <tr>
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
                    <td colSpan={6} className="gestao-professores__empty">
                      Carregando professores...
                    </td>
                  </tr>
                ) : filteredProfessors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="gestao-professores__empty">
                      Nenhum professor encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredProfessors.map((professor) => (
                    <tr key={professor.id}>
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
                        <span className={`gestao-professores__status ${professor.status === "inativo" ? "is-inactive" : ""}`}>
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
                            onClick={() => void handleDeleteProfessor(professor)}
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

        <section className="gestao-professores__table-card">
          <div className="gestao-professores__table-header">
            <h3>{showInactive ? "Usuários Administradores Inativos" : "Usuários Administradores"}</h3>
          </div>

          <div className="gestao-professores__table-wrapper">
            <table className="gestao-professores__table gestao-professores__table--admins">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Telefone</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="gestao-professores__empty">
                      Carregando gestores...
                    </td>
                  </tr>
                ) : filteredManagers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="gestao-professores__empty">
                      Nenhum gestor encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredManagers.map((manager) => (
                    <tr key={manager.id}>
                      <td>{manager.nome}</td>
                      <td>{manager.email}</td>
                      <td>{manager.telefone}</td>
                      <td>
                        <span className={`gestao-professores__status ${manager.status === "inativo" ? "is-inactive" : ""}`}>
                          {manager.status}
                        </span>
                      </td>
                      <td>
                        <div className="gestao-professores__actions">
                          <button
                            type="button"
                            title="Editar gestor"
                            onClick={() => setEditingManager(manager)}
                          >
                            <img src={pencilIcon} alt="Editar gestor" />
                          </button>

                          <button
                            type="button"
                            title="Desativar gestor"
                            onClick={() => void handleDeleteManager(manager)}
                            className="is-danger"
                          >
                            <img
                              src={trashIcon}
                              alt="Desativar gestor"
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
          open={createProfessorOpen}
          mode="create"
          entityLabel="Professor"
          onClose={() => setCreateProfessorOpen(false)}
          onSubmit={handleCreateProfessor}
        />

        <ProfessorModal
          open={createManagerOpen}
          mode="create"
          entityLabel="Gestor"
          onClose={() => setCreateManagerOpen(false)}
          onSubmit={handleCreateManager}
        />

        <ProfessorModal
          open={!!editingProfessor}
          mode="edit"
          entityLabel="Professor"
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
          onSubmit={handleEditProfessor}
        />

        <ProfessorModal
          open={!!editingManager}
          mode="edit"
          entityLabel="Gestor"
          initialValues={
            editingManager
              ? {
                  nome: editingManager.nome,
                  email: editingManager.email,
                  telefone: editingManager.telefone,
                  cpf: editingManager.cpf ?? "",
                  rg: editingManager.rg ?? "",
                  nascimento: normalizeDateToInput(editingManager.nascimento),
                }
              : undefined
          }
          onClose={() => setEditingManager(null)}
          onSubmit={handleEditManager}
        />
      </section>
    </GestaoShell>
  );
}
