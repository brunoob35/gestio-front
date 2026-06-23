import { Fragment, useEffect, useMemo, useState } from "react";
import GestaoShell from "../components/gestao/GestaoShell";
import CustomerModal, {
  type CustomerAddressFormValues,
  type CustomerFormValues,
} from "../components/gestao/CustomerModal";
import { useGestaoData } from "../context/GestaoDataContext";
import {
  createCustomer,
  deleteCustomer,
  fetchCustomer,
  fetchCustomerAddresses,
  fetchCustomerStudents,
  type CustomerRow,
  updateCustomer,
} from "../services/customers";
import type { StudentRow } from "../services/students";
import customerStudentsIcon from "../assets/icons/user-circle-svgrepo-com.svg";
import eyeIcon from "../assets/icons/eye-show-svgrepo-com.svg";
import pencilIcon from "../assets/icons/pencil-svgrepo-com.svg";
import trashIcon from "../assets/icons/trash-alt-svgrepo-com.svg";
import { maskDocumentPreview } from "../utils/documents";
import {
  applyDirection,
  compareNumber,
  compareText,
  cycleSort,
  getSortIndicator,
  getSortLabel,
  type SortState,
} from "../utils/tableSorting";
import "./GestaoClientesPage.css";

type CustomerStudentsState = Record<number, StudentRow[]>;
type CustomerSortKey = "nome" | "cpf" | "contato" | "alunos" | "contratos" | "status";

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function buildInitialValues(customer: CustomerRow): CustomerFormValues {
  return {
    nome: customer.nome,
    cpf: "",
    rg: "",
    email: customer.email,
    telefone: customer.telefone,
    addresses: customer.addresses.map((address): CustomerAddressFormValues => ({
      cep: address.cep,
      rua: address.rua,
      numero: address.numero,
      bairro: address.bairro,
      cidade: address.cidade,
      estado: address.estado,
      pais: address.pais,
      complemento: address.complemento,
    })),
    students: (customer.students ?? []).map((student) => ({
      id: student.id,
      nome: student.nome,
      nascimento: student.nascimento ? String(student.nascimento).slice(0, 10) : "",
    })),
  };
}

export default function GestaoClientesPage() {
  const {
    customers,
    students,
    loadCustomers,
    loadStudents,
    upsertCustomer,
  } = useGestaoData();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState<CustomerSortKey>>({
    key: null,
    direction: "asc",
  });
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRow | null>(null);
  const [expandedCustomerId, setExpandedCustomerId] = useState<number | null>(null);
  const [customerStudents, setCustomerStudents] = useState<CustomerStudentsState>({});
  const [customerAddresses, setCustomerAddresses] = useState<Record<number, CustomerAddressFormValues[]>>({});
  const [detailsLoadingId, setDetailsLoadingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        await Promise.all([
          loadCustomers(),
          loadStudents(),
        ]);
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
  }, [loadCustomers, loadStudents]);

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? customers.filter((customer) => {
          return (
            customer.nome.toLowerCase().includes(term) ||
            customer.email.toLowerCase().includes(term) ||
            customer.cpf.toLowerCase().includes(term)
          );
        })
      : customers;

    if (!sort.key) {
      return filtered;
    }

    return [...filtered].sort((left, right) => {
      let comparison = 0;

      switch (sort.key) {
        case "nome":
          comparison = compareText(left.nome, right.nome);
          break;
        case "cpf":
          comparison = compareText(left.cpf, right.cpf);
          break;
        case "contato":
          comparison =
            compareText(left.email, right.email) ||
            compareText(left.telefone, right.telefone);
          break;
        case "alunos":
          comparison = compareNumber(left.studentsCount, right.studentsCount);
          break;
        case "contratos":
          comparison = compareNumber(left.contractsCount, right.contractsCount);
          break;
        case "status":
          comparison = compareText(left.status, right.status);
          break;
      }

      if (comparison === 0) {
        comparison = compareText(left.nome, right.nome);
      }

      return applyDirection(comparison, sort.direction);
    });
  }, [customers, search, sort]);

  const activeCustomers = useMemo(
    () => filteredCustomers.filter((customer) => customer.status === "ativo"),
    [filteredCustomers]
  );

  const inactiveCustomers = useMemo(
    () => filteredCustomers.filter((customer) => customer.status === "inativo"),
    [filteredCustomers]
  );

  function renderSortHeader(label: string, key: CustomerSortKey) {
    return (
      <div className="gestao-table__name-header">
        <span>{label}</span>
        <button
          type="button"
          className="gestao-table__sort-button"
          onClick={() => setSort((current) => cycleSort(current, key))}
          aria-label={getSortLabel(sort, key, label)}
          title={getSortLabel(sort, key, label)}
        >
          {getSortIndicator(sort, key)}
        </button>
      </div>
    );
  }

  function renderTable(title: string, items: CustomerRow[], emptyMessage: string) {
    return (
      <section className="gestao-professores__table-card">
        <div className="gestao-professores__table-header">
          <h3>{title}</h3>
        </div>

        <div className="gestao-professores__table-wrapper">
          <table className="gestao-professores__table">
            <thead>
              <tr>
                <th>{renderSortHeader("Nome", "nome")}</th>
                <th>{renderSortHeader("CPF", "cpf")}</th>
                <th>{renderSortHeader("Contato", "contato")}</th>
                <th>{renderSortHeader("Alunos", "alunos")}</th>
                <th>{renderSortHeader("Contratos", "contratos")}</th>
                <th>{renderSortHeader("Status", "status")}</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="gestao-professores__empty">
                    Carregando clientes...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="gestao-professores__empty">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                items.map((customer) => {
                  const isExpanded = expandedCustomerId === customer.id;
                  const linkedStudents = customerStudents[customer.id] ?? [];
                  const linkedAddresses = customerAddresses[customer.id] ?? [];

                  return (
                    <Fragment key={customer.id}>
                      <tr className={isExpanded ? "gestao-clientes__row is-expanded" : "gestao-clientes__row"}>
                        <td>{customer.nome}</td>
                        <td>{maskDocumentPreview(customer.cpf)}</td>
                        <td>
                          <div className="gestao-clientes__contact-cell">
                            <span>{customer.email || "—"}</span>
                            <span>{customer.telefone}</span>
                          </div>
                        </td>
                        <td>
                          <div className="gestao-clientes__count-cell">
                            <img src={customerStudentsIcon} alt="" aria-hidden="true" />
                            <span>{customer.studentsCount}</span>
                          </div>
                        </td>
                        <td>{customer.contractsCount}</td>
                        <td>
                          <span className={`gestao-clientes__status gestao-clientes__status--${customer.status}`}>
                            {customer.status}
                          </span>
                        </td>
                        <td>
                          <div className="gestao-professores__actions">
                            <button type="button" onClick={() => void handleToggleExpand(customer)} title="Visualizar cliente" aria-label="Visualizar cliente">
                              <img src={eyeIcon} alt="Ver cliente" />
                            </button>

                            <button type="button" onClick={() => void handleStartEdit(customer)} title="Editar cliente" aria-label="Editar cliente">
                              <img src={pencilIcon} alt="Editar cliente" />
                            </button>

                            <button type="button" onClick={() => handleDelete(customer)} title="Desativar cliente" aria-label="Desativar cliente">
                              <img
                                className="gestao-professores__trash-icon"
                                src={trashIcon}
                                alt="Desativar cliente"
                              />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded ? (
                        <tr className="gestao-clientes__details-row">
                          <td colSpan={7}>
                            <div className="gestao-clientes__details-card">
                              <div className="gestao-clientes__detail-block">
                                <h4>Informações gerais</h4>
                                <ul>
                                  <li><strong>ID:</strong> {customer.code}</li>
                                  <li><strong>Nome:</strong> {customer.nome}</li>
                                  <li><strong>Email:</strong> {customer.email || "—"}</li>
                                  <li><strong>Telefone:</strong> {customer.telefone || "—"}</li>
                                  <li><strong>Status:</strong> {customer.status}</li>
                                </ul>
                              </div>

                              <div className="gestao-clientes__detail-block">
                                <h4>Endereços</h4>
                                {detailsLoadingId === customer.id ? (
                                  <p>Carregando endereços...</p>
                                ) : linkedAddresses.length ? (
                                  <ul>
                                    {linkedAddresses.map((address, index) => (
                                      <li key={`${customer.id}-address-${index}`}>
                                        {`${formatCep(address.cep)} • ${address.rua}, ${address.numero} • ${address.bairro} • ${address.cidade}/${address.estado}`}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p>Nenhum endereço cadastrado.</p>
                                )}
                              </div>

                              <div className="gestao-clientes__detail-block">
                                <h4>Alunos vinculados</h4>
                                {detailsLoadingId === customer.id ? (
                                  <p>Carregando alunos...</p>
                                ) : linkedStudents.length ? (
                                  <ul>
                                    {linkedStudents.map((student) => (
                                      <li key={`${customer.id}-student-${student.id}`}>
                                        {student.nome}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p>Nenhum aluno vinculado.</p>
                                )}
                              </div>
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
    );
  }

  async function handleCreate(values: CustomerFormValues) {
    try {
      const createdCustomer = await createCustomer({
        nome: values.nome,
        cpf: values.cpf,
        rg: values.rg,
        email: values.email,
        telefone: values.telefone,
        enderecos: values.addresses
          .filter((address) =>
            address.cep.trim() ||
            address.rua.trim() ||
            address.numero.trim() ||
            address.bairro.trim() ||
            address.cidade.trim() ||
            address.estado.trim() ||
            address.complemento.trim()
          )
          .map((address) => ({
            cep: address.cep,
            rua: address.rua,
            numero: address.numero,
            bairro: address.bairro,
            cidade: address.cidade,
            estado: address.estado,
            pais: address.pais,
            complemento: address.complemento,
          })),
        students: values.students
          .filter((student) => student.nome.trim())
          .map((student) => ({
            ...(student.id ? { id: student.id } : {}),
            nome: student.nome,
            ...(student.nascimento
              ? { nascimento: `${student.nascimento}T00:00:00Z` }
              : {}),
          })),
      });

      upsertCustomer(createdCustomer);
      setFeedback("Cliente cadastrado com sucesso.");

      if (createdCustomer.students?.length) {
        setCustomerStudents((current) => ({
          ...current,
          [createdCustomer.id]: createdCustomer.students ?? [],
        }));
        await loadStudents({ force: true });
      }
      if (createdCustomer.addresses.length) {
        setCustomerAddresses((current) => ({
          ...current,
          [createdCustomer.id]: createdCustomer.addresses.map((address) => ({
            cep: address.cep,
            rua: address.rua,
            numero: address.numero,
            bairro: address.bairro,
            cidade: address.cidade,
            estado: address.estado,
            pais: address.pais,
            complemento: address.complemento,
          })),
        }));
      }
    } catch (error) {
      console.error("Erro ao criar cliente:", error);
      const message =
        error && typeof error === "object" && "response" in error
          ? String((error as { response?: { data?: { error?: string } } }).response?.data?.error ?? "Não foi possível cadastrar o cliente.")
          : "Não foi possível cadastrar o cliente.";
      window.alert(message);
      throw error;
    }
  }

  async function handleEdit(values: CustomerFormValues) {
    if (!editingCustomer) return;

    try {
      const updatedCustomer = await updateCustomer(editingCustomer.id, {
        nome: values.nome,
        ...(values.cpf.trim() ? { cpf: values.cpf } : {}),
        ...(values.rg.trim() ? { rg: values.rg } : {}),
        email: values.email,
        telefone: values.telefone,
        enderecos: values.addresses
          .filter((address) =>
            address.cep.trim() ||
            address.rua.trim() ||
            address.numero.trim() ||
            address.bairro.trim() ||
            address.cidade.trim() ||
            address.estado.trim() ||
            address.complemento.trim()
          )
          .map((address) => ({
            cep: address.cep,
            rua: address.rua,
            numero: address.numero,
            bairro: address.bairro,
            cidade: address.cidade,
            estado: address.estado,
            pais: address.pais,
            complemento: address.complemento,
          })),
        students: values.students
          .filter((student) => student.nome.trim())
          .map((student) => ({
            ...(student.id ? { id: student.id } : {}),
            nome: student.nome,
            ...(student.nascimento
              ? { nascimento: `${student.nascimento}T00:00:00Z` }
              : {}),
          })),
        ativo: editingCustomer.status === "ativo",
      });

      upsertCustomer(updatedCustomer);
      setFeedback("Cliente atualizado com sucesso.");
      if (updatedCustomer.students?.length) {
        setCustomerStudents((current) => ({
          ...current,
          [updatedCustomer.id]: updatedCustomer.students ?? [],
        }));
      }
      setCustomerAddresses((current) => ({
        ...current,
        [updatedCustomer.id]: updatedCustomer.addresses.map((address) => ({
          cep: address.cep,
          rua: address.rua,
          numero: address.numero,
          bairro: address.bairro,
          cidade: address.cidade,
          estado: address.estado,
          pais: address.pais,
          complemento: address.complemento,
        })),
      }));
      setEditingCustomer(null);
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      const message =
        error && typeof error === "object" && "response" in error
          ? String((error as { response?: { data?: { error?: string } } }).response?.data?.error ?? "Não foi possível atualizar o cliente.")
          : "Não foi possível atualizar o cliente.";
      window.alert(message);
      throw error;
    }
  }

  async function handleDelete(customer: CustomerRow) {
    const confirmed = window.confirm(`Deseja desativar o cliente ${customer.nome}?`);
    if (!confirmed) return;

    await deleteCustomer(customer.id);
    upsertCustomer({
      ...customer,
      status: "inativo",
    });
  }

  async function handleToggleExpand(customer: CustomerRow) {
    if (expandedCustomerId === customer.id) {
      setExpandedCustomerId(null);
      return;
    }

    setExpandedCustomerId(customer.id);

    if (customerStudents[customer.id]) return;

    setDetailsLoadingId(customer.id);
    try {
      const [students, addresses] = await Promise.all([
        fetchCustomerStudents(customer.id),
        fetchCustomerAddresses(customer.id),
      ]);
      setCustomerStudents((current) => ({
        ...current,
        [customer.id]: students,
      }));
      setCustomerAddresses((current) => ({
        ...current,
        [customer.id]: addresses,
      }));
    } finally {
      setDetailsLoadingId(null);
    }
  }

  async function handleStartEdit(customer: CustomerRow) {
    const detailedCustomer = await fetchCustomer(customer.id);
    upsertCustomer(detailedCustomer);
    if (detailedCustomer.students?.length) {
      setCustomerStudents((current) => ({
        ...current,
        [customer.id]: detailedCustomer.students ?? [],
      }));
    }
    if (detailedCustomer.addresses.length) {
      setCustomerAddresses((current) => ({
        ...current,
        [customer.id]: detailedCustomer.addresses.map((address) => ({
          cep: address.cep,
          rua: address.rua,
          numero: address.numero,
          bairro: address.bairro,
          cidade: address.cidade,
          estado: address.estado,
          pais: address.pais,
          complemento: address.complemento,
        })),
      }));
    }
    setEditingCustomer(detailedCustomer);
  }

  return (
    <GestaoShell title="Clientes">
      <section className="gestao-clientes">
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
            <h2>Gestão de Clientes</h2>
            <p>Responsáveis financeiros e contratuais</p>
          </div>

          <button
            type="button"
            className="gestao-professores__create-button"
            onClick={() => setCreateOpen(true)}
          >
            <span>＋</span>
            Novo Cliente
          </button>
        </div>

        <div className="gestao-professores__search-card">
          <input
            type="text"
            placeholder="Buscar por nome, email ou CPF..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {renderTable("Clientes Ativos", activeCustomers, "Nenhum cliente ativo encontrado.")}
        {renderTable("Clientes Inativos", inactiveCustomers, "Nenhum cliente inativo encontrado.")}

        <CustomerModal
          open={createOpen}
          mode="create"
          availableStudents={students}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
        />

        <CustomerModal
          open={Boolean(editingCustomer)}
          mode="edit"
          availableStudents={students}
          initialValues={editingCustomer ? buildInitialValues(editingCustomer) : undefined}
          cpfPreview={editingCustomer ? maskDocumentPreview(editingCustomer.cpf) : undefined}
          rgPreview={editingCustomer ? maskDocumentPreview(editingCustomer.rg) : undefined}
          onClose={() => setEditingCustomer(null)}
          onSubmit={handleEdit}
        />
      </section>
    </GestaoShell>
  );
}
