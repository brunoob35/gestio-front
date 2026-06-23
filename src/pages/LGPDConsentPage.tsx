import axios from "axios";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import "./AuthPages.css";
import { getUserPermissions, hasPermission, clearLGPDPending, isAuthenticated, isLGPDPending } from "../services/auth";
import { fetchCurrentUser, updateCurrentUser } from "../services/users";

export default function LGPDConsentPage() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/", { replace: true });
      return;
    }

    let cancelled = false;

    async function loadUser() {
      try {
        const user = await fetchCurrentUser();
        if (cancelled) return;

        if (user.lgpd_aceito) {
          clearLGPDPending();
          redirectByPermission();
          return;
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            axios.isAxiosError(loadError) && typeof loadError.response?.data?.error === "string"
              ? loadError.response.data.error
              : "Não foi possível carregar os dados do usuário."
          );
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
        }
      }
    }

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (!initialLoading && !isLGPDPending()) {
      redirectByPermission();
    }
  }, [initialLoading, navigate]);

  function redirectByPermission() {
    const permission = getUserPermissions();

    if (hasPermission(permission, 1) || hasPermission(permission, 4)) {
      navigate("/gestao", { replace: true });
      return;
    }

    if (hasPermission(permission, 2)) {
      navigate("/professor", { replace: true });
      return;
    }

    navigate("/", { replace: true });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!checked) {
      setError("É necessário registrar o aceite LGPD para continuar.");
      return;
    }

    setLoading(true);

    try {
      const user = await fetchCurrentUser();
      await updateCurrentUser({
        nome: user.nome,
        email: user.email,
        telefone: user.telefone,
        cpf: user.cpf || undefined,
        rg: user.rg || undefined,
        nascimento: user.nascimento || undefined,
        lgpd_aceito: true,
        lgpd_finalidade:
          "Cadastro funcional, gestão contratual, comunicação operacional e uso interno da plataforma TreeHouse.",
      });

      clearLGPDPending();
      redirectByPermission();
    } catch (submitError) {
      setError(
        axios.isAxiosError(submitError) && typeof submitError.response?.data?.error === "string"
          ? submitError.response.data.error
          : "Não foi possível registrar o aceite LGPD."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <header className="auth-header">
          <div className="auth-logo">🔒</div>
          <h1 className="auth-title">Aceite LGPD</h1>
          <p className="auth-subtitle">
            Antes de acessar a plataforma, precisamos registrar seu aceite para o tratamento de dados pessoais
            utilizado na operacao da TreeHouse.
          </p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-consent-card">
            <p className="auth-consent-intro">
              A TreeHouse realiza o tratamento de dados pessoais para viabilizar o cadastro no sistema,
              a administracao de contratos, a comunicacao operacional e a execucao das atividades
              pedagogicas e administrativas relacionadas aos servicos prestados.
            </p>

            <div className="auth-consent-section">
              <strong>Finalidades principais</strong>
              <ul className="auth-consent-list">
                <li>identificacao de usuarios, clientes, responsaveis e alunos na plataforma;</li>
                <li>elaboracao, formalizacao, execucao e acompanhamento de contratos;</li>
                <li>organizacao de agenda, aulas, turmas, frequencia, contatos e historico operacional;</li>
                <li>comunicacao entre equipe interna, professores, clientes e responsaveis;</li>
                <li>cumprimento de obrigacoes legais, regulatórias, contratuais e administrativas.</li>
              </ul>
            </div>

            <div className="auth-consent-section">
              <strong>Compartilhamento operacional necessario</strong>
              <p className="auth-consent-text">
                Quando necessario para a prestacao do servico, especialmente nas aulas domiciliares,
                dados de identificacao, contato e endereco poderao ser disponibilizados a professora
                responsavel pela aula, estritamente para viabilizar o deslocamento, o atendimento e a
                execucao adequada do servico contratado.
              </p>
            </div>

            <div className="auth-consent-section">
              <strong>Escopo do aceite</strong>
              <p className="auth-consent-text">
                Ao prosseguir, voce declara estar ciente de que seus dados serao tratados para as
                finalidades acima, de forma compativel com a operacao da plataforma e com os documentos
                contratuais e internos aplicaveis.
              </p>
            </div>
          </div>

          <label className="auth-consent-check">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => setChecked(event.target.checked)}
              disabled={loading || initialLoading}
            />
            <span className="auth-consent-check-text">
              Declaro que li e estou ciente do tratamento dos meus dados pessoais para cadastro,
              gestao contratual, comunicacao operacional, uso interno da plataforma e, quando aplicavel,
              compartilhamento com a professora responsavel para realizacao de aulas domiciliares.
            </span>
          </label>

          {error ? <p className="auth-error">{error}</p> : null}

          <button type="submit" className="auth-button" disabled={loading || initialLoading}>
            {loading ? "Salvando..." : "Aceitar e continuar"}
          </button>
        </form>
      </section>
    </main>
  );
}
