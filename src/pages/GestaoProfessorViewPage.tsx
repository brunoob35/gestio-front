import { useParams } from "react-router-dom";
import GestaoShell from "../components/gestao/GestaoShell";

export default function GestaoProfessorViewPage() {
  const { professorID } = useParams();

  return (
    <GestaoShell title="Professor">
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 24,
          padding: 24,
        }}
      >
        <h2 style={{ marginBottom: 8 }}>Visão do Professor</h2>
        <p>Professor selecionado: {professorID}</p>
        <p style={{ marginTop: 12, color: "#667085" }}>
          Aqui você poderá montar a experiência de navegação como se estivesse logado
          como este professor.
        </p>
      </div>
    </GestaoShell>
  );
}