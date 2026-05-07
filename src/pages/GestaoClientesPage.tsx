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
import "./GestaoClientesPage.css";

type CustomerStudentsState = Record<number, StudentRow[]>;

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function buildInitialValues(customer: CustomerRow): CustomerFormValues {
  return {
    nome: customer.nome,
    cpf: customer.cpf,
    rg: customer.rg,
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
    hasLoadedCustomers,
    hasLoadedStudents,
    loadCustomers,
    loadStudents,
    upsertCustomer,
  } = useGestaoData();

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRow | null>(null);
  const [expandedCustomerId, setExpandedCustomerId] = useState<number | null>(null);
  const [customerStudents, setCustomerStudents] = useState<CustomerStudentsState>({});
  const [customerAddresses, setCustomerAddresses] = useState<Record<number, CustomerAddressFormValues[]>>({});
  const [detailsLoadingId, setDetailsLoadingId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        await Promise.all([
          loadCustomers(),
          loadStudents(),
        ]);
      } finally {
        setLoading(false);
      }
    }

    if (hasLoadedCustomers && hasLoadedStudents) {
      setLoading(false);
      void loadCustomers();
      void loadStudents();
      return;
    }

    setLoading(true);
    void load();
  }, [hasLoadedCustomers, hasLoadedStudents, loadCustomers, loadStudents]);

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return customers;

    return customers.filter((customer) => {
      return (
        customer.nome.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term) ||
        customer.cpf.toLowerCase().includes(term)
      );
    });
  }, [customers, search]);

  const activeCustomers = useMemo(
    () => filteredCustomers.filter((customer) => customer.status === "ativo"),
    [filteredCustomers]
  );

  const inactiveCustomers = useMemo(
    () => filteredCustomers.filter((customer) => customer.status === "inativo"),
    [filteredCustomers]
  );

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
                <th>ID</th>
                <th>Nome</th>
                <th>CPF</th>
                <th>Contato</th>
                <th>Alunos</th>
                <th>Contratos</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="gestao-professores__empty">
                    Carregando clientes...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="gestao-professores__empty">
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
                        <td>{customer.code}</td>
                        <td>{customer.nome}</td>
                        <td>{customer.cpf}</td>
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
                            <button type="button" onClick={() => void handleToggleExpand(customer)}>
                              <img src={eyeIcon} alt="Ver cliente" />
                            </button>

                            <button type="button" onClick={() => void handleStartEdit(customer)}>
                              <img src={pencilIcon} alt="Editar cliente" />
                            </button>

                            <button type="button" onClick={() => handleDelete(customer)}>
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
                          <td colSpan={8}>
                            <div className="gestao-clientes__details-card">
                              <div className="gestao-clientes__detail-block">
                                <h4>Endereços</h4>
                                {detailsLoadingId === customer.id ? (
                                  <p>Carregando endereços...</p>
                                ) : linkedAddresses.length ? (
                                  <ul className="gestao-clientes__address-list">
                                    {linkedAddresses.map((address, index) => (
                                      <li key={`${customer.id}-address-${index}`} className="gestao-clientes__address-card">
                                        <div className="gestao-clientes__address-main">
                                          <strong>
                                            {address.rua || "Logradouro não informado"}
                                            {address.numero ? `, ${address.numero}` : ""}
                                          </strong>
                                          <span>
                                            {address.complemento || "Sem complemento"}
                                          </span>
                                        </div>

                                        <div className="gestao-clientes__address-meta">
                                          <span>
                                            {[address.bairro, address.cidade, address.estado]
                                              .filter(Boolean)
                                              .join(" • ")}
                                          </span>
                                          <span>{address.pais || "Brasil"}</span>
                                        </div>

                                        <span className="gestao-clientes__address-cep">
                                          {address.cep ? formatCep(address.cep) : "CEP não informado"}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p>Nenhum endereço informado.</p>
                                )}
                              </div>

                              <div className="gestao-clientes__detail-block">
                                <h4>Alunos vinculados</h4>
                                {detailsLoadingId === customer.id ? (
                                  <p>Carregando alunos vinculados...</p>
                                ) : linkedStudents.length ? (
                                  <ul className="gestao-clientes__student-list">
                                    {linkedStudents.map((student) => (
                                      <li key={student.id}>
                                        <strong>{student.nome}</strong>
                                        <span>{student.status}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p>Nenhum aluno vinculado a este cliente.</p>
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
          onClose={() => setEditingCustomer(null)}
          onSubmit={handleEdit}
        />
      </section>
    </GestaoShell>
  );
}
