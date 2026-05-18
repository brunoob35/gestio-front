import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { clearToken } from "../../services/auth";

import barsIcon from "../../assets/icons/bars-svgrepo-com.svg";
import dashboardIcon from "../../assets/icons/dashboard-svgrepo-com.svg";
import bookOpenIcon from "../../assets/icons/book-open-svgrepo-com.svg";
import usersIcon from "../../assets/icons/user-group-svgrepo-com.svg";
import studentIcon from "../../assets/icons/student-svgrepo-com.svg";
import settingsIcon from "../../assets/icons/setting-5-svgrepo-com.svg";
import exitIcon from "../../assets/icons/exit-svgrepo-com.svg";

import "./ProfessorShell.css";

type ProfessorShellProps = {
  title: string;
  children: React.ReactNode;
};

type MenuItem = {
  key: string;
  label: string;
  icon: string;
  path?: string;
  isLogout?: boolean;
  disabled?: boolean;
};

function isMenuItemActive(currentPath: string, itemPath?: string) {
  if (!itemPath) return false;
  if (itemPath === "/professor") {
    return currentPath === itemPath;
  }
  return currentPath === itemPath || currentPath.startsWith(itemPath + "/");
}

export default function ProfessorShell({ title, children }: ProfessorShellProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = useMemo<MenuItem[]>(
    () => [
      { key: "agenda", label: "Agenda", icon: dashboardIcon, path: "/professor" },
      {
        key: "aulas",
        label: "Minhas Aulas",
        icon: bookOpenIcon,
        path: "/professor/aulas",
      },
      {
        key: "turmas",
        label: "Minhas Turmas",
        icon: usersIcon,
        path: "/professor/turmas",
      },
      {
        key: "alunos",
        label: "Alunos",
        icon: studentIcon,
        path: "/professor/alunos",
      },
      {
        key: "configuracoes",
        label: "Configurações",
        icon: settingsIcon,
        path: "/professor/configuracoes",
      },
    ],
    []
  );

  const bottomItems = useMemo<MenuItem[]>(
    () => [{ key: "sair", label: "Sair", icon: exitIcon, isLogout: true }],
    []
  );

  function handleNavigate(item: MenuItem) {
    if (item.disabled) return;

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
    <div className="professor-shell">
      <aside
        className={[
          "professor-shell__sidebar",
          collapsed ? "is-collapsed" : "",
          mobileOpen ? "is-mobile-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="professor-shell__brand">
          <div className="professor-shell__brand-badge">
            <img src={dashboardIcon} alt="Gestio" />
          </div>

          {!collapsed ? (
            <div className="professor-shell__brand-text">
              <strong>Gestio</strong>
              <span>Área do Professor</span>
            </div>
          ) : null}
        </div>

        <nav className="professor-shell__menu">
          {menuItems.map((item) => {
            const isActive = isMenuItemActive(location.pathname, item.path);

            return (
              <button
                key={item.key}
                type="button"
                className={`professor-shell__menu-item ${isActive ? "is-active" : ""} ${item.disabled ? "is-disabled" : ""}`}
                onClick={() => handleNavigate(item)}
                title={collapsed ? item.label : undefined}
                disabled={item.disabled}
                aria-disabled={item.disabled}
              >
                <img src={item.icon} alt="" aria-hidden="true" />
                {!collapsed ? <span>{item.label}</span> : null}
              </button>
            );
          })}
        </nav>

        <div className="professor-shell__bottom">
          {bottomItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className="professor-shell__menu-item professor-shell__menu-item--danger"
              onClick={() => handleNavigate(item)}
              title={collapsed ? item.label : undefined}
            >
              <img src={item.icon} alt="" aria-hidden="true" />
              {!collapsed ? <span>{item.label}</span> : null}
            </button>
          ))}
        </div>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className="professor-shell__overlay"
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
        />
      ) : null}

      <div className="professor-shell__main">
        <header className="professor-shell__header">
          <div className="professor-shell__header-left">
            <button
              type="button"
              className="professor-shell__icon-button professor-shell__icon-button--mobile"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="Abrir menu"
            >
              <img src={barsIcon} alt="" aria-hidden="true" />
            </button>

            <button
              type="button"
              className="professor-shell__icon-button professor-shell__icon-button--desktop"
              onClick={() => setCollapsed((prev) => !prev)}
              aria-label="Recolher menu"
            >
              <img src={barsIcon} alt="" aria-hidden="true" />
            </button>

            <h1>{title}</h1>
          </div>
        </header>

        <main className="professor-shell__content">{children}</main>
      </div>
    </div>
  );
}
