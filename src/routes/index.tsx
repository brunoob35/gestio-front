import { Navigate, Route, Routes } from "react-router-dom";
import type { JSX } from "react";

import LoginPage from "../pages/LoginPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import GestaoHomePage from "../pages/GestaoHomePage";
import GestaoProfessoresPage from "../pages/GestaoProfessoresPage";
import GestaoProfessorViewPage from "../pages/GestaoProfessorViewPage";

import { getUserPermissions, isAuthenticated } from "../services/auth";

function ProfessorHomePage() {
  return <h1>Home do professor</h1>;
}

function PrivateRoute({
  children,
  allowedPermission,
}: {
  children: JSX.Element;
  allowedPermission: number;
}) {
  const authenticated = isAuthenticated();
  const permission = getUserPermissions();

  if (!authenticated) {
    return <Navigate to="/" replace />;
  }

  if (permission !== allowedPermission) {
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
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        path="/gestao"
        element={
          <PrivateRoute allowedPermission={1}>
            <GestaoHomePage />
          </PrivateRoute>
        }
      />

      <Route
        path="/gestao/professores"
        element={
          <PrivateRoute allowedPermission={1}>
            <GestaoProfessoresPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/gestao/professores/:professorID"
        element={
          <PrivateRoute allowedPermission={1}>
            <GestaoProfessorViewPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/professor"
        element={
          <PrivateRoute allowedPermission={2}>
            <ProfessorHomePage />
          </PrivateRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}