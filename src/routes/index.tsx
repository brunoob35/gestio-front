import { Navigate, Route, Routes } from "react-router-dom";
import type { JSX } from "react";

import LoginPage from "../pages/LoginPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import FirstAccessPage from "../pages/FirstAccessPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import GestaoHomePage from "../pages/GestaoHomePage";
import GestaoProfessoresPage from "../pages/GestaoProfessoresPage";
import GestaoProfessorViewPage from "../pages/GestaoProfessorViewPage";
import GestaoTurmasPage from "../pages/GestaoTurmasPage";
import GestaoAlunosPage from "../pages/GestaoAlunosPage";
import GestaoClientesPage from "../pages/GestaoClientesPage";
import GestaoContratosPage from "../pages/GestaoContratosPage";
import GestaoPresencasPage from "../pages/GestaoPresencasPage";
import GestaoSettingsPage from "../pages/GestaoSettingsPage";
import ProfessorHomePage from "../pages/ProfessorHomePage";
import ProfessorClassesPage from "../pages/ProfessorClassesPage";
import ProfessorLessonsPage from "../pages/ProfessorLessonsPage";
import ProfessorSettingsPage from "../pages/ProfessorSettingsPage";
import ProfessorStudentsPage from "../pages/ProfessorStudentsPage";

import { getUserPermissions, isAuthenticated } from "../services/auth";

function PrivateRoute({
  children,
  allowedPermissions,
}: {
  children: JSX.Element;
  allowedPermissions: number[];
}) {
  const authenticated = isAuthenticated();
  const permission = getUserPermissions();

  if (!authenticated) {
    return <Navigate to="/" replace />;
  }

  if (!permission || !allowedPermissions.includes(permission)) {
    if (permission === 1 || permission === 4) {
      return <Navigate to="/gestao" replace />;
    }

    if (permission === 2) {
      return <Navigate to="/professor" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return children;
}

export function AppRoutes() {
  const authenticated = isAuthenticated();
  const permission = getUserPermissions();

  function getInitialRedirect() {
    if (!authenticated) return <LoginPage />;
    if (permission === 1 || permission === 4) {
      return <Navigate to="/gestao" replace />;
    }
    if (permission === 2) {
      return <Navigate to="/professor" replace />;
    }
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route path="/" element={getInitialRedirect()} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/first-access" element={<FirstAccessPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        path="/gestao"
        element={
          <PrivateRoute allowedPermissions={[1, 4]}>
            <GestaoHomePage />
          </PrivateRoute>
        }
      />

      <Route
        path="/gestao/professores"
        element={
          <PrivateRoute allowedPermissions={[1, 4]}>
            <GestaoProfessoresPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/gestao/professores/:professorID"
        element={
          <PrivateRoute allowedPermissions={[1, 4]}>
            <GestaoProfessorViewPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/professor"
        element={
          <PrivateRoute allowedPermissions={[2]}>
            <ProfessorHomePage />
          </PrivateRoute>
        }
      />

      <Route
        path="/professor/turmas"
        element={
          <PrivateRoute allowedPermissions={[2]}>
            <ProfessorClassesPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/professor/aulas"
        element={
          <PrivateRoute allowedPermissions={[2]}>
            <ProfessorLessonsPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/professor/alunos"
        element={
          <PrivateRoute allowedPermissions={[2]}>
            <ProfessorStudentsPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/professor/configuracoes"
        element={
          <PrivateRoute allowedPermissions={[2]}>
            <ProfessorSettingsPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/gestao/alunos"
        element={
          <PrivateRoute allowedPermissions={[1, 4]}>
            <GestaoAlunosPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/gestao/clientes"
        element={
          <PrivateRoute allowedPermissions={[1, 4]}>
            <GestaoClientesPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/gestao/turmas"
        element={
          <PrivateRoute allowedPermissions={[1, 4]}>
            <GestaoTurmasPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/gestao/contratos"
        element={
          <PrivateRoute allowedPermissions={[1, 4]}>
            <GestaoContratosPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/gestao/presencas"
        element={
          <PrivateRoute allowedPermissions={[1, 4]}>
            <GestaoPresencasPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/gestao/configuracoes"
        element={
          <PrivateRoute allowedPermissions={[1, 4]}>
            <GestaoSettingsPage />
          </PrivateRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
