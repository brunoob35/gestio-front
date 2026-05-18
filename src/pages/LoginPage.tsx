import axios from "axios";
import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../services/api";
import { decodeToken, saveToken } from "../services/auth";
import dashboardIcon from "../assets/icons/dashboard-svgrepo-com.svg";

import "./LoginPage.css";

type LoginResponse = {
  token?: string;
  first_access?: boolean;
  email?: string;
};

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
      const response = await api.post<LoginResponse>("/login", {
        email,
        senha,
      });

      const token = response.data?.token;

      if (response.data?.first_access && token) {
        navigate(
          `/first-access?token=${encodeURIComponent(token)}&email=${encodeURIComponent(
            response.data.email || email
          )}`,
          { replace: true }
        );
        return;
      }

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
      if (axios.isAxiosError(error)) {
        const apiMessage =
          typeof error.response?.data?.error === "string"
            ? error.response.data.error
            : "";
        setErro(apiMessage || "Email ou senha inválidos.");
      } else {
        setErro("Email ou senha inválidos.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <header className="login-header">
          <div className="login-logo">
            <img src={dashboardIcon} alt="Gestio" />
          </div>
          <h1 className="login-title">Gestio</h1>
          <p className="login-subtitle">Sistema de Gestão Educacional</p>
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
          <p className="login-helper-note">
            No primeiro acesso, informe seu e-mail para cadastrar a senha inicial.
          </p>
          <button
            type="button"
            className="login-helper-text"
            onClick={() => navigate("/forgot-password")}
          >
            Esqueci minha senha
          </button>
        </div>
      </section>
    </main>
  );
}
