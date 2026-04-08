import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { api } from "../services/api";
import "./AuthPages.css";

type ResetPasswordResponse = {
  message: string;
};

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

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
      setErro("Token de recuperação não encontrado.");
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
      const response = await api.post<ResetPasswordResponse>(
        "/auth/reset-password",
        {
          token,
          nova_senha: novaSenha,
        }
      );

      setSucesso(
        response.data?.message || "Senha redefinida com sucesso."
      );

      setNovaSenha("");
      setConfirmacaoSenha("");

      setTimeout(() => {
        navigate("/", { replace: true });
      }, 2000);
    } catch {
      setErro("Não foi possível redefinir a senha. Verifique o link recebido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <header className="auth-header">
          <div className="auth-logo">🎓</div>
          <h1 className="auth-title">Nova senha</h1>
          <p className="auth-subtitle">
            Defina uma nova senha para acessar o sistema.
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

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? "Salvando..." : "Redefinir senha"}
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