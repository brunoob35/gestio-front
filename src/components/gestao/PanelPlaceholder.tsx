import "./PanelPlaceholder.css";

type PanelPlaceholderProps = {
  title: string;
  minHeight?: number;
};

export default function PanelPlaceholder({
  title,
  minHeight = 280,
}: PanelPlaceholderProps) {
  return (
    <section className="panel-placeholder" style={{ minHeight }}>
      <h2>{title}</h2>
      <div className="panel-placeholder__body">
        <span>Espaço reservado para gráfico/dashboard</span>
      </div>
    </section>
  );
}