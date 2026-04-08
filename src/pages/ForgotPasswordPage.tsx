import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../services/api";
import "./AuthPages.css";

type ForgotPasswordResponse = {
  message: string;
};

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErro("");
    setSucesso("");
    setLoading(true);

    try {
      const response = await api.post<ForgotPasswordResponse>(
        "/auth/forgot-password",
        { email }
      );

      setSucesso(
        response.data?.message ||
          "Se o email existir, um link de recuperação foi enviado."
      );

      setEmail("");
    } catch {
      setErro("Não foi possível enviar o link de recuperação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <header className="auth-header">
          <div className="auth-logo">🎓</div>
          <h1 className="auth-title">Recuperar senha</h1>
          <p className="auth-subtitle">
            Informe seu email para receber o link de redefinição.
          </p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email
            </label>

            <input
              className="form-input"
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
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
            {loading ? "Enviando..." : "Enviar link"}
          </button>
        </form>

        <div className="auth-helper">
          <button
            type="button"
            className="auth-helper-text"
            onClick={() => navigate("/")}
          >
            Voltar para o login
          </button>
        </div>
      </section>
    </main>
  );
}