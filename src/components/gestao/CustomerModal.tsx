import { useEffect, useState } from "react";
import type { StudentRow } from "../../services/students";
import "./CustomerModal.css";

export type CustomerAddressFormValues = {
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  pais: string;
  complemento: string;
};

export type CustomerStudentFormValues = {
  id?: number;
  mode?: "existing" | "new";
  query?: string;
  nome: string;
  nascimento: string;
};

const BRAZIL_STATES = [
  "Acre",
  "Alagoas",
  "Amapá",
  "Amazonas",
  "Bahia",
  "Ceará",
  "Distrito Federal",
  "Espírito Santo",
  "Goiás",
  "Maranhão",
  "Mato Grosso",
  "Mato Grosso do Sul",
  "Minas Gerais",
  "Pará",
  "Paraíba",
  "Paraná",
  "Pernambuco",
  "Piauí",
  "Rio de Janeiro",
  "Rio Grande do Norte",
  "Rio Grande do Sul",
  "Rondônia",
  "Roraima",
  "Santa Catarina",
  "São Paulo",
  "Sergipe",
  "Tocantins",
];

export type CustomerFormValues = {
  nome: string;
  cpf: string;
  rg: string;
  email: string;
  telefone: string;
  addresses: CustomerAddressFormValues[];
  students: CustomerStudentFormValues[];
};

type CustomerModalProps = {
  open: boolean;
  mode: "create" | "edit";
  availableStudents: StudentRow[];
  initialValues?: CustomerFormValues;
  onClose: () => void;
  onSubmit: (values: CustomerFormValues) => Promise<void>;
};

const emptyValues: CustomerFormValues = {
  nome: "",
  cpf: "",
  rg: "",
  email: "",
  telefone: "",
  addresses: [],
  students: [],
};

const emptyStudent: CustomerStudentFormValues = {
  mode: "existing",
  query: "",
  nome: "",
  nascimento: "",
};

const emptyAddress: CustomerAddressFormValues = {
  cep: "",
  rua: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  pais: "Brasil",
  complemento: "",
};

export default function CustomerModal({
  open,
  mode,
  availableStudents,
  initialValues,
  onClose,
  onSubmit,
}: CustomerModalProps) {
  const [values, setValues] = useState<CustomerFormValues>(emptyValues);
  const [activeTab, setActiveTab] = useState<"customer" | "addresses" | "students">("customer");
  const [loading, setLoading] = useState(false);
  const [loadingCepIndex, setLoadingCepIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const nextValues =
      initialValues ?? {
        ...emptyValues,
        addresses: [{ ...emptyAddress }],
      };

    setValues({
      ...nextValues,
      students: nextValues.students.map((student) => ({
        ...student,
        mode: student.id ? "existing" : (student.mode ?? "existing"),
        query: student.id
          ? buildStudentOptionValue({
              id: student.id,
              code: `A${String(student.id).padStart(3, "0")}`,
              nome: student.nome,
              status: "ativo",
              nascimento: student.nascimento || undefined,
            })
          : (student.query ?? ""),
      })),
    });
    setActiveTab("customer");
  }, [initialValues, open]);

  if (!open) return null;

  const currentLinkedStudentIds = values.students
    .map((student) => student.id)
    .filter((studentId): studentId is number => Boolean(studentId));

  const eligibleStudents = availableStudents.filter(
    (student) => !student.responsavel || currentLinkedStudentIds.includes(student.id)
  );

  function updateField<Key extends keyof CustomerFormValues>(field: Key, value: CustomerFormValues[Key]) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function formatCep(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, "");

    if (digits.length <= 11) {
      const local = digits.slice(0, 11);
      if (local.length <= 2) return local ? `(${local}` : "";
      if (local.length <= 7) return `(${local.slice(0, 2)}) ${local.slice(2)}`;
      if (local.length <= 10) {
        return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
      }
      return `(${local.slice(0, 2)}) ${local.slice(2, 3)} ${local.slice(3, 7)}-${local.slice(7)}`;
    }

    const country = digits.slice(0, 2);
    const area = digits.slice(2, 4);
    const rest = digits.slice(4, 13);

    if (rest.length <= 4) return `+${country} (${area}) ${rest}`.trim();
    if (rest.length <= 8) return `+${country} (${area}) ${rest.slice(0, 4)}-${rest.slice(4)}`.trim();
    return `+${country} (${area}) ${rest.slice(0, 1)} ${rest.slice(1, 5)}-${rest.slice(5, 9)}`.trim();
  }

  function updateStudent(index: number, field: keyof CustomerStudentFormValues, value: string) {
    setValues((current) => ({
      ...current,
      students: current.students.map((student, studentIndex) =>
        studentIndex === index
          ? {
              ...student,
              [field]: value,
            }
          : student
      ),
    }));
  }

  function buildStudentOptionValue(student: StudentRow) {
    return `${student.nome} (${student.code})`;
  }

  function switchStudentMode(index: number, nextMode: "existing" | "new") {
    setValues((current) => ({
      ...current,
      students: current.students.map((student, studentIndex) =>
        studentIndex === index
          ? {
              ...student,
              mode: nextMode,
              id: undefined,
              query: "",
              nome: "",
              nascimento: "",
            }
          : student
      ),
    }));
  }

  function handleExistingStudentQueryChange(index: number, value: string) {
    const matchedStudent = eligibleStudents.find(
      (student) => buildStudentOptionValue(student) === value
    );

    setValues((current) => ({
      ...current,
      students: current.students.map((student, studentIndex) =>
        studentIndex === index
          ? matchedStudent
            ? {
                ...student,
                mode: "existing",
                id: matchedStudent.id,
                query: value,
                nome: matchedStudent.nome,
                nascimento: matchedStudent.nascimento
                  ? String(matchedStudent.nascimento).slice(0, 10)
                  : "",
              }
            : {
                ...student,
                mode: "existing",
                id: undefined,
                query: value,
                nome: "",
                nascimento: "",
              }
          : student
      ),
    }));
  }

  function updateAddress(index: number, field: keyof CustomerAddressFormValues, value: string) {
    setValues((current) => ({
      ...current,
      addresses: current.addresses.map((address, addressIndex) =>
        addressIndex === index
          ? {
              ...address,
              [field]: value,
            }
          : address
      ),
    }));
  }

  function isAddressEmpty(address: CustomerAddressFormValues) {
    return ![
      address.cep,
      address.rua,
      address.numero,
      address.bairro,
      address.cidade,
      address.estado,
      address.pais,
      address.complemento,
    ].some((field) => field.trim());
  }

  async function lookupCep(index: number, cepValue: string) {
    const digits = cepValue.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setLoadingCepIndex(index);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = (await response.json()) as Record<string, unknown>;

      if (data.erro === true) return;

      setValues((current) => ({
        ...current,
        addresses: current.addresses.map((address, addressIndex) =>
          addressIndex === index
            ? {
                ...address,
                cep: formatCep(String(data.cep ?? digits)),
                rua: String(data.logradouro ?? address.rua ?? ""),
                bairro: String(data.bairro ?? address.bairro ?? ""),
                cidade: String(data.localidade ?? address.cidade ?? ""),
                estado: String(data.estado ?? data.uf ?? address.estado ?? ""),
                pais: address.pais || "Brasil",
              }
            : address
        ),
      }));
    } catch (error) {
      console.error("Erro ao consultar CEP:", error);
    } finally {
      setLoadingCepIndex((current) => (current === index ? null : current));
    }
  }

  function addStudent() {
    setValues((current) => ({
      ...current,
      students: [...current.students, { ...emptyStudent }],
    }));
  }

  function removeStudent(index: number) {
    setValues((current) => ({
      ...current,
      students: current.students.filter((_, studentIndex) => studentIndex !== index),
    }));
  }

  function addAddress() {
    setValues((current) => ({
      ...current,
      addresses: [...current.addresses, { ...emptyAddress }],
    }));
  }

  function removeAddress(index: number) {
    setValues((current) => ({
      ...current,
      addresses: current.addresses.filter((_, addressIndex) => addressIndex !== index),
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!values.nome.trim() || !values.cpf.trim() || !values.telefone.trim()) {
      setActiveTab("customer");
      window.alert("Preencha nome, CPF e telefone do cliente antes de salvar.");
      return;
    }

    const addresses = values.addresses.filter((address) => !isAddressEmpty(address));
    if (!addresses.length) {
      setActiveTab("addresses");
      window.alert("Adicione ao menos um endereço para cadastrar o cliente.");
      return;
    }

    const invalidAddress = addresses.find(
      (address) =>
        !address.cep.trim() ||
        !address.rua.trim() ||
        !address.numero.trim() ||
        !address.bairro.trim() ||
        !address.cidade.trim() ||
        !address.estado.trim()
    );

    if (invalidAddress) {
      setActiveTab("addresses");
      window.alert("Preencha CEP, rua, número, bairro, cidade e estado do endereço antes de salvar.");
      return;
    }

    setLoading(true);

    try {
      await onSubmit(values);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="customer-modal__backdrop" onClick={onClose}>
      <div className="customer-modal" onClick={(event) => event.stopPropagation()}>
        <div className="customer-modal__header">
          <h2>{mode === "create" ? "Cadastrar Novo Cliente" : "Editar Cliente"}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar modal">
            ×
          </button>
        </div>

        <div className="customer-modal__tabs">
          <button
            type="button"
            className={activeTab === "customer" ? "is-active" : ""}
            onClick={() => setActiveTab("customer")}
          >
            Dados do Cliente
          </button>
          <button
            type="button"
            className={activeTab === "addresses" ? "is-active" : ""}
            onClick={() => setActiveTab("addresses")}
          >
            Endereços
          </button>
          <button
            type="button"
            className={activeTab === "students" ? "is-active" : ""}
            onClick={() => setActiveTab("students")}
          >
            Alunos
          </button>
        </div>

        <form className="customer-modal__form" onSubmit={handleSubmit}>
          {activeTab === "customer" ? (
            <div className="customer-modal__grid">
              <label>
                <span>Nome Completo *</span>
                <input
                  type="text"
                  value={values.nome}
                  onChange={(event) => updateField("nome", event.target.value)}
                  required
                />
              </label>

              <label>
                <span>CPF *</span>
                <input
                  type="text"
                  value={values.cpf}
                  onChange={(event) => updateField("cpf", event.target.value)}
                  placeholder="000.000.000-00"
                  required
                />
              </label>

              <label>
                <span>RG</span>
                <input
                  type="text"
                  value={values.rg}
                  onChange={(event) => updateField("rg", event.target.value)}
                  placeholder="00.000.000-0"
                />
              </label>

              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={values.email}
                  onChange={(event) => updateField("email", event.target.value)}
                />
              </label>

              <label>
                <span>Telefone *</span>
                <input
                  type="text"
                  value={values.telefone}
                  onChange={(event) => updateField("telefone", formatPhone(event.target.value))}
                  placeholder="(00) 00000-0000"
                  required
                />
              </label>

            </div>
          ) : activeTab === "addresses" ? (
            <div className="customer-modal__students-tab">
              <div className="customer-modal__students-header">
                <div>
                  <h3>Endereços do cliente</h3>
                  <p>Você pode adicionar um ou mais endereços no cadastro do cliente.</p>
                </div>

                <button type="button" className="customer-modal__add-student" onClick={addAddress}>
                  + Novo Endereço
                </button>
              </div>

              {values.addresses.length ? (
                <div className="customer-modal__students-list">
                  {values.addresses.map((address, index) => (
                    <div key={`address-${index}`} className="customer-modal__student-card">
                      <div className="customer-modal__student-card-header">
                        <strong>Endereço {index + 1}</strong>
                        <button type="button" onClick={() => removeAddress(index)}>
                          Remover
                        </button>
                      </div>

                      <div className="customer-modal__grid">
                        <label>
                          <span>CEP *</span>
                          <div className="customer-modal__input-with-indicator">
                            <input
                              type="text"
                              value={address.cep}
                              onChange={(event) => updateAddress(index, "cep", formatCep(event.target.value))}
                              onBlur={(event) => void lookupCep(index, event.target.value)}
                              placeholder="00000-000"
                            />
                            {loadingCepIndex === index ? (
                              <span className="customer-modal__spinner" aria-hidden="true" />
                            ) : null}
                          </div>
                        </label>

                        <label>
                          <span>Rua / Logradouro *</span>
                          <input
                            type="text"
                            value={address.rua}
                            onChange={(event) => updateAddress(index, "rua", event.target.value)}
                          />
                        </label>

                        <label>
                          <span>Número *</span>
                          <input
                            type="text"
                            value={address.numero}
                            onChange={(event) => updateAddress(index, "numero", event.target.value)}
                          />
                        </label>

                        <label>
                          <span>Complemento</span>
                          <input
                            type="text"
                            value={address.complemento}
                            onChange={(event) => updateAddress(index, "complemento", event.target.value)}
                          />
                        </label>

                        <label>
                          <span>Bairro *</span>
                          <input
                            type="text"
                            value={address.bairro}
                            onChange={(event) => updateAddress(index, "bairro", event.target.value)}
                          />
                        </label>

                        <label>
                          <span>Cidade *</span>
                          <input
                            type="text"
                            value={address.cidade}
                            onChange={(event) => updateAddress(index, "cidade", event.target.value)}
                          />
                        </label>

                        <label>
                          <span>Estado *</span>
                          <input
                            type="text"
                            value={address.estado}
                            onChange={(event) => updateAddress(index, "estado", event.target.value)}
                            list="customer-modal-brazil-states"
                          />
                        </label>

                        <label>
                          <span>País</span>
                          <input
                            type="text"
                            value={address.pais}
                            onChange={(event) => updateAddress(index, "pais", event.target.value)}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="customer-modal__students-empty">
                  <p>Nenhum endereço adicional foi configurado.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="customer-modal__students-tab">
              <div className="customer-modal__students-header">
                <div>
                  <h3>{mode === "create" ? "Alunos vinculados na criação" : "Alunos vinculados ao cliente"}</h3>
                  <p>
                    {mode === "create"
                      ? "Se nenhum aluno for preenchido, o sistema cria apenas o cliente."
                      : "Você pode adicionar novos alunos ou remover vínculos existentes deste cliente."}
                  </p>
                </div>

                <button type="button" className="customer-modal__add-student" onClick={addStudent}>
                  + Novo Aluno
                </button>
              </div>

              {values.students.length ? (
                <div className="customer-modal__students-list">
                  {values.students.map((student, index) => (
                    <div key={`student-${index}`} className="customer-modal__student-card">
                      <div className="customer-modal__student-card-header">
                        <strong>Aluno {index + 1}</strong>
                        <button type="button" onClick={() => removeStudent(index)}>
                          Remover
                        </button>
                      </div>

                      <div className="customer-modal__student-mode">
                        <button
                          type="button"
                          className={student.mode !== "new" ? "is-active" : ""}
                          onClick={() => switchStudentMode(index, "existing")}
                        >
                          Selecionar existente
                        </button>
                        <button
                          type="button"
                          className={student.mode === "new" ? "is-active" : ""}
                          onClick={() => switchStudentMode(index, "new")}
                        >
                          Criar novo
                        </button>
                      </div>

                      <div className="customer-modal__grid">
                        {student.mode === "new" ? (
                          <>
                            <label>
                              <span>Nome do Aluno</span>
                              <input
                                type="text"
                                value={student.nome}
                                onChange={(event) => updateStudent(index, "nome", event.target.value)}
                              />
                            </label>

                            <label>
                              <span>Data de Nascimento</span>
                              <input
                                type="date"
                                value={student.nascimento}
                                onChange={(event) => updateStudent(index, "nascimento", event.target.value)}
                              />
                            </label>
                          </>
                        ) : (
                          <>
                            <label className="customer-modal__full-width">
                              <span>Aluno existente</span>
                              <input
                                type="text"
                                value={student.query ?? ""}
                                onChange={(event) =>
                                  handleExistingStudentQueryChange(index, event.target.value)
                                }
                                list="customer-modal-students"
                                placeholder="Digite para buscar um aluno sem cliente vinculado"
                              />
                            </label>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="customer-modal__students-empty">
                  <p>Nenhum aluno adicional foi configurado.</p>
                </div>
              )}
            </div>
          )}

          <div className="customer-modal__actions">
            <button type="button" className="customer-modal__secondary" onClick={onClose}>
              Cancelar
            </button>

            <button type="submit" className="customer-modal__primary" disabled={loading}>
              {loading
                ? "Salvando..."
                : mode === "create"
                  ? "Cadastrar Cliente"
                  : "Salvar Cliente"}
            </button>
          </div>
        </form>

        <datalist id="customer-modal-brazil-states">
          {BRAZIL_STATES.map((state) => (
            <option key={state} value={state} />
          ))}
        </datalist>

        <datalist id="customer-modal-students">
          {eligibleStudents.map((student) => (
            <option key={student.id} value={buildStudentOptionValue(student)} />
          ))}
        </datalist>
      </div>
    </div>
  );
}
