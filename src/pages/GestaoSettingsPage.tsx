import axios from "axios";
import { useEffect, useState } from "react";

import GestaoShell from "../components/gestao/GestaoShell";
import {
  fetchCurrentUser,
  updateCurrentUser,
  updateCurrentUserPassword,
  type UserPayload,
} from "../services/users";

import "./GestaoSettingsPage.css";

type ProfileForm = {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  rg: string;
  nascimento: string;
};

type PasswordForm = {
  senhaAtual: string;
  novaSenha: string;
  confirmarSenha: string;
};

function getApiMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const apiMessage =
      typeof error.response?.data?.error === "string"
        ? error.response.data.error
        : "";
    return apiMessage || fallback;
  }
  return fallback;
}

export default function GestaoSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const [profileForm, setProfileForm] = useState<ProfileForm>({
    nome: "",
    email: "",
    telefone: "",
    cpf: "",
    rg: "",
    nascimento: "",
  });

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    senhaAtual: "",
    novaSenha: "",
    confirmarSenha: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      setLoading(true);
      setProfileError("");

      try {
        const user = await fetchCurrentUser();
        if (cancelled) return;

        setProfileForm({
          nome: user.nome || "",
          email: user.email || "",
          telefone: user.telefone || "",
          cpf: user.cpf || "",
          rg: user.rg || "",
          nascimento: user.nascimento || "",
        });
      } catch (error) {
        if (!cancelled) {
          setProfileError(getApiMessage(error, "Não foi possível carregar os dados do usuário."));
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

  function handleProfileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
    setProfileError("");
    setProfileSuccess("");
  }

  function handlePasswordChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
    setPasswordError("");
    setPasswordSuccess("");
  }

  async function handleSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    const payload: UserPayload = {
      nome: profileForm.nome,
      email: profileForm.email,
      telefone: profileForm.telefone,
      cpf: profileForm.cpf || undefined,
      rg: profileForm.rg || undefined,
      nascimento: profileForm.nascimento || undefined,
    };

    setProfileSaving(true);
    try {
      await updateCurrentUser(payload);
      setProfileSuccess("Dados atualizados com sucesso.");
    } catch (error) {
      setProfileError(getApiMessage(error, "Não foi possível atualizar os dados do usuário."));
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleSavePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (passwordForm.novaSenha.length < 6) {
      setPasswordError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (passwordForm.novaSenha !== passwordForm.confirmarSenha) {
      setPasswordError("As novas senhas não coincidem.");
      return;
    }

    setPasswordSaving(true);
    try {
      await updateCurrentUserPassword({
        senha_atual: passwordForm.senhaAtual,
        nova_senha: passwordForm.novaSenha,
      });

      setPasswordForm({
        senhaAtual: "",
        novaSenha: "",
        confirmarSenha: "",
      });
      setPasswordSuccess("Senha atualizada com sucesso.");
    } catch (error) {
      setPasswordError(getApiMessage(error, "Não foi possível atualizar a senha."));
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <GestaoShell title="Configurações">
      <div className="gestao-settings">
        <section className="gestao-settings__hero">
          <h2>Configurações</h2>
          <p>Atualize seus dados de acesso e informações pessoais.</p>
        </section>

        <div className="gestao-settings__grid">
          <section className="gestao-settings__panel">
            <header className="gestao-settings__panel-header">
              <h3>Meus Dados</h3>
              <p>Essas informações pertencem ao usuário autenticado.</p>
            </header>

            {profileError ? (
              <div className="gestao-settings__feedback gestao-settings__feedback--error">
                {profileError}
              </div>
            ) : null}
            {profileSuccess ? (
              <div className="gestao-settings__feedback gestao-settings__feedback--success">
                {profileSuccess}
              </div>
            ) : null}

            <form className="gestao-settings__form" onSubmit={handleSaveProfile}>
              <div className="gestao-settings__form-grid">
                <label>
                  <span>Nome</span>
                  <input
                    name="nome"
                    value={profileForm.nome}
                    onChange={handleProfileChange}
                    disabled={loading || profileSaving}
                    required
                  />
                </label>

                <label>
                  <span>E-mail</span>
                  <input
                    name="email"
                    type="email"
                    value={profileForm.email}
                    onChange={handleProfileChange}
                    disabled={loading || profileSaving}
                    required
                  />
                </label>

                <label>
                  <span>Telefone</span>
                  <input
                    name="telefone"
                    value={profileForm.telefone}
                    onChange={handleProfileChange}
                    disabled={loading || profileSaving}
                    required
                  />
                </label>

                <label>
                  <span>CPF</span>
                  <input
                    name="cpf"
                    value={profileForm.cpf}
                    onChange={handleProfileChange}
                    disabled={loading || profileSaving}
                  />
                </label>

                <label>
                  <span>RG</span>
                  <input
                    name="rg"
                    value={profileForm.rg}
                    onChange={handleProfileChange}
                    disabled={loading || profileSaving}
                  />
                </label>

                <label>
                  <span>Data de nascimento</span>
                  <input
                    name="nascimento"
                    type="date"
                    value={profileForm.nascimento}
                    onChange={handleProfileChange}
                    disabled={loading || profileSaving}
                  />
                </label>
              </div>

              <div className="gestao-settings__actions">
                <button type="submit" disabled={loading || profileSaving}>
                  {profileSaving ? "Salvando..." : "Salvar dados"}
                </button>
              </div>
            </form>
          </section>

          <section className="gestao-settings__panel">
            <header className="gestao-settings__panel-header">
              <h3>Trocar Senha</h3>
              <p>Use sua senha atual para confirmar a alteração.</p>
            </header>

            {passwordError ? (
              <div className="gestao-settings__feedback gestao-settings__feedback--error">
                {passwordError}
              </div>
            ) : null}
            {passwordSuccess ? (
              <div className="gestao-settings__feedback gestao-settings__feedback--success">
                {passwordSuccess}
              </div>
            ) : null}

            <form className="gestao-settings__form" onSubmit={handleSavePassword}>
              <div className="gestao-settings__form-grid gestao-settings__form-grid--single">
                <label>
                  <span>Senha atual</span>
                  <input
                    name="senhaAtual"
                    type="password"
                    value={passwordForm.senhaAtual}
                    onChange={handlePasswordChange}
                    disabled={passwordSaving}
                    required
                  />
                </label>

                <label>
                  <span>Nova senha</span>
                  <input
                    name="novaSenha"
                    type="password"
                    value={passwordForm.novaSenha}
                    onChange={handlePasswordChange}
                    disabled={passwordSaving}
                    required
                  />
                </label>

                <label>
                  <span>Confirmar nova senha</span>
                  <input
                    name="confirmarSenha"
                    type="password"
                    value={passwordForm.confirmarSenha}
                    onChange={handlePasswordChange}
                    disabled={passwordSaving}
                    required
                  />
                </label>
              </div>

              <div className="gestao-settings__actions">
                <button type="submit" disabled={passwordSaving}>
                  {passwordSaving ? "Salvando..." : "Atualizar senha"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </GestaoShell>
  );
}
