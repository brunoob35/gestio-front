import axios from "axios";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { api } from "../services/api";
import "./AuthPages.css";

type FirstAccessResponse = {
  message: string;
};

export default function FirstAccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const email = useMemo(() => searchParams.get("email") || "", [searchParams]);

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacaoSenha, setConfirmacaoSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErro("");
    setSucesso("");

    if (!token) {
      setErro("Token de primeiro acesso não encontrado.");
      return;
    }

    if (novaSenha.length < 6) {
      setErro("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (novaSenha !== confirmacaoSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post<FirstAccessResponse>("/auth/first-access", {
        token,
        nova_senha: novaSenha,
      });

      setSucesso(response.data?.message || "Senha inicial cadastrada com sucesso.");
      setNovaSenha("");
      setConfirmacaoSenha("");

      setTimeout(() => {
        navigate("/", { replace: true });
      }, 1800);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiMessage =
          typeof error.response?.data?.error === "string"
            ? error.response.data.error
            : "";
        setErro(apiMessage || "Não foi possível cadastrar a primeira senha.");
      } else {
        setErro("Não foi possível cadastrar a primeira senha.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <header className="auth-header">
          <div className="auth-logo">🎓</div>
          <h1 className="auth-title">Primeiro acesso</h1>
          <p className="auth-subtitle">
            {email
              ? `Defina sua senha inicial para a conta ${email}.`
              : "Defina sua senha inicial para acessar o sistema."}
          </p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="novaSenha">
              Nova senha
            </label>

            <input
              className="form-input"
              id="novaSenha"
              type="password"
              placeholder="••••••••"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmacaoSenha">
              Confirmar nova senha
            </label>

            <input
              className="form-input"
              id="confirmacaoSenha"
              type="password"
              placeholder="••••••••"
              value={confirmacaoSenha}
              onChange={(e) => setConfirmacaoSenha(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          {erro && <p className="auth-error">{erro}</p>}
          {sucesso && <p className="auth-success">{sucesso}</p>}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "Salvando..." : "Cadastrar senha"}
          </button>
        </form>

        <div className="auth-helper">
          <button
            type="button"
            className="auth-helper-text"
            onClick={() => navigate("/", { replace: true })}
          >
            Voltar para o login
          </button>
        </div>
      </section>
    </main>
  );
}
