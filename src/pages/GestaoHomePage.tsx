import ActivityPanel from "../components/gestao/ActivityPanel";
import AlertCard from "../components/gestao/AlertCard";
import GestaoShell from "../components/gestao/GestaoShell";
import PanelPlaceholder from "../components/gestao/PanelPlaceholder";
import StatCard from "../components/gestao/StatCard";

import dashboardIcon from "../assets/icons/dashboard-svgrepo-com.svg";
import fileAltIcon from "../assets/icons/file-alt-svgrepo-com.svg";
import userGroupIcon from "../assets/icons/user-group-svgrepo-com.svg";
import studentIcon from "../assets/icons/student-svgrepo-com.svg";
import warningIcon from "../assets/icons/warning-circle-svgrepo-com.svg";

import "./GestaoHomePage.css";

export default function GestaoHomePage() {
  return (
    <GestaoShell title="Dashboard">
      <section className="gestao-home">
        <div className="gestao-home__stats">
          <StatCard
            title="Contratos Ativos"
            value="248"
            detail="+12% vs mês anterior"
            icon={fileAltIcon}
            positive
          />

          <StatCard
            title="Matrículas"
            value="432"
            detail="+8% vs mês anterior"
            icon={userGroupIcon}
            positive
          />

          <StatCard
            title="Turmas em Andamento"
            value="28"
            detail="6 turmas novas este mês"
            icon={studentIcon}
          />

          <StatCard
            title="Taxa de Presença"
            value="87%"
            detail="+3% vs semana anterior"
            icon={dashboardIcon}
            positive
          />
        </div>

        <div className="gestao-home__content">
          <div className="gestao-home__main">
            <div className="gestao-home__alerts">
              <AlertCard
                icon={warningIcon}
                text="5 contratos vencem nos próximos 7 dias"
                tag="Ação necessária"
              />

              <AlertCard
                icon={warningIcon}
                text="3 turmas aguardando confirmação de horário"
                tag="Pendente"
              />
            </div>

            <div className="gestao-home__panels">
              <PanelPlaceholder title="Geração de Contratos" minHeight={320} />
              <PanelPlaceholder title="Frequência de Presença" minHeight={320} />
            </div>
          </div>

          <aside className="gestao-home__side">
            <ActivityPanel
              title="Atividades Recentes"
              items={[
                {
                  title: "Nova matrícula: João Silva",
                  time: "2 horas atrás",
                },
                {
                  title: "Contrato renovado: Maria Santos",
                  time: "4 horas atrás",
                },
                {
                  title: "Turma criada: Matemática Avançada",
                  time: "6 horas atrás",
                },
                {
                  title: "Contrato vencendo em 7 dias: Pedro Costa",
                  time: "1 dia atrás",
                },
              ]}
            />
          </aside>
        </div>
      </section>
    </GestaoShell>
  );
}