import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../services/api";
import { decodeToken, saveToken } from "../services/auth";

import "./LoginPage.css";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErro("");
    setLoading(true);

    try {
      const response = await api.post<string>("/login", {
        email,
        senha,
      });

      const token = response.data;

      if (!token || typeof token !== "string") {
        setErro("Token inválido recebido do servidor.");
        return;
      }

      saveToken(token);

      const decoded = decodeToken(token);

      if (!decoded) {
        setErro("Não foi possível decodificar o token.");
        return;
      }

      if (decoded.permissions === 1 || decoded.permissions === 4) {
        navigate("/gestao", { replace: true });
        return;
      }

      if (decoded.permissions === 2) {
        navigate("/professor", { replace: true });
        return;
      }

      setErro("Permissão de usuário não reconhecida.");
    } catch (error) {
      setErro("Email ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <header className="login-header">
          <div className="login-logo">🎓</div>
          <h1 className="login-title">Gestio</h1>
          <p className="login-subtitle">
            Sistema de Gestão Educacional
          </p>
        </header>

        <form className="login-form" onSubmit={handleSubmit}>
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

          <div className="form-group">
            <label className="form-label" htmlFor="senha">
              Senha
            </label>

            <input
              className="form-input"
              id="senha"
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {erro && <p className="login-error">{erro}</p>}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="login-helper">
          <button type="button" className="login-helper-text">
            Esqueci minha senha
          </button>
        </div>

        <div className="demo-box">
          <p className="demo-title">Contas de demonstração</p>

          <div className="demo-item">
            <span className="demo-role">Gestor:</span>
            <span>gestor@gestio.com / gestor</span>
          </div>

          <div className="demo-item">
            <span className="demo-role">Professor:</span>
            <span>professor@gestio.com / professor</span>
          </div>
        </div>
      </section>
    </main>
  );
}