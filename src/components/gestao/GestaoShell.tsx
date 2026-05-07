import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { clearToken } from "../../services/auth";

import barsIcon from "../../assets/icons/bars-svgrepo-com.svg";
import dashboardIcon from "../../assets/icons/dashboard-svgrepo-com.svg";
import bookOpenIcon from "../../assets/icons/book-open-svgrepo-com.svg";
import userGroupIcon from "../../assets/icons/user-group-svgrepo-com.svg";
import userCircleIcon from "../../assets/icons/user-circle-svgrepo-com.svg";
import studentIcon from "../../assets/icons/student-svgrepo-com.svg";
import fileAltIcon from "../../assets/icons/file-alt-svgrepo-com.svg";
import calendarIcon from "../../assets/icons/calendar-check-svgrepo-com.svg";
import graphIcon from "../../assets/icons/graph-svgrepo-com.svg";
import settingsIcon from "../../assets/icons/setting-5-svgrepo-com.svg";
import exitIcon from "../../assets/icons/exit-svgrepo-com.svg";

import "./GestaoShell.css";

type GestaoShellProps = {
  title: string;
  children: React.ReactNode;
};

type MenuItem = {
  key: string;
  label: string;
  icon: string;
  path?: string;
  isLogout?: boolean;
};

function isMenuItemActive(currentPath: string, itemPath?: string) {
  if (!itemPath) return false;

  if (itemPath === "/gestao") {
    return currentPath === "/gestao";
  }

  return currentPath === itemPath || currentPath.startsWith(itemPath + "/");
}

export default function GestaoShell({ title, children }: GestaoShellProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = useMemo<MenuItem[]>(
    () => [
      { key: "dashboard", label: "Dashboard", icon: dashboardIcon, path: "/gestao" },
      {
        key: "professores",
        label: "Professores",
        icon: bookOpenIcon,
        path: "/gestao/professores",
      },
      {
        key: "alunos",
        label: "Alunos",
        icon: userGroupIcon,
        path: "/gestao/alunos",
      },
      {
        key: "clientes",
        label: "Clientes",
        icon: userCircleIcon,
        path: "/gestao/clientes",
      },
      {
        key: "turmas",
        label: "Turmas",
        icon: studentIcon,
        path: "/gestao/turmas",
      },
      {
        key: "contratos",
        label: "Contratos",
        icon: fileAltIcon,
        path: "/gestao/contratos",
      },
      {
        key: "presencas",
        label: "Presenças",
        icon: calendarIcon,
        path: "/gestao/presencas",
      },
      {
        key: "relatorios",
        label: "Relatórios",
        icon: graphIcon,
        path: "/gestao/relatorios",
      },
      {
        key: "configuracoes",
        label: "Configurações",
        icon: settingsIcon,
        path: "/gestao/configuracoes",
      },
    ],
    []
  );

  const bottomItems = useMemo<MenuItem[]>(
    () => [{ key: "sair", label: "Sair", icon: exitIcon, isLogout: true }],
    []
  );

  function handleNavigate(item: MenuItem) {
    if (item.isLogout) {
      clearToken();
      navigate("/", { replace: true });
      return;
    }

    if (item.path) {
      navigate(item.path);
      setMobileOpen(false);
    }
  }

  return (
    <div className="gestao-shell">
      <aside
        className={[
          "gestao-shell__sidebar",
          collapsed ? "is-collapsed" : "",
          mobileOpen ? "is-mobile-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="gestao-shell__brand">
          <div className="gestao-shell__brand-badge">
            <img src={dashboardIcon} alt="Gestio" />
          </div>

          {!collapsed && (
            <div className="gestao-shell__brand-text">
              <strong>Gestio</strong>
              <span>Área do Gestor</span>
            </div>
          )}
        </div>

        <nav className="gestao-shell__menu">
          {menuItems.map((item) => {
            const isActive = isMenuItemActive(location.pathname, item.path);

            return (
              <button
                key={item.key}
                type="button"
                className={`gestao-shell__menu-item ${isActive ? "is-active" : ""}`}
                onClick={() => handleNavigate(item)}
                title={collapsed ? item.label : undefined}
              >
                <img src={item.icon} alt="" aria-hidden="true" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="gestao-shell__bottom">
          {bottomItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className="gestao-shell__menu-item gestao-shell__menu-item--danger"
              onClick={() => handleNavigate(item)}
              title={collapsed ? item.label : undefined}
            >
              <img src={item.icon} alt="" aria-hidden="true" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </div>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="gestao-shell__overlay"
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
        />
      )}

      <div className="gestao-shell__main">
        <header className="gestao-shell__header">
          <div className="gestao-shell__header-left">
            <button
              type="button"
              className="gestao-shell__icon-button gestao-shell__icon-button--mobile"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="Abrir menu"
            >
              <img src={barsIcon} alt="" aria-hidden="true" />
            </button>

            <button
              type="button"
              className="gestao-shell__icon-button gestao-shell__icon-button--desktop"
              onClick={() => setCollapsed((prev) => !prev)}
              aria-label="Recolher menu"
            >
              <img src={barsIcon} alt="" aria-hidden="true" />
            </button>

            <h1>{title}</h1>
          </div>
        </header>

        <main className="gestao-shell__content">{children}</main>
      </div>
    </div>
  );
}
